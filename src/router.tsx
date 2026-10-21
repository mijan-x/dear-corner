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
