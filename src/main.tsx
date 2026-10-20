import "./styles/fonts.css";
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LucideProvider } from "lucide-react";
import ErrorBoundary from "./components/system/ErrorBoundary";
import AppRouter from "./router";

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
