import { useState, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import AdminPage from "../components/AdminPage";
import ConfirmDialog from "../components/ConfirmDialog";
import Panel from "../components/Panel";
import QueryView from "../components/QueryView";
import Toggle from "../components/Toggle";
import { Button } from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import Notice from "../../components/ui/Notice";
import { Checkbox } from "../../components/ui/Choice";
import { SelectField, TextField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/useToast";
import { refreshAdmin, useAdminQuery } from "../lib/data";
import {
  deleteZone,
  fetchZones,
  saveFreeThreshold,
  saveZone,
  type ZoneWithAreas,
} from "../services/shipping";
import { useGeo } from "../../features/checkout/geo";
import { fetchShopSettings, useShopSettings } from "../../services/settings";
import { fetchQuery, invalidateQuery } from "../../lib/query";
import { toShopError } from "../../lib/errors";
import { formatPrice } from "../../utils/formatPrice";

const key = (d: string, a: string) => `${d}|${a}`;

function ZoneDialog({
  zone,
  onClose,
  onSaved,
}: {
  zone: ZoneWithAreas | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const geo = useGeo();
  const [f, setF] = useState({
    name: zone?.name ?? "",
    fee: zone ? String(zone.fee) : "",
    min_days: zone ? String(zone.min_days) : "",
    max_days: zone ? String(zone.max_days) : "",
    is_active: zone?.is_active ?? true,
    is_default: zone?.is_default ?? false,
    position: String(zone?.position ?? 0),
  });
  const [areas, setAreas] = useState(
    () =>
      new Set(
        (zone?.shipping_zone_areas ?? []).map((a) =>
          key(a.district, a.area ?? ""),
        ),
      ),
  );
  const [district, setDistrict] = useState(
    zone?.shipping_zone_areas[0]?.district ?? "Dhaka",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const districts = geo?.divisions.flatMap((d) => d.districts) ?? [];
  const areaList = districts.find((d) => d.name === district)?.areas ?? [];
  const toggle = (k: string, on: boolean) =>
    setAreas((s) => {
      const next = new Set(s);
      if (on) next.add(k);
      else next.delete(k);
      return next;
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!f.name.trim()) return setError("Give the zone a name.");
    if (f.fee === "" || f.min_days === "" || f.max_days === "")
      return setError("Enter the fee and the delivery days.");
    if (Number(f.max_days) < Number(f.min_days))
      return setError("The longest time can't be shorter than the shortest.");
    setBusy(true);
    setError(null);
    try {
      await saveZone(
        {
          name: f.name.trim(),
          fee: Number(f.fee),
          min_days: Number(f.min_days),
          max_days: Number(f.max_days),
          is_active: f.is_active,
          is_default: f.is_default,
          position: Number(f.position) || 0,
        },
        f.is_default
          ? []
          : [...areas].map((k) => ({
              district: k.split("|")[0],
              area: k.split("|")[1],
            })),
        zone?.id,
      );
      onSaved();
    } catch (e) {
      setError(toShopError(e).message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      variant="modal"
      title={zone ? `Edit ${zone.name}` : "New delivery zone"}
      bodyClassName="px-5 pb-6 md:px-7"
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          label="Name"
          maxLength={60}
          value={f.name}
          onChange={(e) => set({ name: e.target.value })}
          helper="Shoppers see it, for example Inside Dhaka."
        />
        <div className="grid grid-cols-3 gap-3">
          <TextField
            label="Fee (৳)"
            inputMode="numeric"
            value={f.fee}
            onChange={(e) => set({ fee: e.target.value.replace(/\D/g, "") })}
          />
          <TextField
            label="From (days)"
            inputMode="numeric"
            value={f.min_days}
            onChange={(e) =>
              set({ min_days: e.target.value.replace(/\D/g, "") })
            }
          />
          <TextField
            label="To (days)"
            inputMode="numeric"
            value={f.max_days}
            onChange={(e) =>
              set({ max_days: e.target.value.replace(/\D/g, "") })
            }
          />
        </div>
        <Toggle
          label="Everywhere else"
          description="The zone for every area not listed in another zone. Only one zone can be this."
          checked={f.is_default}
          onChange={(v) => set({ is_default: v })}
        />
        <Toggle
          label="In use"
          checked={f.is_active}
          onChange={(v) => set({ is_active: v })}
        />
        {!f.is_default && (
          <fieldset className="rounded-control border border-sand-line p-4">
            <legend className="px-1 type-label text-ink">
              Areas in this zone ({areas.size})
            </legend>
            <SelectField
              label="District"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              {districts.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </SelectField>
            <div className="mt-2 flex gap-3">
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() =>
                  areaList.forEach((a) => toggle(key(district, a), true))
                }
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() =>
                  areaList.forEach((a) => toggle(key(district, a), false))
                }
              >
                Clear
              </Button>
            </div>
            <div className="mt-1 grid max-h-64 overflow-y-auto sm:grid-cols-2">
              {areaList.map((a) => (
                <Checkbox
                  key={a}
                  label={a}
                  checked={areas.has(key(district, a))}
                  onChange={(e) => toggle(key(district, a), e.target.checked)}
                />
              ))}
            </div>
            <p className="mt-2 type-helper">
              An area can be in one zone only; choosing it here takes it out of
              any other zone.
            </p>
          </fieldset>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} loadingLabel="Saving">
            Save zone
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function FreeDelivery() {
  const toast = useToast();
  const { settings } = useShopSettings();
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown =
    value ??
    (settings.free_delivery_threshold
      ? String(settings.free_delivery_threshold)
      : "");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveFreeThreshold(shown ? Number(shown) : null);
      invalidateQuery("shop-settings");
      await fetchQuery("shop-settings", fetchShopSettings, {
        persist: true,
      }).catch(() => {});
      toast.show(
        shown
          ? `Free delivery from ${formatPrice(Number(shown))}.`
          : "Free delivery turned off.",
        "success",
      );
    } catch (e) {
      toast.show(toShopError(e).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Free delivery">
      <form onSubmit={save} className="flex flex-wrap items-end gap-3">
        <TextField
          label="Free when the order (after coupon) reaches ৳"
          optional
          inputMode="numeric"
          value={shown}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          helper="Empty = no free delivery."
          className="min-w-[240px] flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          loading={busy}
          loadingLabel="Saving"
          className="mb-6"
        >
          Save
        </Button>
      </form>
    </Panel>
  );
}

/** Delivery zones (fee and days) and the free-delivery threshold. */
function ShippingPage() {
  const toast = useToast();
  const query = useAdminQuery("zones", fetchZones);
  const [editing, setEditing] = useState<ZoneWithAreas | "new" | null>(null);
  const [removing, setRemoving] = useState<ZoneWithAreas | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = () => {
    invalidateQuery("shipping-zones");
    void refreshAdmin("zones", fetchZones);
  };
  return (
    <AdminPage
      title="Shipping"
      description="The fee comes from the zone of the customer's area. Checkout works it out again on the server."
      actions={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={18} aria-hidden="true" />
          New zone
        </Button>
      }
    >
      <div className="space-y-6">
        <QueryView query={query}>
          {(zones) => (
            <div className="grid gap-4 md:grid-cols-2">
              {zones.map((z) => (
                <Panel
                  key={z.id}
                  title={z.name}
                  actions={
                    <div className="flex">
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => setEditing(z)}
                        aria-label={`Edit ${z.name}`}
                      >
                        <Pencil size={16} aria-hidden="true" />
                        Edit
                      </Button>
                      {!z.is_default && (
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => setRemoving(z)}
                          aria-label={`Delete ${z.name}`}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  }
                >
                  <p className="figures text-[24px] font-bold text-ink">
                    {formatPrice(z.fee)}
                  </p>
                  <p className="type-body text-soft-ink">
                    {z.min_days}–{z.max_days} days ·{" "}
                    {z.is_active ? "In use" : "Not in use"}
                  </p>
                  <p className="mt-2 type-body text-ink">
                    {z.is_default
                      ? "Every area not in another zone."
                      : `${z.shipping_zone_areas.length} areas: ${z.shipping_zone_areas
                          .slice(0, 6)
                          .map((a) => a.area)
                          .join(
                            ", ",
                          )}${z.shipping_zone_areas.length > 6 ? "…" : ""}`}
                  </p>
                </Panel>
              ))}
            </div>
          )}
        </QueryView>
        <FreeDelivery />
      </div>
      {editing && (
        <ZoneDialog
          zone={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.show("Zone saved.", "success");
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        title={`Delete ${removing?.name ?? ""}?`}
        confirmLabel="Delete zone"
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(true);
          try {
            await deleteZone(removing.id);
            toast.show("Zone deleted.", "success");
            reload();
          } catch (e) {
            toast.show(toShopError(e).message, "error");
          } finally {
            setBusy(false);
            setRemoving(null);
          }
        }}
      >
        Its areas fall back to the “everywhere else” zone. Placed orders keep
        their fee.
      </ConfirmDialog>
    </AdminPage>
  );
}

export default ShippingPage;
