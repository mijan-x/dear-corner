import { lazy } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { RouterProvider } from "react-router/dom";
import RootLayout from "./layouts/RootLayout";
import ShopLayout from "./layouts/ShopLayout";
import RouteError from "./components/system/RouteError";
import HomePage from "./pages/HomePage";

// Every page except Home is loaded on demand (the layout shows the loader).
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

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
