import "./styles/fonts.css";
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LucideProvider } from "lucide-react";
import ErrorBoundary from "./components/system/ErrorBoundary";
import AppRouter from "./router";
import { startAuth } from "./features/auth/session";
import { startCartSync } from "./features/cart/cartSync";

// Cart sync listens first, so it hears the first sign-in answer.
startCartSync();
startAuth();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Brand icons: Lucide outline, 24px grid, 1.75px stroke at every size. */}
      <LucideProvider size={24} strokeWidth={1.75} absoluteStrokeWidth>
        <AppRouter />
      </LucideProvider>
    </ErrorBoundary>
  </StrictMode>,
);
