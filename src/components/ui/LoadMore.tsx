import Button from "./Button";

/**
 * "Load more" instead of endless scrolling, so the footer stays reachable
 * (brand doc section 6). Shows how many are on screen.
 */
function LoadMore({
  shown,
  total,
  loading,
  onLoadMore,
  noun = "products",
}: {
  shown: number;
  total: number;
  loading?: boolean;
  onLoadMore: () => void;
  noun?: string;
}) {
  const percent = total > 0 ? Math.min(100, (shown / total) * 100) : 100;
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-4 text-center">
      <p className="type-caption text-soft-ink">
        {`Showing ${shown} of ${total} ${noun}`}
      </p>
      <div
        aria-hidden="true"
        className="h-0.5 w-full overflow-hidden rounded-full bg-sand-line"
      >
        <div
          className="h-full rounded-full bg-rosewood transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      {shown < total && (
        <Button
          variant="secondary"
          onClick={onLoadMore}
          loading={loading}
          loadingLabel={`Loading more ${noun}`}
        >
          Load more
        </Button>
      )}
    </div>
  );
}

export default LoadMore;
