import { lazy, type ComponentType } from "react";
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

// Admin: its own chunks, loaded only by the shop team.
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const adminPage = (load: () => Promise<{ default: ComponentType }>) => {
  const Page = lazy(load);
  return <Page />;
};
const adminRoutes: RouteObject[] = [
  {
    path: "admin",
    element: <AdminLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: adminPage(() => import("./admin/pages/DashboardPage")),
      },
      {
        path: "orders",
        element: adminPage(() => import("./admin/pages/OrdersPage")),
      },
      {
        path: "orders/:id",
        element: adminPage(() => import("./admin/pages/OrderDetailPage")),
      },
      {
        path: "products",
        element: adminPage(() => import("./admin/pages/ProductsPage")),
      },
      {
        path: "products/new",
        element: adminPage(() => import("./admin/pages/ProductEditorPage")),
      },
      {
        path: "products/categories",
        element: adminPage(() => import("./admin/pages/CategoriesPage")),
      },
      {
        path: "products/collections",
        element: adminPage(() => import("./admin/pages/CollectionsPage")),
      },
      {
        path: "products/:id",
        element: adminPage(() => import("./admin/pages/ProductEditorPage")),
      },
      {
        path: "inventory",
        element: adminPage(() => import("./admin/pages/InventoryPage")),
      },
      {
        path: "coupons",
        element: adminPage(() => import("./admin/pages/CouponsPage")),
      },
      {
        path: "customers",
        element: adminPage(() => import("./admin/pages/CustomersPage")),
      },
      {
        path: "shipping",
        element: adminPage(() => import("./admin/pages/ShippingPage")),
      },
      {
        path: "reviews",
        element: adminPage(() => import("./admin/pages/ReviewsPage")),
      },
      {
        path: "messages",
        element: adminPage(() => import("./admin/pages/MessagesPage")),
      },
      {
        path: "settings",
        element: adminPage(() => import("./admin/pages/SettingsPage")),
      },
      {
        path: "activity",
        element: adminPage(() => import("./admin/pages/ActivityPage")),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "admin/print/:id",
    element: <AdminLayout bare />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: adminPage(() => import("./admin/pages/PrintPage")),
      },
    ],
  },
];

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
      ...adminRoutes,
    ],
  },
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
