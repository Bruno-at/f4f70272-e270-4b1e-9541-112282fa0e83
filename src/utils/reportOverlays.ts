import { supabase } from '@/integrations/supabase/client';
import { resolveImageDataUrl } from './photoUrl';

export interface OverlayConfig {
  positionX: number;
  positionY: number;
  size: number;
  opacity: number;
  rotation?: number;
}

export const DEFAULT_STAMP_CONFIG: OverlayConfig = { positionX: 75, positionY: 80, size: 60, opacity: 70 };
export const DEFAULT_WATERMARK_CONFIG: OverlayConfig = { positionX: 50, positionY: 50, size: 120, opacity: 15, rotation: 0 };

export interface ReportOverlays {
  stampUrl: string | null;
  stampConfig: OverlayConfig;
  watermarkUrl: string | null;
  watermarkConfig: OverlayConfig;
}

const num = (v: any, fallback: number) => (v === null || v === undefined || isNaN(Number(v)) ? fallback : Number(v));

/**
 * Load the school's stamp and watermark images (as PDF-safe data URLs) together
 * with their saved position/size/opacity/rotation settings.
 */
export async function loadReportOverlays(schoolId?: string | null): Promise<ReportOverlays> {
  const empty: ReportOverlays = {
    stampUrl: null,
    stampConfig: { ...DEFAULT_STAMP_CONFIG },
    watermarkUrl: null,
    watermarkConfig: { ...DEFAULT_WATERMARK_CONFIG },
  };

  try {
    let query = supabase
      .from('schools')
      .select(
        'stamp_url, stamp_position_x, stamp_position_y, stamp_size, stamp_opacity, watermark_url, watermark_position_x, watermark_position_y, watermark_size, watermark_opacity, watermark_rotation',
      );
    query = schoolId ? query.eq('id', schoolId) : query.limit(1);
    const { data } = await query.maybeSingle();
    if (!data) return empty;
    const s = data as any;

    const [stampUrl, watermarkUrl] = await Promise.all([
      resolveImageDataUrl(s.stamp_url, 'student-photos'),
      resolveImageDataUrl(s.watermark_url, 'student-photos'),
    ]);

    return {
      stampUrl: stampUrl?.startsWith('data:image') ? stampUrl : null,
      stampConfig: {
        positionX: num(s.stamp_position_x, DEFAULT_STAMP_CONFIG.positionX),
        positionY: num(s.stamp_position_y, DEFAULT_STAMP_CONFIG.positionY),
        size: num(s.stamp_size, DEFAULT_STAMP_CONFIG.size),
        opacity: num(s.stamp_opacity, DEFAULT_STAMP_CONFIG.opacity),
      },
      watermarkUrl: watermarkUrl?.startsWith('data:image') ? watermarkUrl : null,
      watermarkConfig: {
        positionX: num(s.watermark_position_x, DEFAULT_WATERMARK_CONFIG.positionX),
        positionY: num(s.watermark_position_y, DEFAULT_WATERMARK_CONFIG.positionY),
        size: num(s.watermark_size, DEFAULT_WATERMARK_CONFIG.size),
        opacity: num(s.watermark_opacity, DEFAULT_WATERMARK_CONFIG.opacity),
        rotation: num(s.watermark_rotation, 0),
      },
    };
  } catch (e) {
    console.error('Could not load report overlays', e);
    return empty;
  }
}

export async function saveStampConfig(schoolId: string, config: OverlayConfig) {
  const { error } = await supabase
    .from('schools')
    .update({
      stamp_position_x: config.positionX,
      stamp_position_y: config.positionY,
      stamp_size: config.size,
      stamp_opacity: config.opacity,
    } as any)
    .eq('id', schoolId);
  if (error) throw error;
}

export async function saveWatermarkConfig(schoolId: string, config: OverlayConfig, watermarkPath?: string | null) {
  const payload: Record<string, any> = {
    watermark_position_x: config.positionX,
    watermark_position_y: config.positionY,
    watermark_size: config.size,
    watermark_opacity: config.opacity,
    watermark_rotation: config.rotation ?? 0,
  };
  if (watermarkPath !== undefined) payload.watermark_url = watermarkPath;
  const { error } = await supabase.from('schools').update(payload as any).eq('id', schoolId);
  if (error) throw error;
}