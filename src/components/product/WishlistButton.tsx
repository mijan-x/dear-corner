import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Heart } from "lucide-react";
import { useToast } from "../ui/useToast";
import { useAuth } from "../../features/auth/session";
import { toShopError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { setWishlisted, useWishlistIds } from "../../services/account";
import { cx } from "../../utils/cx";

/**
 * Heart toggle for the wishlist. Saved in the customer's account; visitors
 * who aren't signed in are taken to sign in and brought back.
 */
function WishlistButton({
  productId,
  productName,
  variant = "outline",
  className,
}: {
  productId: string;
  productName: string;
  /** outline: next to Add to cart · overlay: on a product photo */
  variant?: "outline" | "overlay";
  className?: string;
}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { data: ids } = useWishlistIds(auth.user?.id);
  const [pending, setPending] = useState<boolean | null>(null);
  const saved = pending ?? ids?.includes(productId) ?? false;

  const toggle = async () => {
    if (auth.status !== "signed-in") {
      navigate(routes.signInNext(location.pathname + location.search));
      return;
    }
    const next = !saved;
    setPending(next);
    try {
      await setWishlisted(auth.user.id, productId, next);
      toast.show(
        next ? "Saved to your wishlist." : "Removed from your wishlist.",
        "success",
      );
    } catch (e) {
      toast.show(toShopError(e).message, "error");
    } finally {
      setPending(null);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={
        saved
          ? `Remove ${productName} from your wishlist`
          : `Save ${productName} to your wishlist`
      }
      className={cx(
        "grid shrink-0 place-items-center rounded-full transition-[background-color,border-color,transform] duration-150 active:scale-95",
        variant === "outline"
          ? "size-12 border-[1.5px] border-sand-line bg-paper hover:border-rosewood"
          : "size-11 bg-paper/90 shadow-sm backdrop-blur-sm hover:bg-paper",
        className,
      )}
    >
      <Heart
        size={22}
        aria-hidden="true"
        className={cx(
          "transition-colors",
          saved ? "fill-rosewood text-rosewood" : "text-ink",
        )}
      />
    </button>
  );
}

export default WishlistButton;
