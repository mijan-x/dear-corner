import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import Notice from "../../../components/ui/Notice";
import { controlClasses } from "../../../components/ui/fieldStyles";
import { imageUrl } from "../../../lib/images";
import { addProductImage } from "../../lib/images";
import type { FormImage, FormOption } from "../../lib/productForm";

/**
 * Product photos: upload (resized here to 1200 px WebP + 400 px thumbnail),
 * order (the first is the main photo), alt text and which color shows it.
 * Removed photos are deleted when the product is saved.
 */
function PhotosEditor({
  productId,
  images,
  colorOption,
  onChange,
}: {
  productId?: string;
  images: FormImage[];
  colorOption?: FormOption;
  onChange: (images: FormImage[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length || !productId) return;
    setError(null);
    let list = images;
    for (const file of Array.from(files)) {
      setBusy((n) => n + 1);
      try {
        const row = await addProductImage(productId, file, list.length);
        list = [
          ...list,
          {
            id: row.id,
            path: row.path,
            thumb: row.thumb_path,
            alt: "",
            valueKey: "",
          },
        ];
        onChange(list);
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
  };

  const move = (i: number, by: number) => {
    const next = [...images];
    const [img] = next.splice(i, 1);
    next.splice(i + by, 0, img);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {!productId && (
        <Notice tone="info">Save the product once, then add its photos.</Notice>
      )}
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((img, i) => (
            <li
              key={img.id}
              className="rounded-control border border-sand-line bg-paper p-2"
            >
              <div className="relative aspect-square overflow-hidden rounded-[8px] bg-image-placeholder">
                <img
                  src={imageUrl(img.thumb ?? img.path) ?? undefined}
                  alt=""
                  className="size-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute top-2 left-2 rounded-[6px_6px_6px_0] bg-rosewood px-2 py-0.5 type-badge text-white">
                    Main
                  </span>
                )}
              </div>
              <input
                aria-label={`Alt text, photo ${i + 1}`}
                placeholder="Describe the photo"
                value={img.alt}
                onChange={(e) =>
                  onChange(
                    images.map((x, j) =>
                      j === i ? { ...x, alt: e.target.value } : x,
                    ),
                  )
                }
                className={controlClasses({ className: "mt-2 h-11 px-2.5" })}
              />
              {colorOption && (
                <select
                  aria-label={`Color shown, photo ${i + 1}`}
                  value={img.valueKey}
                  onChange={(e) =>
                    onChange(
                      images.map((x, j) =>
                        j === i ? { ...x, valueKey: e.target.value } : x,
                      ),
                    )
                  }
                  className={controlClasses({ className: "mt-2 h-11 px-2.5" })}
                >
                  <option value="">Every color</option>
                  {colorOption.values.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.value}
                    </option>
                  ))}
                </select>
              )}
              <div className="mt-1 flex justify-between">
                <div className="flex">
                  <button
                    type="button"
                    aria-label={`Move photo ${i + 1} earlier`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="grid size-11 place-items-center rounded-full text-soft-ink hover:bg-cream disabled:opacity-30"
                  >
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move photo ${i + 1} later`}
                    disabled={i === images.length - 1}
                    onClick={() => move(i, 1)}
                    className="grid size-11 place-items-center rounded-full text-soft-ink hover:bg-cream disabled:opacity-30"
                  >
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => onChange(images.filter((_, j) => j !== i))}
                  className="grid size-11 place-items-center rounded-full text-soft-ink hover:bg-clay-blush hover:text-rosewood"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!productId}
        loading={busy > 0}
        loadingLabel="Uploading"
        onClick={() => input.current?.click()}
      >
        <ImagePlus size={18} aria-hidden="true" />
        Add photos
      </Button>
      <p className="type-helper">
        JPG, PNG or WebP. Square photos look best. Resized here before upload.
      </p>
    </div>
  );
}

export default PhotosEditor;
