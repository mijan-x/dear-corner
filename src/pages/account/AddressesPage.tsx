import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import EmptyState from "../../components/ui/EmptyState";
import Notice from "../../components/ui/Notice";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/useToast";
import AddressDialog from "../../components/account/AddressDialog";
import { useAuth } from "../../features/auth/session";
import { usePageMeta } from "../../hooks/usePageMeta";
import { toShopError } from "../../lib/errors";
import {
  deleteAddress,
  saveAddress,
  useAddresses,
  type Address,
} from "../../services/account";

const MAX_ADDRESSES = 10;

/** Saved addresses: add, edit, delete and pick the default for checkout. */
function AddressesPage() {
  usePageMeta({ title: "Saved addresses", noindex: true });
  const auth = useAuth();
  const userId = auth.user?.id ?? "";
  const toast = useToast();
  const { data, error, refetch } = useAddresses(auth.user?.id);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [removing, setRemoving] = useState<Address | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const list = data ?? [];
  const full = list.length >= MAX_ADDRESSES;

  const makeDefault = async (address: Address) => {
    setBusy(address.id);
    try {
      await saveAddress(userId, { ...address, isDefault: true }, address.id);
      toast.show(`${address.label} is now your default address.`, "success");
    } catch (e) {
      toast.show(toShopError(e).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(removing.id);
    try {
      await deleteAddress(userId, removing.id);
      toast.show("Address deleted.", "success");
      setRemoving(null);
    } catch (e) {
      toast.show(toShopError(e).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const addButton = (
    <Button onClick={() => setEditing("new")} disabled={full}>
      <Plus size={18} aria-hidden="true" />
      Add an address
    </Button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="type-h2 text-ink">Saved addresses</h1>
        {list.length > 0 && addButton}
      </div>
      {full && (
        <p className="mt-2 type-caption text-soft-ink">
          You can save up to 10 addresses. Delete one to add another.
        </p>
      )}

      <div className="mt-5">
        {error && !data ? (
          <Notice
            tone="error"
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                Try again
              </Button>
            }
          >
            {toShopError(error).message}
          </Notice>
        ) : !data ? (
          <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="space-y-3 rounded-card border border-sand-line bg-paper p-6"
              >
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-56" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="No saved addresses yet."
            icon={<MapPin size={40} strokeWidth={1.5} aria-hidden="true" />}
            action={addButton}
            className="rounded-card border border-sand-line bg-paper"
          >
            Save one and checkout is quicker next time.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {list.map((address) => (
              <li
                key={address.id}
                className={
                  address.isDefault
                    ? "flex flex-col rounded-card border-[1.5px] border-rosewood bg-paper p-5 md:p-6"
                    : "flex flex-col rounded-card border border-sand-line bg-paper p-5 md:p-6"
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="type-h3 text-ink">{address.label}</h2>
                  {address.isDefault && (
                    <span className="inline-flex h-6 items-center rounded-[6px_6px_6px_0] bg-clay-blush px-2 type-badge text-rosewood">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-2 flex-1 type-body text-ink">
                  {address.fullName} ·{" "}
                  <span className="figures">{address.phone}</span>
                  <br />
                  <span className="text-soft-ink">
                    {address.addressLine}, {address.area}, {address.district},{" "}
                    {address.division}
                  </span>
                </p>
                <div className="mt-4 flex flex-wrap gap-x-1 gap-y-1 border-t border-sand-line pt-3">
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setEditing(address)}
                    aria-label={`Edit ${address.label}`}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setRemoving(address)}
                    aria-label={`Delete ${address.label}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </Button>
                  {!address.isDefault && (
                    <Button
                      variant="quiet"
                      size="sm"
                      loading={busy === address.id}
                      loadingLabel="Saving"
                      onClick={() => makeDefault(address)}
                    >
                      Set as default
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing !== null && (
        <AddressDialog
          key={editing === "new" ? "new" : editing.id}
          userId={userId}
          address={editing === "new" ? null : editing}
          first={list.length === 0}
          open
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            toast.show(message, "success");
          }}
        />
      )}

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        variant="modal"
        title="Delete this address?"
        bodyClassName="px-5 pb-6 md:px-7"
      >
        {removing && (
          <>
            <p className="type-body text-soft-ink">
              {removing.label}: {removing.addressLine}, {removing.area}. Orders
              already placed keep their address.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setRemoving(null)}>
                Keep it
              </Button>
              <Button
                onClick={remove}
                loading={busy === removing.id}
                loadingLabel="Deleting"
              >
                Delete address
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

export default AddressesPage;
