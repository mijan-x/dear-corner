import { Outlet, ScrollRestoration } from "react-router";
import { ToastProvider } from "../components/ui/Toast";

/** Wraps every page: skip link, toasts and scroll restoration. */
function RootLayout() {
  return (
    <ToastProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-rosewood px-4 py-3 type-button text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Outlet />
      <ScrollRestoration />
    </ToastProvider>
  );
}

export default RootLayout;
