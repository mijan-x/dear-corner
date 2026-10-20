import "./styles/fonts.css";
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/system/ErrorBoundary";
import AppRouter from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  </StrictMode>,
);
