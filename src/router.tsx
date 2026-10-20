import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import RootLayout from "./layouts/RootLayout";
import RouteError from "./components/system/RouteError";
import HomePage from "./pages/HomePage";

// Every route except Home is loaded on demand (RootLayout shows the loader).
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
