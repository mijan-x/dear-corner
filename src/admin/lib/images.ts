import { db, must } from "./data";

/**
 * Photos are resized in the browser before upload (brand rule): a 1200 px
 * WebP under 150 KB for the page and a 400 px one for cards and lists.
 */
const MAX_BYTES = 150 * 1024;

async function decode(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith("image/"))
    throw new Error("Choose a photo (JPG, PNG or WebP).");
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("That photo couldn't be read. Try a JPG or PNG.");
  }
}

async function encode(bitmap: ImageBitmap, longest: number, maxBytes: number) {
  const scale = Math.min(1, longest / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't resize photos.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  let blob: Blob | null = null;
  for (const quality of [0.86, 0.8, 0.72, 0.64, 0.56, 0.48]) {
    blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/webp", quality),
    );
    if (blob && blob.size <= maxBytes) break;
  }
  if (!blob)
    throw new Error("This browser can't make WebP photos. Try Chrome or Edge.");
  return { blob, width, height };
}

export type PreparedImage = {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
};

export async function prepareImage(
  file: File,
  longest = 1200,
  maxBytes = MAX_BYTES,
): Promise<PreparedImage> {
  const bitmap = await decode(file);
  const full = await encode(bitmap, longest, maxBytes);
  const thumb = await encode(bitmap, 400, 40 * 1024);
  bitmap.close();
  return {
    full: full.blob,
    thumb: thumb.blob,
    width: full.width,
    height: full.height,
  };
}

export type Bucket = "product-images" | "site-media";

export async function uploadBlob(bucket: Bucket, path: string, blob: Blob) {
  const { error } = await (await db()).storage.from(bucket).upload(path, blob, {
    contentType: "image/webp",
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw error;
  return path;
}

/** Removes stored files (paths starting with "/" are bundled demo photos). */
export async function removeFiles(
  bucket: Bucket,
  paths: (string | null | undefined)[],
) {
  const stored = paths.filter(
    (p): p is string =>
      Boolean(p) && !p!.startsWith("/") && !/^https?:/.test(p!),
  );
  if (!stored.length) return;
  await (await db()).storage.from(bucket).remove(stored);
}

const id = () => crypto.randomUUID().slice(0, 8);

/** Uploads a product photo and its thumbnail, and records it. */
export async function addProductImage(
  productId: string,
  file: File,
  position: number,
) {
  const img = await prepareImage(file);
  const base = `products/${productId}/${Date.now()}-${id()}`;
  const path = await uploadBlob("product-images", `${base}.webp`, img.full);
  const thumb = await uploadBlob(
    "product-images",
    `${base}-400.webp`,
    img.thumb,
  );
  const row = must(
    await (
      await db()
    )
      .from("product_images")
      .insert({
        product_id: productId,
        path,
        thumb_path: thumb,
        width: img.width,
        height: img.height,
        position,
        alt_text: "",
      })
      .select("*")
      .single(),
  );
  if (!row) throw new Error("The photo was uploaded but not saved. Try again.");
  return row;
}

/** Uploads a category, collection or homepage photo to site-media. */
export async function uploadSiteImage(
  folder: string,
  file: File,
  longest = 1600,
) {
  const img = await prepareImage(file, longest, 300 * 1024);
  return uploadBlob(
    "site-media",
    `${folder}/${Date.now()}-${id()}.webp`,
    img.full,
  );
}
