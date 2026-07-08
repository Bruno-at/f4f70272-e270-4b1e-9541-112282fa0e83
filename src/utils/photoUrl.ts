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

export function extractStoragePath(
  pathOrUrl: string | null | undefined,
  bucket: string = 'student-photos',
): string | null {
  if (!pathOrUrl || pathOrUrl.startsWith('data:')) return null;
  if (!pathOrUrl.startsWith('http')) return pathOrUrl.replace(/^\/+/, '');

  try {
    const url = new URL(pathOrUrl);
    const marker = `/storage/v1/object/`;
    const objectIndex = url.pathname.indexOf(marker);
    if (objectIndex === -1) return null;

    const objectPath = url.pathname.slice(objectIndex + marker.length);
    const bucketIndex = objectPath.indexOf(`${bucket}/`);
    if (bucketIndex === -1) return null;

    return decodeURIComponent(objectPath.slice(bucketIndex + bucket.length + 1));
  } catch {
    return null;
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

/**
 * Resolve an image reference into a PDF-safe data URI.
 * Handles existing data URIs, private storage paths, signed/public storage URLs,
 * and legacy external URLs. Private bucket paths are downloaded with the
 * authenticated Storage API so report previews and jsPDF do not depend on CORS.
 */
export async function resolveImageDataUrl(
  pathOrUrl: string | null | undefined,
  bucket: string = 'student-photos',
): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('data:image')) return pathOrUrl;

  const storagePath = extractStoragePath(pathOrUrl, bucket);
  if (storagePath) {
    const { data, error } = await supabase.storage.from(bucket).download(storagePath);
    if (!error && data) {
      const dataUrl = await blobToDataUrl(data);
      return dataUrl.startsWith('data:image') ? dataUrl : null;
    }

    const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600);
    if (signedData?.signedUrl) {
      return resolveImageDataUrl(signedData.signedUrl, bucket);
    }
  }

  if (pathOrUrl.startsWith('http')) {
    try {
      const response = await fetch(pathOrUrl);
      if (!response.ok) return null;
      const dataUrl = await blobToDataUrl(await response.blob());
      return dataUrl.startsWith('data:image') ? dataUrl : null;
    } catch {
      return null;
    }
  }

  return null;
}