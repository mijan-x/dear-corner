import horizontalRosewood from "../../assets/brand/dear-corner_primary-horizontal_rosewood.svg";
import horizontalTaglineRosewood from "../../assets/brand/dear-corner_primary-horizontal-tagline_rosewood.svg";
import horizontalTaglineCream from "../../assets/brand/dear-corner_primary-horizontal-tagline_cream.svg";
import compactRosewood from "../../assets/brand/dear-corner_wordmark-compact_rosewood.svg";
import compactCream from "../../assets/brand/dear-corner_wordmark-compact_cream.svg";
import stackedRosewood from "../../assets/brand/dear-corner_primary-stacked_rosewood.svg";
import monogramRosewood from "../../assets/brand/dear-corner_monogram_rosewood.svg";
import monogramCream from "../../assets/brand/dear-corner_monogram_cream.svg";
import monogramSimpleRosewood from "../../assets/brand/dear-corner_monogram-simple_rosewood.svg";

/**
 * The supplied logo files, never retyped in a font (brand doc section 4).
 * Ratios come from each SVG's viewBox; minimum widths from the logo README.
 *
 * Color rules: rosewood versions on linen, cream, white and clay blush;
 * cream versions on rosewood and night plum. Never rosewood on night plum.
 */
const logos = {
  horizontal: { src: horizontalRosewood, ratio: 807.03 / 139, minWidth: 180 },
  "horizontal-tagline": {
    src: horizontalTaglineRosewood,
    ratio: 855.52 / 178.92,
    minWidth: 280,
  },
  "horizontal-tagline-cream": {
    src: horizontalTaglineCream,
    ratio: 855.52 / 178.92,
    minWidth: 280,
  },
  compact: { src: compactRosewood, ratio: 591.48 / 82.62, minWidth: 110 },
  "compact-cream": { src: compactCream, ratio: 591.48 / 82.62, minWidth: 110 },
  stacked: { src: stackedRosewood, ratio: 558.1 / 291.41, minWidth: 120 },
  monogram: { src: monogramRosewood, ratio: 875 / 720.2, minWidth: 48 },
  "monogram-cream": { src: monogramCream, ratio: 875 / 720.2, minWidth: 48 },
  "monogram-simple": {
    src: monogramSimpleRosewood,
    ratio: 786.72 / 720.2,
    minWidth: 24,
  },
} as const;

export type LogoVariant = keyof typeof logos;

type LogoProps = {
  variant: LogoVariant;
  /** Rendered height in px. Give either height or width. */
  height?: number;
  /** Rendered width in px. */
  width?: number;
  className?: string;
  /** Decorative when a visible text label already names the brand. */
  decorative?: boolean;
  priority?: boolean;
};

function logoSize(
  variant: LogoVariant,
  size: { height?: number; width?: number },
) {
  const { ratio } = logos[variant];
  if (size.width)
    return { width: size.width, height: Math.round(size.width / ratio) };
  const height = size.height ?? 32;
  return { width: Math.round(height * ratio), height };
}

function Logo({
  variant,
  height,
  width,
  className,
  decorative,
  priority,
}: LogoProps) {
  const logo = logos[variant];
  const size = logoSize(variant, { height, width });
  if (import.meta.env.DEV && size.width < logo.minWidth) {
    console.warn(
      `[Logo] "${variant}" rendered ${size.width}px wide; the minimum is ${logo.minWidth}px.`,
    );
  }
  return (
    <img
      src={logo.src}
      width={size.width}
      height={size.height}
      alt={decorative ? "" : "Dear Corner"}
      className={className}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
    />
  );
}

/**
 * Header logo: compact wordmark on small screens, primary horizontal logo
 * from 1024px. One <picture>, so the browser downloads only the one it shows.
 * Horizontal at 32px high = 186px wide (minimum 180). Compact at 20px = 143px
 * (minimum 110).
 */
export function HeaderLogo({ className }: { className?: string }) {
  const desktop = logoSize("horizontal", { height: 32 });
  const mobile = logoSize("compact", { height: 20 });
  return (
    <picture className={className}>
      <source
        media="(min-width: 1024px)"
        srcSet={logos.horizontal.src}
        width={desktop.width}
        height={desktop.height}
      />
      <img
        src={logos.compact.src}
        width={mobile.width}
        height={mobile.height}
        alt="Dear Corner"
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />
    </picture>
  );
}

export default Logo;
