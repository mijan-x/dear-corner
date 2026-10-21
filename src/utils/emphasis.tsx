import { Fragment, type ReactNode } from "react";

/** "Little Things, *Lovely* Spaces." → the starred word in italics. */
export function withEmphasis(text: string): ReactNode {
  const parts = text.split(/\*([^*]+)\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="italic">
        {part}
      </em>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** The same text without the stars (titles, alt text). */
export function plainText(text: string): string {
  return text.replace(/\*([^*]+)\*/g, "$1");
}
