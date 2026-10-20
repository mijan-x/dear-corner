/**
 * Every URL the shop links to, in one place. Pages arrive phase by phase;
 * links to pages that don't exist yet show the "This corner is empty" page.
 */
export const routes = {
  home: "/",
  shop: "/shop",
  category: (slug: string) => `/shop/${slug}`,
  collection: (slug: string) => `/collections/${slug}`,
  newArrivals: "/collections/new-arrivals",
  product: (slug: string) => `/products/${slug}`,
  search: (query?: string) =>
    query ? `/search?q=${encodeURIComponent(query)}` : "/search",
  cart: "/cart",
  checkout: "/checkout",
  trackOrder: "/track-order",
  account: "/account",
  signIn: "/account/sign-in",
  wishlist: "/account/wishlist",
  about: "/about",
  contact: "/contact",
  faq: "/faq",
  delivery: "/delivery",
  returns: "/exchange-and-returns",
  privacy: "/privacy",
  terms: "/terms",
  styleguide: "/styleguide",
} as const;

/** Pages where the bottom navigation would cover the page's own action bar. */
export function hidesBottomNav(pathname: string): boolean {
  return (
    pathname.startsWith("/products/") ||
    pathname === routes.cart ||
    pathname.startsWith(routes.checkout)
  );
}
