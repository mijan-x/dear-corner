/**
 * The leaf sprig from the monogram, drawn as a thin line illustration
 * (brand doc section 5): section dividers, empty states, quiet decoration.
 */
function LeafSprig({
  className,
  strokeWidth = 1.5,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 120 200"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      vectorEffect="non-scaling-stroke"
    >
      {/* stem */}
      <path
        d="M58 196 C 57 150, 60 98, 72 22"
        vectorEffect="non-scaling-stroke"
      />
      {/* leaves, alternating, getting smaller toward the tip */}
      <path
        d="M58 160 C 36 152, 22 132, 22 108 C 42 116, 56 136, 58 160 Z"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M60 122 C 82 116, 96 96, 98 72 C 78 80, 63 98, 60 122 Z"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M63 88 C 46 80, 36 64, 37 46 C 53 54, 62 70, 63 88 Z"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M68 52 C 82 46, 90 34, 90 18 C 77 24, 69 36, 68 52 Z"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default LeafSprig;
