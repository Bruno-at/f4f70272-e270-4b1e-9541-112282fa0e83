import { useCallback, useEffect, useRef, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { CheckCircle2, Eye, FileUp, Loader2, LayoutTemplate, Pencil, Trash2, Sparkles } from 'lucide-react';
import TemplateFieldEditor from '@/components/templates/TemplateFieldEditor';
import CustomFieldValues from '@/components/templates/CustomFieldValues';
import { SYSTEM_FIELDS, TemplateField } from '@/utils/templateFields';
import ReportCardPreview from '@/components/ReportCardPreview';
import { useReportPreviewSample } from '@/hooks/useReportPreviewSample';
import { loadReportOverlays, DEFAULT_STAMP_CONFIG, DEFAULT_WATERMARK_CONFIG, type OverlayConfig } from '@/utils/reportOverlays';

interface TemplateRow {
  id: string;
  name: string;
  level: string;
  file_path: string;
  mime_type: string;
  fields: TemplateField[];
  is_active: boolean;
  created_at: string;
}

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';
const MAX_SIZE = 15 * 1024 * 1024;

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Templates = () => {
  const { schoolId } = useSchool();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [editingUrl, setEditingUrl] = useState('');
  const [savingFields, setSavingFields] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TemplateRow | null>(null);
  const [previewDefault, setPreviewDefault] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const { sample, loading: sampleLoading } = useReportPreviewSample();
  const [overlays, setOverlays] = useState<{
    stampUrl: string | null;
    stampConfig: OverlayConfig;
    watermarkUrl: string | null;
    watermarkConfig: OverlayConfig;
  }>({
    stampUrl: null,
    stampConfig: { ...DEFAULT_STAMP_CONFIG },
    watermarkUrl: null,
    watermarkConfig: { ...DEFAULT_WATERMARK_CONFIG },
  });

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Could not load templates', description: error.message, variant: 'destructive' });
    setTemplates(((data as any) || []).map((t: any) => ({ ...t, fields: t.fields || [] })));
    setLoading(false);
  }, [schoolId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (file: File) => {
    if (!schoolId) return;
    if (file.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Templates must be 15MB or smaller.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `${schoolId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('report-templates').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      // Ask the AI to read the template and locate every fillable field.
      const base64 = await fileToBase64(file);
      const { data: analysis, error: fnErr } = await supabase.functions.invoke('analyze-report-template', {
        body: { fileBase64: base64, mimeType: file.type, availableFields: SYSTEM_FIELDS },
      });
      if (fnErr) throw new Error(fnErr.message);
      if ((analysis as any)?.error) throw new Error((analysis as any).error);

      const fields: TemplateField[] = ((analysis as any)?.fields || []).map((f: any, i: number) => ({
        key: f.key || `field_${i + 1}`,
        label: f.label || f.key || `Field ${i + 1}`,
        systemField: f.systemField || null,
        x: Math.min(Math.max(Number(f.x) || 0, 0), 0.98),
        y: Math.min(Math.max(Number(f.y) || 0, 0), 0.98),
        w: Math.min(Math.max(Number(f.w) || 0.2, 0.02), 1),
        h: Math.min(Math.max(Number(f.h) || 0.03, 0.01), 1),
        align: f.align || 'left',
      }));

      const { data: inserted, error: insErr } = await supabase
        .from('report_templates')
        .insert({
          school_id: schoolId,
          name: file.name.replace(/\.[^.]+$/, ''),
          level: 'o-level',
          file_path: path,
          mime_type: file.type,
          page_width_mm: (analysis as any)?.pageWidthMm || 210,
          page_height_mm: (analysis as any)?.pageHeightMm || 297,
          fields: fields as any,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      await ensureCustomFields(fields);

      toast({
        title: 'Template analysed',
        description: `${fields.length} fields detected. Review and adjust the positions, then activate it.`,
      });
      await load();
      openEditor({ ...(inserted as any), fields });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message || 'Could not process the template.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  /** Any field with no system data source becomes a custom field the school can fill in. */
  const ensureCustomFields = async (fields: TemplateField[]) => {
    if (!schoolId) return;
    const custom = fields.filter((f) => !f.systemField);
    if (!custom.length) return;
    await supabase.from('template_custom_fields').upsert(
      custom.map((f) => ({ school_id: schoolId, field_key: f.key, label: f.label })),
      { onConflict: 'school_id,field_key' },
    );
  };

  const openEditor = async (t: TemplateRow) => {
    const { data } = await supabase.storage.from('report-templates').createSignedUrl(t.file_path, 3600);
    setEditingUrl(data?.signedUrl || '');
    setEditing(t);
  };

  const saveFields = async (fields: TemplateField[]) => {
    if (!editing) return;
    setSavingFields(true);
    const { error } = await supabase.from('report_templates').update({ fields: fields as any }).eq('id', editing.id);
    await ensureCustomFields(fields);
    setSavingFields(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Layout saved' });
    setEditing(null);
    load();
  };

  const activate = async (t: TemplateRow | null) => {
    if (!schoolId) return;
    await supabase.from('report_templates').update({ is_active: false }).eq('school_id', schoolId).eq('level', 'o-level');
    if (t) {
      const { error } = await supabase.from('report_templates').update({ is_active: true }).eq('id', t.id);
      if (error) {
        toast({ title: 'Could not activate', description: error.message, variant: 'destructive' });
        return;
      }
    }
    toast({ title: t ? 'Template activated' : 'Default template restored' });
    load();
  };

  const remove = async (t: TemplateRow) => {
    await supabase.storage.from('report-templates').remove([t.file_path]);
    const { error } = await supabase.from('report_templates').delete().eq('id', t.id);
    if (error) toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
    setDeleteTarget(null);
    load();
  };

  const activeTemplate = templates.find((t) => t.is_active) || null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <AppSidebar activeSection="templates" onSectionChange={() => {}} />
        <main className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">Templates</h1>
              <p className="text-sm text-muted-foreground">Use the built-in report card or upload your school's own design</p>
            </div>
            <ThemeToggle />
          </header>

          <div className="p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><LayoutTemplate className="w-5 h-5" /> Report card template</CardTitle>
                <CardDescription>
                  O-Level (S1–S4) report cards use the default template unless you upload and activate your own.
                  Uploaded templates keep their exact layout and design — the system only prints values into them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  />
                  <Button onClick={() => inputRef.current?.click()} disabled={uploading || !schoolId}>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileUp className="w-4 h-4 mr-2" />}
                    {uploading ? 'Analysing template…' : 'Upload your template'}
                  </Button>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> PDF, PNG, JPG or WEBP · fields detected automatically
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`rounded-lg border p-4 ${!activeTemplate ? 'ring-2 ring-primary' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">Default template</p>
                        <p className="text-sm text-muted-foreground">The built-in O-Level report card design.</p>
                      </div>
                      {!activeTemplate ? (
                        <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> In use</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => activate(null)}>Use this</Button>
                      )}
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
                    </div>
                  ) : (
                    templates.map((t) => (
                      <div key={t.id} className={`rounded-lg border p-4 ${t.is_active ? 'ring-2 ring-primary' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{t.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(t.fields || []).length} mapped fields · {t.mime_type.includes('pdf') ? 'PDF' : 'Image'}
                            </p>
                          </div>
                          {t.is_active && <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> In use</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {!t.is_active && <Button size="sm" variant="outline" onClick={() => activate(t)}>Use this</Button>}
                          <Button size="sm" variant="outline" onClick={() => openEditor(t)}>
                            <Pencil className="w-4 h-4 mr-1" /> Fields
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(t)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <CustomFieldValues />
          </div>
        </main>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.name} — field positions</DialogTitle>
          </DialogHeader>
          {editing && editingUrl && (
            <TemplateFieldEditor
              backgroundUrl={editingUrl}
              mimeType={editing.mime_type}
              fields={editing.fields || []}
              saving={savingFields}
              onSave={saveFields}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              Report cards will go back to the default template if this one is in use.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && remove(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default Templates;
