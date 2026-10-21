import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/Button";

/** "21–40 of 132" with Previous / Next. */
function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const first = page * pageSize + 1;
  const last = Math.min(total, first + pageSize - 1);
  return (
    <nav
      aria-label="Pages"
      className="mt-4 flex items-center justify-between gap-3"
    >
      <p className="type-caption text-soft-ink">
        <span className="figures">
          {first}–{last}
        </span>{" "}
        of <span className="figures">{total}</span>
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={last >= total}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight size={18} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

export default Pager;
