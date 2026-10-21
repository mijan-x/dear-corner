import { useState, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import AdminPage from "../components/AdminPage";
import ConfirmDialog from "../components/ConfirmDialog";
import QueryView from "../components/QueryView";
import Table, { Td } from "../components/Table";
import Toggle from "../components/Toggle";
import { Button } from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import Notice from "../../components/ui/Notice";
import { Checkbox } from "../../components/ui/Choice";
import { SelectField, TextField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/useToast";
import { refreshAdmin, useAdminQuery } from "../lib/data";
import { categoryLabel, fetchCategoryOptions } from "../services/catalog";
import {
  deleteCoupon,
  fetchCoupons,
  saveCoupon,
  type CouponListRow,
} from "../services/coupons";
import { toShopError } from "../../lib/errors";
import { formatPrice } from "../../utils/formatPrice";
import { formatDate } from "../../utils/formatDate";
import { cx } from "../../utils/cx";

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const n = (v: string) => (v.trim() ? Number(v) : null);

function describe(c: CouponListRow) {
  const off =
    c.type === "percent" ? `${c.value}% off` : `${formatPrice(c.value)} off`;
  const cap =
    c.type === "percent" && c.max_discount
      ? ` (up to ${formatPrice(c.max_discount)})`
      : "";
  const min = c.min_subtotal
    ? `, orders from ${formatPrice(c.min_subtotal)}`
    : "";
  return off + cap + min;
}

function state(c: CouponListRow) {
  const now = Date.now();
  if (!c.is_active) return { word: "Off", cls: "bg-soft-sand text-soft-ink" };
  if (c.expires_at && Date.parse(c.expires_at) < now)
    return { word: "Expired", cls: "bg-soft-sand text-soft-ink" };
  if (c.starts_at && Date.parse(c.starts_at) > now)
    return { word: "Scheduled", cls: "bg-info-bg text-info" };
  return { word: "Live", cls: "bg-success-bg text-success" };
}

function CouponDialog({
  coupon,
  onClose,
  onSaved,
}: {
  coupon: CouponListRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: categories = [] } = useAdminQuery(
    "category-options",
    fetchCategoryOptions,
    60_000,
  );
  const [f, setF] = useState({
    code: coupon?.code ?? "",
    description: coupon?.description ?? "",
    type: coupon?.type ?? "percent",
    value: coupon ? String(coupon.value) : "",
    max_discount: coupon?.max_discount ? String(coupon.max_discount) : "",
    min_subtotal: coupon?.min_subtotal ? String(coupon.min_subtotal) : "",
    starts_at: day(coupon?.starts_at ?? null),
    expires_at: day(coupon?.expires_at ?? null),
    usage_limit: coupon?.usage_limit ? String(coupon.usage_limit) : "",
    per_customer_limit: coupon
      ? coupon.per_customer_limit
        ? String(coupon.per_customer_limit)
        : ""
      : "1",
    is_active: coupon?.is_active ?? true,
    categories: coupon?.coupon_categories.map((c) => c.category_id) ?? [],
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const code = f.code.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(code))
      return setError(
        "Use 3–30 letters or numbers for the code, like WELCOME10.",
      );
    if (!Number(f.value)) return setError("Enter how much it takes off.");
    if (f.type === "percent" && Number(f.value) > 100)
      return setError("A percentage can't be more than 100.");
    if (f.starts_at && f.expires_at && f.expires_at < f.starts_at)
      return setError("The end date is before the start date.");
    setBusy(true);
    setError(null);
    try {
      await saveCoupon(
        {
          code,
          description: f.description.trim(),
          type: f.type,
          value: Number(f.value),
          max_discount: f.type === "percent" ? n(f.max_discount) : null,
          min_subtotal: n(f.min_subtotal) ?? 0,
          starts_at: f.starts_at ? `${f.starts_at}T00:00:00+06:00` : null,
          expires_at: f.expires_at ? `${f.expires_at}T23:59:59+06:00` : null,
          usage_limit: n(f.usage_limit),
          per_customer_limit: n(f.per_customer_limit),
          is_active: f.is_active,
        },
        f.categories,
        coupon?.id,
      );
      onSaved();
    } catch (e) {
      const c = (e as { code?: string })?.code;
      setError(
        c === "23505"
          ? "There's already a coupon with this code."
          : toShopError(e).message,
      );
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      variant="modal"
      title={coupon ? `Edit ${coupon.code}` : "New coupon"}
      bodyClassName="px-5 pb-6 md:px-7"
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          label="Code"
          value={f.code}
          onChange={(e) => set({ code: e.target.value.toUpperCase() })}
          maxLength={30}
          inputClassName="uppercase"
          helper="What shoppers type, for example EID15."
        />
        <TextField
          label="Note for the team"
          optional
          maxLength={200}
          value={f.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Discount"
            value={f.type}
            onChange={(e) =>
              set({ type: e.target.value as "percent" | "fixed" })
            }
          >
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed amount (৳)</option>
          </SelectField>
          <TextField
            label={f.type === "percent" ? "Percent off" : "Taka off"}
            inputMode="numeric"
            value={f.value}
            onChange={(e) => set({ value: e.target.value.replace(/\D/g, "") })}
          />
          {f.type === "percent" && (
            <TextField
              label="Most it takes off (৳)"
              optional
              inputMode="numeric"
              value={f.max_discount}
              onChange={(e) =>
                set({ max_discount: e.target.value.replace(/\D/g, "") })
              }
            />
          )}
          <TextField
            label="Minimum order (৳)"
            optional
            inputMode="numeric"
            value={f.min_subtotal}
            onChange={(e) =>
              set({ min_subtotal: e.target.value.replace(/\D/g, "") })
            }
          />
          <TextField
            label="Starts"
            optional
            type="date"
            value={f.starts_at}
            onChange={(e) => set({ starts_at: e.target.value })}
          />
          <TextField
            label="Ends"
            optional
            type="date"
            value={f.expires_at}
            onChange={(e) => set({ expires_at: e.target.value })}
          />
          <TextField
            label="Total uses"
            optional
            inputMode="numeric"
            value={f.usage_limit}
            onChange={(e) =>
              set({ usage_limit: e.target.value.replace(/\D/g, "") })
            }
            helper="Empty = no limit."
          />
          <TextField
            label="Uses per customer"
            optional
            inputMode="numeric"
            value={f.per_customer_limit}
            onChange={(e) =>
              set({ per_customer_limit: e.target.value.replace(/\D/g, "") })
            }
            helper="Counted by phone number."
          />
        </div>
        <fieldset>
          <legend className="type-label text-ink">
            Only for these categories{" "}
            <span className="font-normal text-soft-ink">(optional)</span>
          </legend>
          <div className="mt-1 grid sm:grid-cols-2">
            {categories.map((c) => (
              <Checkbox
                key={c.id}
                label={categoryLabel(categories, c.id)}
                checked={f.categories.includes(c.id)}
                onChange={(e) =>
                  set({
                    categories: e.target.checked
                      ? [...f.categories, c.id]
                      : f.categories.filter((x) => x !== c.id),
                  })
                }
              />
            ))}
          </div>
        </fieldset>
        <Toggle
          label="Coupon is on"
          checked={f.is_active}
          onChange={(v) => set({ is_active: v })}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} loadingLabel="Saving">
            Save coupon
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Discount codes, their rules and how often they've been used. */
function CouponsPage() {
  const toast = useToast();
  const query = useAdminQuery("coupons", fetchCoupons);
  const [editing, setEditing] = useState<CouponListRow | "new" | null>(null);
  const [removing, setRemoving] = useState<CouponListRow | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = () => void refreshAdmin("coupons", fetchCoupons);
  return (
    <AdminPage
      title="Coupons"
      description="The database checks every code at checkout: dates, minimum, uses and categories."
      actions={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={18} aria-hidden="true" />
          New coupon
        </Button>
      }
    >
      <QueryView query={query}>
        {(rows) => (
          <Table
            label="Coupons"
            head={["Code", "Discount", "Dates", "Used", "Status", ""]}
            empty={rows.length ? undefined : "No coupons yet."}
          >
            {rows.map((c) => {
              const used = c.coupon_redemptions.filter((r) => !r.released_at);
              const s = state(c);
              return (
                <tr key={c.id} className="hover:bg-cream/50">
                  <Td>
                    <span className="font-mono font-semibold text-ink">
                      {c.code}
                    </span>
                    {c.description && (
                      <span className="block type-caption text-soft-ink">
                        {c.description}
                      </span>
                    )}
                  </Td>
                  <Td>{describe(c)}</Td>
                  <Td className="whitespace-nowrap text-soft-ink">
                    {c.starts_at ? formatDate(c.starts_at) : "Now"} –{" "}
                    {c.expires_at ? formatDate(c.expires_at) : "no end"}
                  </Td>
                  <Td className="figures">
                    {used.length}
                    {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                    {used.length > 0 && (
                      <span className="block type-caption text-soft-ink">
                        {formatPrice(
                          used.reduce((s2, r) => s2 + r.discount, 0),
                        )}{" "}
                        off in total
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span
                      className={cx(
                        "inline-flex h-7 items-center rounded-full px-2.5 text-[13px] font-semibold",
                        s.cls,
                      )}
                    >
                      {s.word}
                    </span>
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => setEditing(c)}
                      aria-label={`Edit ${c.code}`}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => setRemoving(c)}
                      aria-label={`Delete ${c.code}`}
                    >
                      Delete
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </QueryView>
      {editing && (
        <CouponDialog
          coupon={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.show("Coupon saved.", "success");
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        title={`Delete ${removing?.code ?? ""}?`}
        confirmLabel="Delete coupon"
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(true);
          try {
            await deleteCoupon(removing.id);
            toast.show("Coupon deleted.", "success");
            reload();
          } catch (e) {
            toast.show(toShopError(e).message, "error");
          } finally {
            setBusy(false);
            setRemoving(null);
          }
        }}
      >
        Orders that used it keep their discount. To stop it but keep its
        history, turn it off instead.
      </ConfirmDialog>
    </AdminPage>
  );
}

export default CouponsPage;
