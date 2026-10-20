import { env } from "./env";

export type ImageBucket = "product-images" | "site-media";

/**
 * Public URL for a stored image. Paths that are already URLs or site files
 * ("/samples/lamp.webp") are returned as they are.
 */
export function imageUrl(
  path: string | null | undefined,
  bucket: ImageBucket = "product-images",
): string | null {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path) || path.startsWith("/")) return path;
  if (!env.supabaseUrl) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, "")}`;
}
