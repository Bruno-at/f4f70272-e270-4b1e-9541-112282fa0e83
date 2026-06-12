import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve a stored photo reference to a displayable URL.
 * - data: URIs and http(s) URLs (legacy long-lived signed URLs) are returned as-is.
 * - Storage paths are converted to short-lived (1h) signed URLs to avoid
 *   long-lived URLs that bypass RLS.
 */
export async function resolvePhotoUrl(
  pathOrUrl: string | null | undefined,
  bucket: string = 'student-photos',
  ttlSeconds: number = 60 * 60,
): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('http')) return pathOrUrl;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(pathOrUrl, ttlSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}