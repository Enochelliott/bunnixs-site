import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// How long signed URLs last in seconds
const SIGNED_URL_EXPIRY = 60;

// Buckets that contain paid content
const PAID_BUCKETS = ['posts'];

/**
 * Generate a signed URL for paid content
 * Only call this AFTER verifying the user has access
 */
export async function generateSignedUrl(
  url: string,
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string> {
  try {
    // Extract bucket and path from Supabase public URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/storage/v1/object/public/');
    if (pathParts.length < 2) return url;

    const [bucket, ...pathSegments] = pathParts[1].split('/');
    const filePath = pathSegments.join('/');

    if (!PAID_BUCKETS.includes(bucket)) return url;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error || !data) {
      console.error('Signed URL error:', error);
      return url;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('generateSignedUrl error:', err);
    return url;
  }
}

/**
 * Generate signed URLs for an array of media URLs
 */
export async function generateSignedUrls(
  urls: string[],
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string[]> {
  return Promise.all(urls.map(url => generateSignedUrl(url, expiresIn)));
}

/**
 * Check if a URL is a Supabase storage URL
 */
export function isStorageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.includes('/storage/v1/object/');
  } catch {
    return false;
  }
}
