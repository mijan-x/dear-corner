import type { ReactNode } from "react";
import { cx } from "../../utils/cx";

/**
 * Admin table. Scrolls sideways inside its card on small screens (the page
 * itself never does). Headers are real <th> cells for screen readers.
 */
function Table({
  head,
  children,
  empty,
  minWidth = 720,
  label,
}: {
  head: ReactNode[];
  children: ReactNode;
  empty?: ReactNode;
  minWidth?: number;
  label: string;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-sand-line bg-paper">
      <div
        className="overflow-x-auto"
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        <table
          className="w-full border-collapse text-left type-body"
          style={{ minWidth }}
        >
          <thead className="bg-cream/70">
            <tr>
              {head.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-4 py-3 type-label whitespace-nowrap text-soft-ink"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-line">{children}</tbody>
        </table>
      </div>
      {empty && (
        <div className="border-t border-sand-line px-4 py-10 text-center type-body text-soft-ink">
          {empty}
        </div>
      )}
    </div>
  );
}

export function Td({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td className={cx("px-4 py-3 align-middle", className)}>{children}</td>
  );
}

export default Table;
