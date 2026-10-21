import { Heart } from "lucide-react";
import { Button, ButtonLink } from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Notice from "../../components/ui/Notice";
import { Skeleton } from "../../components/ui/Skeleton";
import ProductCard from "../../components/product/ProductCard";
import WishlistButton from "../../components/product/WishlistButton";
import { useAuth } from "../../features/auth/session";
import { useQuickAdd } from "../../features/cart/useAddToCart";
import { usePageMeta } from "../../hooks/usePageMeta";
import { toShopError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { useWishlist } from "../../services/account";

/** The little things the customer has saved for later. */
function WishlistPage() {
  usePageMeta({ title: "Wishlist", noindex: true });
  const auth = useAuth();
  const quickAdd = useQuickAdd();
  const { data, error, refetch } = useWishlist(auth.user?.id);

  return (
    <div>
      <h1 className="type-h2 text-ink">Wishlist</h1>
      <div className="mt-5">
        {error && !data ? (
          <Notice
            tone="error"
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                Try again
              </Button>
            }
          >
            {toShopError(error).message}
          </Notice>
        ) : !data ? (
          <div
            aria-hidden="true"
            className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-card" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title="Nothing saved yet."
            icon={<Heart size={40} strokeWidth={1.5} aria-hidden="true" />}
            action={<ButtonLink to={routes.shop}>Explore the shop</ButtonLink>}
            className="rounded-card border border-sand-line bg-paper"
          >
            Tap the heart on any product to keep it here.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10">
            {data.map((product) => (
              <li key={product.id} className="relative">
                <ProductCard
                  product={product}
                  onQuickAdd={quickAdd}
                  headingLevel={2}
                />
                <WishlistButton
                  productId={product.id}
                  productName={product.name}
                  variant="overlay"
                  className="absolute top-2 right-2 z-10"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default WishlistPage;
