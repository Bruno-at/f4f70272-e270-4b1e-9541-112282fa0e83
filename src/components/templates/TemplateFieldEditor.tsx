import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Loader2, MapPin, Plus, Save, Trash2, X } from 'lucide-react';
import { EXTRA_FIELD_TYPES, IMAGE_FIELDS, SYSTEM_FIELDS, type TemplateField } from '@/utils/templateFields';
import { renderTemplateBackground, type TemplateBackground } from '@/utils/templateBackground';

interface Props {
  backgroundUrl: string;
  mimeType: string;
  fields: TemplateField[];
  saving?: boolean;
  onSave: (fields: TemplateField[]) => void;
}

type Draft = Pick<TemplateField, 'label' | 'dataType' | 'scope' | 'description' | 'defaultValue'>;
const EMPTY_DRAFT: Draft = { label: '', dataType: 'text', scope: 'student', description: '', defaultValue: '' };
const NEW_CUSTOM = '__new_custom__';

/** Sensible starting box size for a field placed by clicking on the template. */
const defaultSize = (systemField: string | null, dataType?: string) => {
  if (systemField === 'marks_table') return { w: 0.9, h: 0.35 };
  if (systemField && IMAGE_FIELDS.has(systemField)) return { w: 0.12, h: 0.08 };
  if (systemField?.endsWith('_comment') || dataType === 'multiline') return { w: 0.4, h: 0.05 };
  return { w: 0.25, h: 0.022 };
};

const pct = (v: number) => Math.round(v * 1000) / 10;

const TemplateFieldEditor = ({ backgroundUrl, mimeType, fields, saving, onSave }: Props) => {
  const [items, setItems] = useState<TemplateField[]>(fields);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [placing, setPlacing] = useState<string | null>(null);
  const [clickPoint, setClickPoint] = useState<{ x: number; y: number } | null>(null);
  const [bg, setBg] = useState<TemplateBackground | null>(null);
  const [bgError, setBgError] = useState('');
  const [areaWidth, setAreaWidth] = useState(600);
  const [customDialog, setCustomDialog] = useState<{ key: string | null; draft: Draft; point?: { x: number; y: number } } | null>(null);
  const [removeKey, setRemoveKey] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => setItems(fields), [fields]);

  useEffect(() => {
    let cancelled = false;
    setBg(null); setBgError('');
    renderTemplateBackground(backgroundUrl, mimeType)
      .then(r => { if (!cancelled) setBg(r); })
      .catch(e => { if (!cancelled) setBgError(e?.message || 'Could not show the template'); });
    return () => { cancelled = true; };
  }, [backgroundUrl, mimeType]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setAreaWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [bg]);

  const byKey = (key: string | null) => items.find(f => f.key === key) || null;
  const selected = byKey(selectedKey);
  const customFields = items.filter(f => !f.systemField);
  const mappedSystem = useMemo(() => new Map(items.filter(f => f.systemField).map(f => [f.systemField as string, f])), [items]);

  const update = (key: string, patch: Partial<TemplateField>) =>
    setItems(prev => prev.map(f => (f.key === key ? { ...f, ...patch } : f)));

  const placeAt = (field: TemplateField, point: { x: number; y: number }) => {
    const x = Math.min(point.x, 1 - field.w);
    const y = Math.min(point.y, 1 - field.h);
    return { ...field, x: Math.max(0, x), y: Math.max(0, y) };
  };

  const assignSystem = (systemField: string, point: { x: number; y: number }) => {
    const existing = mappedSystem.get(systemField);
    if (existing) {
      update(existing.key, placeAt(existing, point));
      setSelectedKey(existing.key);
      return;
    }
    const label = SYSTEM_FIELDS.find(s => s.key === systemField)?.label || systemField;
    const field = placeAt({ key: systemField, label, systemField, x: 0, y: 0, align: 'left', ...defaultSize(systemField) }, point);
    setItems(prev => [...prev, field]);
    setSelectedKey(field.key);
  };

  const onAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = areaRef.current?.getBoundingClientRect();
    if (!box) return;
    const point = { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height };
    if (placing) {
      const field = byKey(placing);
      if (field) update(field.key, placeAt(field, point));
      setSelectedKey(placing);
      setPlacing(null);
      return;
    }
    setClickPoint(point);
  };

  const chooseForPoint = (value: string) => {
    const point = clickPoint;
    setClickPoint(null);
    if (!point) return;
    if (value === NEW_CUSTOM) { setCustomDialog({ key: null, draft: { ...EMPTY_DRAFT }, point }); return; }
    if (value.startsWith('custom:')) {
      const field = byKey(value.slice(7));
      if (field) { update(field.key, placeAt(field, point)); setSelectedKey(field.key); }
      return;
    }
    assignSystem(value, point);
  };

  const saveCustom = () => {
    if (!customDialog) return;
    const { key, draft, point } = customDialog;
    const label = draft.label?.trim();
    if (!label) return;
    if (key) {
      update(key, { ...draft, label });
      setCustomDialog(null);
      return;
    }
    const newKey = `custom_${crypto.randomUUID().replace(/-/g, '_')}`;
    const base: TemplateField = { key: newKey, label, systemField: null, x: 0.1, y: 0.1, align: 'left', ...draft, ...defaultSize(null, draft.dataType) };
    setItems(prev => [...prev, point ? placeAt(base, point) : base]);
    setSelectedKey(newKey);
    // Without a clicked point, the next click on the template places the new field.
    if (!point) setPlacing(newKey);
    setCustomDialog(null);
  };

  const confirmRemove = () => {
    if (!removeKey) return;
    setItems(prev => prev.filter(f => f.key !== removeKey));
    if (selectedKey === removeKey) setSelectedKey(null);
    if (placing === removeKey) setPlacing(null);
    setRemoveKey(null);
  };

  const startPlacingSystem = (systemField: string) => {
    const existing = mappedSystem.get(systemField);
    if (existing) { setSelectedKey(existing.key); setPlacing(existing.key); return; }
    const label = SYSTEM_FIELDS.find(s => s.key === systemField)?.label || systemField;
    const field: TemplateField = { key: systemField, label, systemField, x: 0.05, y: 0.05, align: 'left', ...defaultSize(systemField) };
    setItems(prev => [...prev, field]);
    setSelectedKey(field.key);
    setPlacing(field.key);
  };

  const nudge = (dx: number, dy: number) => {
    if (!selected) return;
    update(selected.key, {
      x: Math.min(Math.max(selected.x + dx, 0), 1 - selected.w),
      y: Math.min(Math.max(selected.y + dy, 0), 1 - selected.h),
    });
  };

  const setPercent = (key: 'x' | 'y' | 'w' | 'h', raw: string) => {
    if (!selected) return;
    const v = Math.max(0, Math.min(100, Number(raw) || 0)) / 100;
    const patch: Partial<TemplateField> = { [key]: v };
    if (key === 'x') patch.x = Math.min(v, 1 - selected.w);
    if (key === 'y') patch.y = Math.min(v, 1 - selected.h);
    if (key === 'w') patch.w = Math.max(0.02, Math.min(v, 1 - selected.x));
    if (key === 'h') patch.h = Math.max(0.01, Math.min(v, 1 - selected.y));
    update(selected.key, patch);
  };

  /** On-screen text size matching the printed size (points scaled to the preview width). */
  const previewFont = (f: TemplateField) => {
    const pageW = bg?.widthPt || 595.28;
    const pageH = pageW / (bg?.aspect || 210 / 297);
    const pt = f.fontSize || Math.min(10, Math.max(6, f.h * pageH * 0.55));
    return Math.max(6, (pt * areaWidth) / pageW);
  };

  const placingField = byKey(placing);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:h-[calc(92vh-7rem)]">
      <div className="lg:h-full lg:overflow-y-auto lg:pr-2 overscroll-contain space-y-2">
        <p className="text-sm text-muted-foreground">
          {placingField
            ? <>Click on the report card where <strong className="text-foreground">{placingField.label}</strong> should start. <button type="button" className="underline" onClick={() => setPlacing(null)}>Cancel</button></>
            : 'Click anywhere on the report card to put a field there. Your original template is never changed.'}
        </p>
        {bgError ? (
          <p role="alert" className="text-sm text-destructive p-6 border rounded-md">{bgError}</p>
        ) : !bg ? (
          <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground border rounded-md"><Loader2 className="w-5 h-5 animate-spin" /> Loading your template…</div>
        ) : (
          <div
            ref={areaRef}
            onClick={onAreaClick}
            className={`relative w-full overflow-hidden border rounded-md bg-background select-none ${placing ? 'cursor-crosshair' : 'cursor-pointer'}`}
            style={{ aspectRatio: String(bg.aspect) }}
          >
            <img src={bg.src} alt="Your uploaded report card template" className="absolute inset-0 w-full h-full pointer-events-none" draggable={false} />
            {items.map(f => {
              const isSel = f.key === selectedKey;
              const isImage = !!f.systemField && IMAGE_FIELDS.has(f.systemField);
              return (
                <div
                  key={f.key}
                  onClick={e => { e.stopPropagation(); if (placing) { onAreaClick(e as any); return; } setSelectedKey(f.key); setClickPoint(null); }}
                  className={`absolute overflow-hidden leading-tight ${isSel ? 'outline outline-1 outline-dashed outline-primary bg-primary/5' : ''}`}
                  style={{
                    left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%`,
                    fontSize: `${previewFont(f)}px`, textAlign: f.align || 'left',
                  }}
                  title={f.label}
                >
                  <span className={`${isImage || f.systemField === 'marks_table' ? 'italic' : ''} text-primary font-medium`}>
                    {f.systemField === 'marks_table' ? '[Subject marks table]' : isImage ? `[${f.label}]` : `{${f.label}}`}
                  </span>
                </div>
              );
            })}
            {clickPoint && (
              <div
                className="absolute z-10 w-64 rounded-md border bg-popover p-2 shadow-md space-y-2"
                style={{ left: `min(${clickPoint.x * 100}%, calc(100% - 16.5rem))`, top: `min(${clickPoint.y * 100}%, calc(100% - 6rem))` }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">What goes here?</span>
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6" aria-label="Close" onClick={() => setClickPoint(null)}><X className="w-3 h-3" /></Button>
                </div>
                <Select onValueChange={chooseForPoint}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Choose a field" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={NEW_CUSTOM}>+ New custom field…</SelectItem>
                    {customFields.map(f => <SelectItem key={f.key} value={`custom:${f.key}`}>{f.label} (custom)</SelectItem>)}
                    {SYSTEM_FIELDS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}{mappedSystem.has(s.key) ? ' · move here' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 lg:h-full lg:overflow-y-auto lg:pr-2 overscroll-contain">
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={saving} onClick={() => onSave(items)}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save mapping
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCustomDialog({ key: null, draft: { ...EMPTY_DRAFT } })}>
            <Plus className="w-4 h-4 mr-1" /> Add Custom Field
          </Button>
        </div>

        {selected && (
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm truncate">{selected.label}</p>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => setPlacing(selected.key)}><Crosshair className="w-3 h-3 mr-1" /> Move</Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${selected.label}`} onClick={() => setRemoveKey(selected.key)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['x', 'y', 'w', 'h'] as const).map(k => (
                <div key={k}>
                  <Label className="text-xs text-muted-foreground">{{ x: 'Left %', y: 'Top %', w: 'Width %', h: 'Height %' }[k]}</Label>
                  <Input type="number" step="0.1" className="h-8 px-2" value={pct(selected[k])} onChange={e => setPercent(k, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">Nudge</span>
              <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Move left" onClick={() => nudge(-0.002, 0)}><ArrowLeft className="w-3 h-3" /></Button>
              <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Move up" onClick={() => nudge(0, -0.002)}><ArrowUp className="w-3 h-3" /></Button>
              <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Move down" onClick={() => nudge(0, 0.002)}><ArrowDown className="w-3 h-3" /></Button>
              <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Move right" onClick={() => nudge(0.002, 0)}><ArrowRight className="w-3 h-3" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Alignment</Label>
                <Select value={selected.align || 'left'} onValueChange={v => update(selected.key, { align: v as TemplateField['align'] })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Text size (pt)</Label>
                <Input type="number" min={4} max={24} className="h-8" value={selected.fontSize ?? ''} placeholder="auto"
                  onChange={e => update(selected.key, { fontSize: e.target.value ? Math.max(4, Math.min(24, Number(e.target.value))) : undefined })} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="mask-sample" className="text-xs text-muted-foreground">Hide sample text printed under this field</Label>
              <Switch id="mask-sample" checked={selected.mask !== false} onCheckedChange={v => update(selected.key, { mask: v })} />
            </div>
            {!selected.systemField && (
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setCustomDialog({ key: selected.key, draft: { label: selected.label, dataType: selected.dataType || 'text', scope: selected.scope || 'student', description: selected.description || '', defaultValue: selected.defaultValue || '' } })}>
                Edit custom field settings
              </Button>
            )}
          </div>
        )}

        <Tabs defaultValue="system">
          <TabsList className="w-full">
            <TabsTrigger value="system" className="flex-1">System fields ({mappedSystem.size}/{SYSTEM_FIELDS.length})</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">Custom ({customFields.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="system" className="space-y-1">
            {SYSTEM_FIELDS.map(s => {
              const mapped = mappedSystem.get(s.key);
              return (
                <div key={s.key} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${mapped && mapped.key === selectedKey ? 'border-primary' : ''}`}>
                  <button type="button" className="flex-1 text-left text-sm truncate" onClick={() => mapped && setSelectedKey(mapped.key)}>{s.label}</button>
                  <Badge variant={mapped ? 'default' : 'outline'} className="shrink-0">{mapped ? 'Mapped' : 'Not mapped'}</Badge>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Place ${s.label}`} onClick={() => startPlacingSystem(s.key)}><MapPin className="w-4 h-4" /></Button>
                  {mapped && <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove ${s.label}`} onClick={() => setRemoveKey(mapped.key)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                </div>
              );
            })}
          </TabsContent>
          <TabsContent value="custom" className="space-y-1">
            {!customFields.length && <p className="text-sm text-muted-foreground p-2">No custom fields yet. Use Add Custom Field for information your system doesn't have, such as Attendance or Conduct.</p>}
            {customFields.map(f => (
              <div key={f.key} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${f.key === selectedKey ? 'border-primary' : ''}`}>
                <button type="button" className="flex-1 text-left min-w-0" onClick={() => setSelectedKey(f.key)}>
                  <p className="text-sm truncate">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{EXTRA_FIELD_TYPES.find(t => t.value === (f.dataType || 'text'))?.label} · {f.scope === 'school' ? 'Whole school' : 'Each student'}</p>
                </button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Place ${f.label}`} onClick={() => { setSelectedKey(f.key); setPlacing(f.key); }}><MapPin className="w-4 h-4" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove ${f.label}`} onClick={() => setRemoveKey(f.key)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!customDialog} onOpenChange={o => !o && setCustomDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{customDialog?.key ? 'Edit custom field' : 'Add Custom Field'}</DialogTitle></DialogHeader>
          {customDialog && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="cf-label">Field label</Label>
                <Input id="cf-label" maxLength={80} value={customDialog.draft.label} placeholder="e.g. Attendance"
                  onChange={e => setCustomDialog({ ...customDialog, draft: { ...customDialog.draft, label: e.target.value } })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Field type</Label>
                  <Select value={customDialog.draft.dataType || 'text'} onValueChange={v => setCustomDialog({ ...customDialog, draft: { ...customDialog.draft, dataType: v as TemplateField['dataType'] } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EXTRA_FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value is entered</Label>
                  <Select value={customDialog.draft.scope || 'student'} onValueChange={v => setCustomDialog({ ...customDialog, draft: { ...customDialog.draft, scope: v as TemplateField['scope'] } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="school">Once for the whole school</SelectItem><SelectItem value="student">For each student</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="cf-default">Default value (optional)</Label>
                <Input id="cf-default" maxLength={500} value={customDialog.draft.defaultValue || ''} placeholder="Printed when no value has been entered"
                  onChange={e => setCustomDialog({ ...customDialog, draft: { ...customDialog.draft, defaultValue: e.target.value } })} />
              </div>
              <div>
                <Label htmlFor="cf-desc">Description (optional)</Label>
                <Textarea id="cf-desc" maxLength={500} rows={2} value={customDialog.draft.description || ''}
                  onChange={e => setCustomDialog({ ...customDialog, draft: { ...customDialog.draft, description: e.target.value } })} />
              </div>
              <p className="text-xs text-muted-foreground">Enter the values later under Extra Template Fields on the Templates page.</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCustomDialog(null)}>Cancel</Button>
            <Button type="button" disabled={!customDialog?.draft.label?.trim()} onClick={saveCustom}>
              {customDialog?.key ? 'Update field' : customDialog?.point ? 'Add field here' : 'Add, then click to place'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeKey} onOpenChange={o => !o && setRemoveKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {byKey(removeKey)?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer print on this template once you save. Student records, marks, saved values and other templates are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplateFieldEditor;
