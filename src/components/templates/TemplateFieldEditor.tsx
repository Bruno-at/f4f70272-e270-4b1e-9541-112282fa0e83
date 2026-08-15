import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, Save } from 'lucide-react';
import { SYSTEM_FIELDS, TemplateField } from '@/utils/templateFields';

interface Props {
  backgroundUrl: string;
  mimeType: string;
  fields: TemplateField[];
  saving?: boolean;
  onSave: (fields: TemplateField[]) => void;
}

const NONE = '__custom__';

const TemplateFieldEditor = ({ backgroundUrl, mimeType, fields, saving, onSave }: Props) => {
  const [items, setItems] = useState<TemplateField[]>(fields);
  const [selected, setSelected] = useState<number | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ i: number; mode: 'move' | 'resize'; sx: number; sy: number; f: TemplateField } | null>(null);

  useEffect(() => setItems(fields), [fields]);

  const update = (i: number, patch: Partial<TemplateField>) =>
    setItems((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const onPointerDown = (e: React.PointerEvent, i: number, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(i);
    drag.current = { i, mode, sx: e.clientX, sy: e.clientY, f: items[i] };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const box = areaRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    const dx = (e.clientX - d.sx) / box.width;
    const dy = (e.clientY - d.sy) / box.height;
    if (d.mode === 'move') {
      update(d.i, {
        x: Math.min(Math.max(d.f.x + dx, 0), 1 - d.f.w),
        y: Math.min(Math.max(d.f.y + dy, 0), 1 - d.f.h),
      });
    } else {
      update(d.i, {
        w: Math.min(Math.max(d.f.w + dx, 0.02), 1 - d.f.x),
        h: Math.min(Math.max(d.f.h + dy, 0.01), 1 - d.f.y),
      });
    }
  };

  const addField = () => {
    setItems((prev) => [
      ...prev,
      { key: `field_${prev.length + 1}`, label: `Field ${prev.length + 1}`, systemField: null, x: 0.1, y: 0.1, w: 0.25, h: 0.03, align: 'left' },
    ]);
    setSelected(items.length);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <div
        ref={areaRef}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        className="relative w-full bg-muted rounded-md overflow-hidden border"
        style={{ aspectRatio: '210 / 297' }}
      >
        {mimeType === 'application/pdf' ? (
          <object data={`${backgroundUrl}#toolbar=0&navpanes=0`} type="application/pdf" className="absolute inset-0 w-full h-full pointer-events-none" />
        ) : (
          <img src={backgroundUrl} alt="Uploaded report card template" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        )}

        {items.map((f, i) => (
          <div
            key={i}
            onPointerDown={(e) => onPointerDown(e, i, 'move')}
            className={`absolute cursor-move rounded-sm text-[10px] leading-none flex items-center px-1 ${
              selected === i ? 'ring-2 ring-primary bg-primary/25' : 'bg-primary/10 border border-primary/50'
            }`}
            style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` }}
            title={f.label}
          >
            <span className="truncate text-primary font-medium">{f.label}</span>
            <span
              onPointerDown={(e) => onPointerDown(e, i, 'resize')}
              className="absolute -right-1 -bottom-1 w-3 h-3 bg-primary rounded-sm cursor-se-resize"
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus className="w-4 h-4 mr-1" /> Add field
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={() => onSave(items)}>
            <Save className="w-4 h-4 mr-1" /> Save layout
          </Button>
        </div>

        <ScrollArea className="h-[520px] pr-3">
          <div className="space-y-3">
            {items.map((f, i) => (
              <div
                key={i}
                className={`rounded-md border p-3 space-y-2 ${selected === i ? 'border-primary' : ''}`}
                onClick={() => setSelected(i)}
              >
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={f.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                    className="h-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data source</Label>
                  <Select
                    value={f.systemField ?? NONE}
                    onValueChange={(v) => update(i, { systemField: v === NONE ? null : v })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value={NONE}>Custom field (entered per student)</SelectItem>
                      {SYSTEM_FIELDS.map((sf) => (
                        <SelectItem key={sf.key} value={sf.key}>{sf.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Alignment</Label>
                    <Select value={f.align || 'left'} onValueChange={(v) => update(i, { align: v as any })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Font size (pt)</Label>
                    <Input
                      type="number"
                      className="h-8"
                      value={f.fontSize ?? ''}
                      placeholder="auto"
                      onChange={(e) => update(i, { fontSize: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              </div>
            ))}
            {!items.length && (
              <p className="text-sm text-muted-foreground">No fields yet. Add one and drag it onto the template.</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TemplateFieldEditor;
