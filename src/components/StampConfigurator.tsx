import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Save, Move, Stamp } from 'lucide-react';

export interface StampConfig {
  positionX: number; // percentage 0-100
  positionY: number; // percentage 0-100
  size: number;      // percentage 10-150
  opacity: number;   // percentage 0-100
}

interface StampConfiguratorProps {
  stampUrl: string;
  config: StampConfig;
  onChange: (config: StampConfig) => void;
  onSave: (config: StampConfig) => void;
  saving?: boolean;
}

const PRESETS: { label: string; x: number; y: number }[] = [
  { label: 'Top Left', x: 10, y: 10 },
  { label: 'Top Right', x: 85, y: 10 },
  { label: 'Center', x: 45, y: 45 },
  { label: 'Bottom Left', x: 10, y: 80 },
  { label: 'Bottom Right', x: 75, y: 80 },
  { label: 'Near Signatures', x: 70, y: 72 },
];

const SIZE_PRESETS = [
  { label: 'Small', value: 40 },
  { label: 'Medium', value: 60 },
  { label: 'Large', value: 90 },
];

const StampConfigurator = ({ stampUrl, config, onChange, onSave, saving }: StampConfiguratorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const handlePreset = (x: number, y: number) => {
    onChange({ ...config, positionX: x, positionY: y });
  };

  const handleReset = () => {
    onChange({ positionX: 75, positionY: 80, size: 60, opacity: 70 });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onChange({ ...config, positionX: Math.round(x), positionY: Math.round(y) });
  }, [dragging, config, onChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    onChange({ ...config, positionX: Math.round(x), positionY: Math.round(y) });
  }, [dragging, config, onChange]);

  useEffect(() => {
    const handleGlobalUp = () => setDragging(false);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Stamp className="w-4 h-4" />
          Stamp Position & Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag area - simulated report card */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Move className="w-3 h-3" /> Drag the stamp to position it
          </Label>
          <div
            ref={containerRef}
            className="relative w-full bg-white border-2 border-dashed border-muted-foreground/30 rounded-md overflow-hidden select-none"
            style={{ aspectRatio: '210 / 297', maxHeight: '360px' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Simulated report card layout hints */}
            <div className="absolute top-2 left-2 right-2 h-8 bg-muted/30 rounded flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground font-medium">SCHOOL HEADER</span>
            </div>
            <div className="absolute top-12 left-2 right-2 h-4 bg-muted/20 rounded flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">Student Info</span>
            </div>
            <div className="absolute top-18 left-2 right-2 bottom-28 bg-muted/10 rounded flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">Performance Table</span>
            </div>
            <div className="absolute bottom-16 left-2 right-2 h-12 bg-muted/20 rounded flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">Comments & Signatures</span>
            </div>
            <div className="absolute bottom-2 left-2 right-2 h-10 bg-muted/15 rounded flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">Footer</span>
            </div>

            {/* Draggable stamp */}
            <img
              src={stampUrl}
              alt="School Stamp"
              className="absolute cursor-grab active:cursor-grabbing"
              style={{
                left: `${config.positionX}%`,
                top: `${config.positionY}%`,
                transform: 'translate(-50%, -50%)',
                width: `${config.size}px`,
                height: 'auto',
                opacity: config.opacity / 100,
                pointerEvents: 'auto',
                zIndex: 10,
              }}
              draggable={false}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            />
          </div>
        </div>

        {/* Preset positions */}
        <div>
          <Label className="text-xs mb-1.5 block">Quick Position Presets</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handlePreset(p.x, p.y)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Size control */}
        <div>
          <Label className="text-xs mb-1.5 flex justify-between">
            <span>Stamp Size</span>
            <span className="text-muted-foreground">{config.size}px</span>
          </Label>
          <div className="flex gap-1.5 mb-2">
            {SIZE_PRESETS.map((s) => (
              <Button
                key={s.label}
                variant={config.size === s.value ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => onChange({ ...config, size: s.value })}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <Slider
            value={[config.size]}
            onValueChange={([v]) => onChange({ ...config, size: v })}
            min={20}
            max={150}
            step={1}
          />
        </div>

        {/* Opacity control */}
        <div>
          <Label className="text-xs mb-1.5 flex justify-between">
            <span>Stamp Opacity</span>
            <span className="text-muted-foreground">{config.opacity}%</span>
          </Label>
          <div className="flex gap-1.5 mb-2">
            {[
              { label: '100%', value: 100 },
              { label: '80%', value: 80 },
              { label: '60%', value: 60 },
              { label: '40%', value: 40 },
            ].map((o) => (
              <Button
                key={o.label}
                variant={config.opacity === o.value ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => onChange({ ...config, opacity: o.value })}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <Slider
            value={[config.opacity]}
            onValueChange={([v]) => onChange({ ...config, opacity: v })}
            min={10}
            max={100}
            step={5}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
          <Button size="sm" onClick={() => onSave(config)} disabled={saving} className="gap-1.5 flex-1">
            <Save className="w-3 h-3" />
            {saving ? 'Saving...' : 'Save Position for All Reports'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StampConfigurator;
