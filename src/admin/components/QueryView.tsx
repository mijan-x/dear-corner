import type { ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import Notice from "../../components/ui/Notice";
import { Skeleton } from "../../components/ui/Skeleton";
import { toShopError } from "../../lib/errors";

/** Loading, error (with Try again) or the data. */
function QueryView<T>({
  query,
  children,
  rows = 4,
}: {
  query: { data: T | undefined; error: unknown; refetch: () => void };
  children: (data: T) => ReactNode;
  rows?: number;
}) {
  if (query.data !== undefined) return <>{children(query.data)}</>;
  if (query.error) {
    return (
      <Notice
        tone="error"
        action={
          <Button variant="secondary" size="sm" onClick={query.refetch}>
            Try again
          </Button>
        }
      >
        {toShopError(query.error).message}
      </Notice>
    );
  }
  return (
    <div
      aria-hidden="true"
      className="space-y-3 rounded-card border border-sand-line bg-paper p-5"
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default QueryView;
