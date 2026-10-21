import { Link } from "react-router";
import LeafSprig from "../brand/LeafSprig";
import { imageUrl } from "../../lib/images";
import { routes } from "../../lib/routes";
import { cx } from "../../utils/cx";
import type { CategoryCardData } from "../../types/shop";

/**
 * Category card (brand doc section 6): square image with a 16px radius, the
 * name in DM Sans 600 at 16px below and the item count in soft ink (left
 * out when the count is unknown, -1).
 */
function CategoryCard({
  category,
  priority = false,
  className,
}: {
  category: CategoryCardData;
  priority?: boolean;
  className?: string;
}) {
  const href =
    category.kind === "collection"
      ? routes.collection(category.slug)
      : routes.category(category.slug);
  const src = imageUrl(category.image, "site-media");
  return (
    <Link to={href} className={cx("group flex min-w-0 flex-col", className)}>
      <span className="relative block aspect-square overflow-hidden rounded-card border border-sand-line/80 bg-image-placeholder">
        {src ? (
          <img
            src={src}
            alt=""
            width={400}
            height={400}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-[1.03]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center text-sand-line"
          >
            <LeafSprig className="h-1/3" />
          </span>
        )}
      </span>
      <span className="mt-3 text-[16px] leading-[22px] font-semibold text-ink underline-offset-4 group-hover:text-rosewood group-hover:underline">
        {category.name}
      </span>
      {category.count >= 0 && (
        <span className="type-caption text-soft-ink">
          {category.count} {category.count === 1 ? "item" : "items"}
        </span>
      )}
    </Link>
  );
}

export default CategoryCard;
