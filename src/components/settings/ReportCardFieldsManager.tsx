import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { useToast } from '@/hooks/use-toast';
import {
  ENTRY_LOCATIONS, FIELD_SOURCES, FIELD_TYPES, loadReportCardFields, toFieldKey,
  type EntryLocation, type FieldSource, type FieldType, type ReportCardField,
} from '@/utils/reportCardFields';

const db = supabase as any;
const blank = { label: '', field_key: '', data_type: 'text' as FieldType, source: 'manual' as FieldSource, entry_location: 'student_registration' as EntryLocation, is_required: false, is_active: true };
const nameOf = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label || v;

const ReportCardFieldsManager = () => {
  const { schoolId } = useSchool();
  const { toast } = useToast();
  const [fields, setFields] = useState<ReportCardField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ReportCardField | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [keyTouched, setKeyTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ReportCardField | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try { setFields(await loadReportCardFields(schoolId, true)); }
    catch (e: any) { toast({ title: 'Could not load fields', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [schoolId, toast]);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(blank); setKeyTouched(false); setOpen(true); };
  const openEdit = (f: ReportCardField) => {
    setEditing(f); setKeyTouched(true);
    setForm({ label: f.label, field_key: f.field_key, data_type: f.data_type, source: f.source, entry_location: f.entry_location, is_required: f.is_required, is_active: f.is_active });
    setOpen(true);
  };

  const save = async () => {
    if (!schoolId) return;
    const label = form.label.trim();
    const key = form.field_key.trim();
    if (!label) return toast({ title: 'Label is required', variant: 'destructive' });
    if (!/^[a-z][a-z0-9_]{0,59}$/.test(key)) return toast({ title: 'Invalid field name', description: 'Use lowercase letters, numbers and underscores, starting with a letter.', variant: 'destructive' });
    if (!editing && fields.some((f) => f.field_key === key)) return toast({ title: 'Field name already used', variant: 'destructive' });
    setSaving(true);
    const payload = editing?.is_system
      ? { label, is_required: form.is_required, is_active: form.is_active }
      : editing
        ? { label, data_type: form.data_type, source: form.source, entry_location: form.entry_location, is_required: form.is_required, is_active: form.is_active }
        : { ...form, label, field_key: key, school_id: schoolId, is_system: false, sort_order: 1000 + fields.length };
    const { error } = editing
      ? await db.from('report_card_fields').update(payload).eq('id', editing.id)
      : await db.from('report_card_fields').insert(payload);
    setSaving(false);
    if (error) return toast({ title: 'Could not save field', description: error.message, variant: 'destructive' });
    toast({ title: editing ? 'Field updated' : 'Field added' });
    setOpen(false); load();
  };

  const toggleActive = async (f: ReportCardField) => {
    const { error } = await db.from('report_card_fields').update({ is_active: !f.is_active }).eq('id', f.id);
    if (error) return toast({ title: 'Could not update', description: error.message, variant: 'destructive' });
    setFields((prev) => prev.map((x) => (x.id === f.id ? { ...x, is_active: !x.is_active } : x)));
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await db.from('report_card_fields').delete().eq('id', toDelete.id);
    setToDelete(null);
    if (error) return toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
    toast({ title: 'Field deleted' }); load();
  };

  const sys = editing?.is_system;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">System fields stay linked to their records and can only be renamed or deactivated. Custom fields appear on the chosen data-entry screen.</p>
        <Button onClick={openNew} className="gap-1.5"><Plus className="w-4 h-4" /> Add field</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Label</th><th className="p-2">Field name</th><th className="p-2">Type</th>
                <th className="p-2">Source</th><th className="p-2">Entered in</th><th className="p-2">Required</th>
                <th className="p-2">Active</th><th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-2 font-medium">
                    <span className="inline-flex items-center gap-1.5">{f.label}{f.is_system ? <Badge variant="secondary" className="gap-1"><Lock className="w-3 h-3" />System</Badge> : <Badge variant="outline">Custom</Badge>}</span>
                  </td>
                  <td className="p-2 font-mono text-xs text-muted-foreground">{f.field_key}</td>
                  <td className="p-2">{nameOf(FIELD_TYPES, f.data_type)}</td>
                  <td className="p-2">{nameOf(FIELD_SOURCES, f.source)}</td>
                  <td className="p-2">{nameOf(ENTRY_LOCATIONS, f.entry_location)}</td>
                  <td className="p-2">{f.is_required ? 'Yes' : 'No'}</td>
                  <td className="p-2"><Switch checked={f.is_active} onCheckedChange={() => toggleActive(f)} aria-label={`Active: ${f.label}`} /></td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(f)} aria-label={`Edit ${f.label}`}><Pencil className="w-4 h-4" /></Button>
                    {!f.is_system && <Button size="icon" variant="ghost" onClick={() => setToDelete(f)} aria-label={`Delete ${f.label}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? (sys ? 'Edit system field' : 'Edit field') : 'Add field'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="rcf-label">Display label</Label>
              <Input id="rcf-label" value={form.label} maxLength={120} onChange={(e) => {
                const label = e.target.value;
                setForm((p) => ({ ...p, label, field_key: !editing && !keyTouched ? toFieldKey(label) : p.field_key }));
              }} />
            </div>
            <div>
              <Label htmlFor="rcf-key">Field name</Label>
              <Input id="rcf-key" value={form.field_key} disabled={!!editing} maxLength={60} className="font-mono"
                onChange={(e) => { setKeyTouched(true); setForm((p) => ({ ...p, field_key: e.target.value })); }} />
              <p className="text-xs text-muted-foreground mt-1">Used to link values to report cards. It cannot change after the field is created.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Field type</Label>
                <Select value={form.data_type} disabled={sys} onValueChange={(v) => setForm((p) => ({ ...p, data_type: v as FieldType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Information source</Label>
                <Select value={form.source} disabled={sys} onValueChange={(v) => setForm((p) => ({ ...p, source: v as FieldSource }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELD_SOURCES.filter((s) => sys || s.value !== 'calculated').map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Entered in</Label>
              <Select value={form.entry_location} disabled={sys} onValueChange={(v) => setForm((p) => ({ ...p, entry_location: v as EntryLocation }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTRY_LOCATIONS.filter((l) => sys || l.value !== 'none').map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
              {!sys && <p className="text-xs text-muted-foreground mt-1">{ENTRY_LOCATIONS.find((l) => l.value === form.entry_location)?.hint}</p>}
            </div>
            <div className="flex items-center justify-between"><Label htmlFor="rcf-req">Required</Label><Switch id="rcf-req" checked={form.is_required} onCheckedChange={(c) => setForm((p) => ({ ...p, is_required: c }))} /></div>
            <div className="flex items-center justify-between"><Label htmlFor="rcf-act">Active</Label><Switch id="rcf-act" checked={form.is_active} onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.label}”?</AlertDialogTitle>
            <AlertDialogDescription>All values entered for this field will be permanently deleted. To keep them, deactivate the field instead.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReportCardFieldsManager;
