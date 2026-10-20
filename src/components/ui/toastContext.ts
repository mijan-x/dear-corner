import { createContext } from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastApi = {
  /** Shows a short message for 4 seconds and announces it to screen readers. */
  show: (message: string, tone?: ToastTone) => void;
};

export const ToastContext = createContext<ToastApi>({ show: () => {} });
