import { useEffect, useRef, useState, type MouseEvent } from "react";
import LeafSprig from "../brand/LeafSprig";
import { imageUrl } from "../../lib/images";
import { cx } from "../../utils/cx";
import type { ProductImage } from "../../services/product";

const SIZES = "(min-width: 1024px) 640px, 100vw";

function srcSet(image: ProductImage) {
  const thumb = imageUrl(image.thumb);
  const full = imageUrl(image.path);
  if (!thumb || !full || thumb === full) return undefined;
  return `${thumb} 400w, ${full} 1200w`;
}

/**
 * Product photos (brand doc section 6). Phones: swipe between photos (native
 * scroll snap) with dots below. Desktop: a 72px thumbnail strip on the left
 * and zoom on hover, following the pointer. Re-mounted when the color
 * changes, with a 200ms fade.
 */
function ProductGallery({
  images,
  name,
  fade = false,
  soldOut = false,
}: {
  images: ProductImage[];
  /** Product name, for alt text fallbacks and button labels. */
  name: string;
  fade?: boolean;
  soldOut?: boolean;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const zoomImg = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const index = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setActive(Math.max(0, Math.min(images.length - 1, index)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [images.length]);

  const show = (index: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollTo({
      left: index * el.clientWidth,
      behavior: reduce ? "auto" : "smooth",
    });
    setActive(index);
  };

  const canZoom = () =>
    window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 1024px)",
    ).matches;

  const onMove = (event: MouseEvent<HTMLLIElement>) => {
    const img = zoomImg.current;
    if (!img) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
  };

  if (images.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-card border border-sand-line/80 bg-image-placeholder text-sand-line">
        <LeafSprig className="h-1/3" strokeWidth={1.5} />
        <span className="sr-only">No photo yet</span>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "lg:grid lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-4",
        fade && "dc-gallery-swap",
      )}
    >
      {images.length > 1 && (
        <ul aria-label="Photos" className="hidden flex-col gap-3 lg:flex">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => show(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === active ? "true" : undefined}
                className={cx(
                  "block size-[72px] overflow-hidden rounded-control border-2 bg-image-placeholder transition-colors",
                  i === active
                    ? "border-rosewood"
                    : "border-transparent hover:border-mauve-grey",
                )}
              >
                <img
                  src={imageUrl(image.thumb) ?? undefined}
                  alt=""
                  width={72}
                  height={72}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={cx("min-w-0", images.length === 1 && "lg:col-span-2")}>
        <ul
          ref={track}
          aria-label={`Photos of ${name}`}
          className="dc-scroller flex snap-x snap-mandatory [scroll-padding-inline:0] overflow-x-auto rounded-card border border-sand-line/80 bg-image-placeholder lg:overflow-hidden"
        >
          {images.map((image, i) => (
            <li
              key={image.id}
              className="relative aspect-square w-full shrink-0 overflow-hidden lg:cursor-zoom-in"
              onMouseEnter={(event) => {
                if (i !== active || !canZoom()) return;
                zoomImg.current = event.currentTarget.querySelector("img");
                setZoom(true);
                onMove(event);
              }}
              onMouseMove={onMove}
              onMouseLeave={() => setZoom(false)}
            >
              <img
                src={imageUrl(image.thumb) ?? undefined}
                srcSet={srcSet(image)}
                sizes={SIZES}
                alt={image.alt || `${name}, photo ${i + 1}`}
                width={image.width ?? 1200}
                height={image.height ?? 1200}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                decoding="async"
                draggable={false}
                className={cx(
                  "size-full object-cover transition-transform duration-200 ease-out",
                  zoom && i === active && "scale-[2]",
                  soldOut && "opacity-80",
                )}
              />
            </li>
          ))}
        </ul>

        {images.length > 1 && (
          <div className="mt-1 flex items-center justify-center lg:hidden">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => show(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === active ? "true" : undefined}
                className="grid size-11 place-items-center"
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    "block rounded-full transition-all duration-200",
                    i === active
                      ? "h-2 w-5 bg-rosewood"
                      : "size-2 bg-mauve-grey/50",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductGallery;
