import { lazy } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { RouterProvider } from "react-router/dom";
import RootLayout from "./layouts/RootLayout";
import ShopLayout from "./layouts/ShopLayout";
import RouteError from "./components/system/RouteError";
import HomePage from "./pages/HomePage";

// Every page except Home is loaded on demand (the layout shows the loader).
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const ListingPage = lazy(() => import("./pages/ListingPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderConfirmedPage = lazy(() => import("./pages/OrderConfirmedPage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const SignInPage = lazy(() => import("./pages/account/SignInPage"));
const AccountLayout = lazy(() => import("./layouts/AccountLayout"));
const OrdersPage = lazy(() => import("./pages/account/OrdersPage"));
const OrderDetailPage = lazy(() => import("./pages/account/OrderDetailPage"));
const AddressesPage = lazy(() => import("./pages/account/AddressesPage"));
const ProfilePage = lazy(() => import("./pages/account/ProfilePage"));
const WishlistPage = lazy(() => import("./pages/account/WishlistPage"));

// The design-system reference page; left out of Vercel production builds.
const styleguideRoutes: RouteObject[] = __SHOW_STYLEGUIDE__
  ? [
      {
        path: "styleguide",
        Component: lazy(() => import("./pages/StyleguidePage")),
      },
    ]
  : [];

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <ShopLayout />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "shop", element: <ListingPage key="shop" kind="shop" /> },
          {
            path: "shop/:slug",
            element: <ListingPage key="category" kind="category" />,
          },
          {
            path: "collections/:slug",
            element: <ListingPage key="collection" kind="collection" />,
          },
          {
            path: "search",
            element: <ListingPage key="search" kind="search" />,
          },
          { path: "products/:slug", element: <ProductPage /> },
          { path: "cart", element: <CartPage /> },
          { path: "checkout", element: <CheckoutPage /> },
          {
            path: "order-confirmed/:orderNumber",
            element: <OrderConfirmedPage />,
          },
          { path: "track-order", element: <TrackOrderPage /> },
          { path: "account/sign-in", element: <SignInPage /> },
          {
            path: "account",
            element: <AccountLayout />,
            children: [
              { index: true, element: <OrdersPage /> },
              { path: "orders/:orderNumber", element: <OrderDetailPage /> },
              { path: "addresses", element: <AddressesPage /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "wishlist", element: <WishlistPage /> },
            ],
          },
          ...styleguideRoutes,
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
