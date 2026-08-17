import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Move, RotateCcw, Save } from 'lucide-react';
import type { OverlayConfig } from '@/utils/reportOverlays';

interface OverlayPositionerProps {
  imageUrl: string | null;
  config: OverlayConfig;
  defaults: OverlayConfig;
  onChange: (config: OverlayConfig) => void;
  onSave: () => void;
  saving?: boolean;
  allowRotation?: boolean;
  maxSize?: number;
  label: string;
  /** Live report-card preview rendered underneath the draggable overlay. */
  children: ReactNode;
}

const PRESETS = [
  { label: 'Top Left', x: 15, y: 12 },
  { label: 'Top Right', x: 85, y: 12 },
  { label: 'Center', x: 50, y: 50 },
  { label: 'Bottom Left', x: 15, y: 85 },
  { label: 'Bottom Right', x: 80, y: 85 },
  { label: 'Near Signatures', x: 70, y: 72 },
];

const OverlayPositioner = ({
  imageUrl,
  config,
  defaults,
  onChange,
  onSave,
  saving,
  allowRotation,
  maxSize = 400,
  label,
  children,
}: OverlayPositionerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const moveTo = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      onChange({ ...config, positionX: Math.round(x), positionY: Math.round(y) });
    },
    [config, onChange],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => moveTo(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) moveTo(t.clientX, t.clientY);
    };
    const stop = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };
  }, [dragging, moveTo]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Move className="w-3 h-3" /> Drag the {label.toLowerCase()} onto the live report card preview
        </Label>
        <div ref={containerRef} className="relative border rounded-lg overflow-hidden bg-white select-none">
          {children}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={label}
              draggable={false}
              className="absolute cursor-grab active:cursor-grabbing"
              style={{
                left: `${config.positionX}%`,
                top: `${config.positionY}%`,
                width: `${config.size}px`,
                height: 'auto',
                opacity: config.opacity / 100,
                transform: `translate(-50%, -50%) rotate(${config.rotation ?? 0}deg)`,
                zIndex: 20,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onTouchStart={() => setDragging(true)}
            />
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <Label className="text-xs mb-1.5 block">Quick positions</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => onChange({ ...config, positionX: p.x, positionY: p.y })}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1.5 flex justify-between">
            <span>Size</span>
            <span className="text-muted-foreground">{config.size}px</span>
          </Label>
          <Slider value={[config.size]} onValueChange={([v]) => onChange({ ...config, size: v })} min={20} max={maxSize} step={1} />
        </div>

        <div>
          <Label className="text-xs mb-1.5 flex justify-between">
            <span>Opacity</span>
            <span className="text-muted-foreground">{config.opacity}%</span>
          </Label>
          <Slider value={[config.opacity]} onValueChange={([v]) => onChange({ ...config, opacity: v })} min={2} max={100} step={1} />
        </div>

        {allowRotation && (
          <div>
            <Label className="text-xs mb-1.5 flex justify-between">
              <span>Rotation</span>
              <span className="text-muted-foreground">{config.rotation ?? 0}°</span>
            </Label>
            <Slider
              value={[config.rotation ?? 0]}
              onValueChange={([v]) => onChange({ ...config, rotation: v })}
              min={-90}
              max={90}
              step={1}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs mb-1.5 block">Horizontal {config.positionX}%</Label>
            <Slider value={[config.positionX]} onValueChange={([v]) => onChange({ ...config, positionX: v })} min={0} max={100} step={1} />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Vertical {config.positionY}%</Label>
            <Slider value={[config.positionY]} onValueChange={([v]) => onChange({ ...config, positionY: v })} min={0} max={100} step={1} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onChange({ ...defaults })} className="gap-1.5">
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5 flex-1">
            <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save for all report cards'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OverlayPositioner;