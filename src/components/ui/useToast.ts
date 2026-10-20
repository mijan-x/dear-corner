import { useContext } from "react";
import { ToastContext } from "./toastContext";

/** const toast = useToast(); toast.show("Address saved."); */
export function useToast() {
  return useContext(ToastContext);
}
