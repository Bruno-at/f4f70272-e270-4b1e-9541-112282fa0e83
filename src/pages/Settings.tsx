import { useCallback, useEffect, useRef, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Calendar, Droplets, Loader2, Stamp, Upload } from 'lucide-react';
import ReportCardPreview from '@/components/ReportCardPreview';
import TermsManager from '@/components/TermsManager';
import OverlayPositioner from '@/components/settings/OverlayPositioner';
import { useReportPreviewSample } from '@/hooks/useReportPreviewSample';
import {
  DEFAULT_STAMP_CONFIG,
  DEFAULT_WATERMARK_CONFIG,
  OverlayConfig,
  loadReportOverlays,
  saveStampConfig,
  saveWatermarkConfig,
} from '@/utils/reportOverlays';
import { resolveImageDataUrl } from '@/utils/photoUrl';

const SettingsPage = () => {
  const { schoolId } = useSchool();
  const { toast } = useToast();
  const { sample, loading: sampleLoading } = useReportPreviewSample();
  const stampInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [stampConfig, setStampConfig] = useState<OverlayConfig>({ ...DEFAULT_STAMP_CONFIG });
  const [watermarkConfig, setWatermarkConfig] = useState<OverlayConfig>({ ...DEFAULT_WATERMARK_CONFIG });
  const [savingStamp, setSavingStamp] = useState(false);
  const [savingWatermark, setSavingWatermark] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const overlays = await loadReportOverlays(schoolId);
    setStampUrl(overlays.stampUrl);
    setWatermarkUrl(overlays.watermarkUrl);
    setStampConfig(overlays.stampConfig);
    setWatermarkConfig(overlays.watermarkConfig);
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadImage = async (file: File, kind: 'stamp' | 'watermark') => {
    if (!schoolId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${schoolId}/${kind}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('student-photos').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;

      if (kind === 'stamp') {
        const { error: updErr } = await supabase.from('schools').update({ stamp_url: path } as any).eq('id', schoolId);
        if (updErr) throw updErr;
        setStampUrl(await resolveImageDataUrl(path, 'student-photos'));
      } else {
        await saveWatermarkConfig(schoolId, watermarkConfig, path);
        setWatermarkUrl(await resolveImageDataUrl(path, 'student-photos'));
      }
      toast({ title: `${kind === 'stamp' ? 'Stamp' : 'Watermark'} uploaded` });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (stampInputRef.current) stampInputRef.current.value = '';
      if (watermarkInputRef.current) watermarkInputRef.current.value = '';
    }
  };

  const handleSaveStamp = async () => {
    if (!schoolId) return;
    setSavingStamp(true);
    try {
      await saveStampConfig(schoolId, stampConfig);
      toast({ title: 'Stamp settings saved', description: 'Applied to every report card.' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e.message, variant: 'destructive' });
    } finally {
      setSavingStamp(false);
    }
  };

  const handleSaveWatermark = async () => {
    if (!schoolId) return;
    setSavingWatermark(true);
    try {
      await saveWatermarkConfig(schoolId, watermarkConfig);
      toast({ title: 'Watermark settings saved', description: 'Applied to every report card.' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e.message, variant: 'destructive' });
    } finally {
      setSavingWatermark(false);
    }
  };

  const preview = (opts: { withStamp?: boolean; withWatermark?: boolean }) => {
    if (sampleLoading || !sample) {
      return (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading report card preview…
        </div>
      );
    }
    return (
      <ReportCardPreview
        student={sample.student}
        term={sample.term}
        schoolInfo={sample.schoolInfo}
        marks={sample.marks}
        subjects={sample.subjects}
        reportData={sample.reportData}
        classTeacherSignature={sample.classTeacherSignature}
        headteacherSignature={sample.headteacherSignature}
        stampUrl={opts.withStamp ? stampUrl : null}
        stampConfig={opts.withStamp ? stampConfig : null}
        watermarkUrl={opts.withWatermark ? watermarkUrl : null}
        watermarkConfig={opts.withWatermark ? watermarkConfig : null}
        feesData={sample.feesData}
      />
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <AppSidebar activeSection="settings" onSectionChange={() => {}} />
        <main className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">Settings</h1>
              <p className="text-sm text-muted-foreground">Stamp, watermark and academic term settings for your school</p>
            </div>
            <ThemeToggle />
          </header>

          <div className="p-6">
            <Tabs defaultValue="stamp" className="space-y-6">
              <TabsList>
                <TabsTrigger value="stamp" className="gap-1.5"><Stamp className="w-4 h-4" /> Stamp</TabsTrigger>
                <TabsTrigger value="watermark" className="gap-1.5"><Droplets className="w-4 h-4" /> Watermark</TabsTrigger>
                <TabsTrigger value="terms" className="gap-1.5"><Calendar className="w-4 h-4" /> Terms</TabsTrigger>
              </TabsList>

              <TabsContent value="stamp">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Stamp className="w-5 h-5" /> Stamp position &amp; settings</CardTitle>
                    <CardDescription>
                      Position the school stamp on the live report card preview. The saved position is used for preview, print and PDF downloads.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={stampInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'stamp')}
                      />
                      <Button variant="outline" onClick={() => stampInputRef.current?.click()} disabled={uploading || !schoolId}>
                        <Upload className="w-4 h-4 mr-2" /> {stampUrl ? 'Replace stamp image' : 'Upload stamp image'}
                      </Button>
                      {!stampUrl && <span className="text-xs text-muted-foreground">No stamp uploaded yet.</span>}
                    </div>
                    <OverlayPositioner
                      label="Stamp"
                      imageUrl={stampUrl}
                      config={stampConfig}
                      defaults={DEFAULT_STAMP_CONFIG}
                      onChange={setStampConfig}
                      onSave={handleSaveStamp}
                      saving={savingStamp}
                      maxSize={200}
                    >
                      {preview({ withWatermark: true })}
                    </OverlayPositioner>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="watermark">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Droplets className="w-5 h-5" /> Watermark settings</CardTitle>
                    <CardDescription>
                      Upload a watermark and set its position, size, opacity and rotation against the live report card preview.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={watermarkInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'watermark')}
                      />
                      <Button variant="outline" onClick={() => watermarkInputRef.current?.click()} disabled={uploading || !schoolId}>
                        <Upload className="w-4 h-4 mr-2" /> {watermarkUrl ? 'Replace watermark' : 'Upload watermark'}
                      </Button>
                      {watermarkUrl && (
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            if (!schoolId) return;
                            await saveWatermarkConfig(schoolId, watermarkConfig, null);
                            setWatermarkUrl(null);
                            toast({ title: 'Watermark removed' });
                          }}
                        >
                          Remove watermark
                        </Button>
                      )}
                      {!watermarkUrl && <span className="text-xs text-muted-foreground">No watermark uploaded yet.</span>}
                    </div>
                    <OverlayPositioner
                      label="Watermark"
                      imageUrl={watermarkUrl}
                      config={watermarkConfig}
                      defaults={DEFAULT_WATERMARK_CONFIG}
                      onChange={setWatermarkConfig}
                      onSave={handleSaveWatermark}
                      saving={savingWatermark}
                      allowRotation
                      maxSize={500}
                    >
                      {preview({ withStamp: true })}
                    </OverlayPositioner>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="terms">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Term settings</CardTitle>
                    <CardDescription>Create and manage academic terms used on report cards.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TermsManager />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SettingsPage;