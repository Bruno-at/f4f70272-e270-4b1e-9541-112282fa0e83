import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import StampConfigurator, { StampConfig } from './StampConfigurator';
import { REPORT_FONT_OPTIONS, ReportFontId, setReportFont, getReportFontCss } from '@/utils/reportFont';
import { TemplateType } from './TemplateSelector';
import { Loader2, Save, Type, Stamp, GraduationCap } from 'lucide-react';

const TEMPLATES: { id: TemplateType; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'Traditional format with a comprehensive layout.' },
  { id: 'modern', name: 'Modern', description: 'Contemporary design with clean spacing.' },
  { id: 'professional', name: 'Professional', description: 'Corporate style focused on data.' },
  { id: 'minimal', name: 'Minimal', description: 'Clean and simple layout.' },
];

const TemplateGrid = ({
  value,
  onChange,
}: {
  value: TemplateType;
  onChange: (v: TemplateType) => void;
}) => (
  <RadioGroup value={value} onValueChange={(v) => onChange(v as TemplateType)}>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {TEMPLATES.map((t) => (
        <Card
          key={t.id}
          className={`cursor-pointer transition-all ${
            value === t.id ? 'ring-2 ring-primary' : 'hover:border-primary/60'
          }`}
          onClick={() => onChange(t.id)}
        >
          <CardContent className="p-3 flex items-start gap-2">
            <RadioGroupItem value={t.id} id={`tpl-${t.id}`} className="mt-1" />
            <div>
              <Label htmlFor={`tpl-${t.id}`} className="text-sm font-semibold cursor-pointer">
                {t.name}
              </Label>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </RadioGroup>
);

const ReportCardSettings = () => {
  const { schoolId } = useSchool();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stampSaving, setStampSaving] = useState(false);

  const [reportFontId, setReportFontId] = useState<ReportFontId>('helvetica');
  const [oLevelTemplate, setOLevelTemplate] = useState<TemplateType>('classic');
  const [aLevelTemplate, setALevelTemplate] = useState<TemplateType>('classic');

  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [stampConfig, setStampConfig] = useState<StampConfig>({
    positionX: 75,
    positionY: 80,
    size: 60,
    opacity: 70,
  });

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const query = supabase.from('schools').select('*').limit(1);
      const { data } = schoolId
        ? await query.eq('id', schoolId).maybeSingle()
        : await query.maybeSingle();
      if (data) {
        const sd = data as any;
        setReportFontId((sd.report_font as ReportFontId) || 'helvetica');
        setOLevelTemplate((sd.o_level_template as TemplateType) || 'classic');
        setALevelTemplate((sd.a_level_template as TemplateType) || 'classic');
        setStampConfig({
          positionX: Number(sd.stamp_position_x ?? 75),
          positionY: Number(sd.stamp_position_y ?? 80),
          size: Number(sd.stamp_size ?? 60),
          opacity: Number(sd.stamp_opacity ?? 70),
        });
        // Resolve stamp URL for the preview
        const rawStamp: string | null = sd.stamp_url || null;
        if (rawStamp) {
          if (rawStamp.startsWith('data:image') || rawStamp.startsWith('http')) {
            setStampUrl(rawStamp);
          } else {
            const { data: signed } = await supabase.storage
              .from('student-photos')
              .createSignedUrl(rawStamp, 3600);
            setStampUrl(signed?.signedUrl || null);
          }
        }
        setReportFont(sd.report_font || 'helvetica');
      }
    } catch (e) {
      console.error('Error loading report card settings:', e);
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getSchoolRowId = async (): Promise<string | null> => {
    if (schoolId) return schoolId;
    const { data } = await supabase.from('schools').select('id').limit(1).maybeSingle();
    return (data as any)?.id || null;
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const id = await getSchoolRowId();
      if (!id) throw new Error('No school configured');
      const { error } = await supabase
        .from('schools')
        .update({
          report_font: reportFontId,
          o_level_template: oLevelTemplate,
          a_level_template: aLevelTemplate,
        } as any)
        .eq('id', id);
      if (error) throw error;
      setReportFont(reportFontId);
      toast({ title: 'Settings Saved', description: 'Report card settings updated.' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStamp = async (config: StampConfig) => {
    setStampSaving(true);
    try {
      const id = await getSchoolRowId();
      if (!id) throw new Error('No school configured');
      const { error } = await supabase
        .from('schools')
        .update({
          stamp_position_x: config.positionX,
          stamp_position_y: config.positionY,
          stamp_size: config.size,
          stamp_opacity: config.opacity,
        } as any)
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Stamp Position Saved', description: 'Applied to all report cards.' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to save stamp position', variant: 'destructive' });
    } finally {
      setStampSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings...
      </div>
    );
  }

  const previewFont = REPORT_FONT_OPTIONS.find((f) => f.id === reportFontId) || REPORT_FONT_OPTIONS[0];

  return (
    <div className="space-y-6">
      {/* Font style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="w-4 h-4" /> Report Card Font Style
          </CardTitle>
          <CardDescription>
            Choose the font used on all generated report card PDFs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={reportFontId} onValueChange={(v) => setReportFontId(v as ReportFontId)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REPORT_FONT_OPTIONS.map((f) => (
                <Card
                  key={f.id}
                  className={`cursor-pointer transition-all ${
                    reportFontId === f.id ? 'ring-2 ring-primary' : 'hover:border-primary/60'
                  }`}
                  onClick={() => setReportFontId(f.id)}
                >
                  <CardContent className="p-3 flex items-start gap-2">
                    <RadioGroupItem value={f.id} id={`font-${f.id}`} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={`font-${f.id}`} className="text-sm font-semibold cursor-pointer">
                        {f.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                      <div
                        className="mt-2 text-sm border rounded p-2 bg-muted/30"
                        style={{
                          fontFamily: f.cssFamily,
                          fontWeight: f.forceStyle === 'bold' ? 700 : 400,
                        }}
                      >
                        The quick brown fox — 1234567890
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RadioGroup>
          <div
            className="mt-2 rounded-md border p-4 bg-background text-sm"
            style={{
              fontFamily: previewFont.cssFamily,
              fontWeight: previewFont.forceStyle === 'bold' ? 700 : 400,
            }}
          >
            <div className="font-bold text-base">SAMPLE SCHOOL NAME</div>
            <div className="text-xs opacity-80">P.O. Box 1234, Kampala</div>
            <div className="mt-2">Student: Jane Doe · Class: S.2 · Term: One 2026</div>
            <div className="mt-1">Mathematics 82 (A) · English 78 (B) · Biology 85 (A)</div>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="w-4 h-4" /> Report Card Templates
          </CardTitle>
          <CardDescription>
            Select the default template used for each academic level. The system
            picks the right template automatically based on the student's class.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">O-Level (S1 – S4)</Label>
            <TemplateGrid value={oLevelTemplate} onChange={setOLevelTemplate} />
          </div>
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-semibold">A-Level (S5 – S6)</Label>
            <TemplateGrid value={aLevelTemplate} onChange={setALevelTemplate} />
          </div>
        </CardContent>
      </Card>

      {/* Save button for font + templates */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Font & Template Settings'}
        </Button>
      </div>

      {/* Stamp positioning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stamp className="w-4 h-4" /> Stamp Positioning
          </CardTitle>
          <CardDescription>
            Drag the stamp in the preview to position it exactly where you want
            it on the report card. Settings apply to all future report cards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stampUrl ? (
            <div className="max-w-md">
              <StampConfigurator
                stampUrl={stampUrl}
                config={stampConfig}
                onChange={setStampConfig}
                onSave={handleSaveStamp}
                saving={stampSaving}
              />
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center">
              No school stamp uploaded yet. Upload one from the{' '}
              <span className="font-medium">School Information</span> section to
              configure its position here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportCardSettings;
