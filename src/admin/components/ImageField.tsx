import { useId, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { imageUrl } from "../../lib/images";
import { uploadSiteImage } from "../lib/images";

/** One photo (category card, banner, homepage hero): upload, preview, remove. */
function ImageField({
  label,
  value,
  onChange,
  folder,
  helper,
  aspect = "aspect-[2/1]",
  longest = 1600,
}: {
  label: string;
  value: string | null;
  onChange: (path: string | null) => void;
  folder: string;
  helper?: string;
  aspect?: string;
  longest?: number;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = imageUrl(
    value,
    value?.startsWith("/") ? undefined : "site-media",
  );
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadSiteImage(folder, file, longest));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div>
      <p id={id} className="type-label text-ink">
        {label}
      </p>
      <div
        className={`mt-1.5 overflow-hidden rounded-control border border-sand-line bg-image-placeholder ${aspect}`}
      >
        {src ? (
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center type-caption text-soft-ink">
            No photo
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          aria-labelledby={id}
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={busy}
          loadingLabel="Uploading"
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={17} aria-hidden="true" />
          {value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            onClick={() => onChange(null)}
          >
            <Trash2 size={17} aria-hidden="true" />
            Remove
          </Button>
        )}
      </div>
      {error ? (
        <p className="mt-1 type-helper text-error!">{error}</p>
      ) : (
        helper && <p className="mt-1 type-helper">{helper}</p>
      )}
    </div>
  );
}

export default ImageField;
