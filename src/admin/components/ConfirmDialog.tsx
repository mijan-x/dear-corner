import type { ReactNode } from "react";
import Dialog from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";

/** "Are you sure?" with the action spelled out on the button. */
function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="modal"
      title={title}
      bodyClassName="px-5 pb-6 md:px-7"
    >
      {children && <div className="type-body text-soft-ink">{children}</div>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm} loading={busy} loadingLabel="Working">
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

export default ConfirmDialog;
