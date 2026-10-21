import { useState, type FormEvent } from "react";
import { useParams } from "react-router";
import {
  ExternalLink,
  Pencil,
  Phone,
  Printer,
  Trash2,
  Truck,
} from "lucide-react";
import AdminPage from "../components/AdminPage";
import Panel from "../components/Panel";
import QueryView from "../components/QueryView";
import { Button } from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import Notice from "../../components/ui/Notice";
import {
  PhoneField,
  TextAreaField,
  TextField,
} from "../../components/ui/Field";
import { useToast } from "../../components/ui/useToast";
import StatusChip from "../../components/order/StatusChip";
import AddressFields, {
  type AddressValue,
} from "../../components/checkout/AddressFields";
import LeafSprig from "../../components/brand/LeafSprig";
import { useAuth } from "../../features/auth/session";
import { refreshAdmin, forgetAdmin, useAdminQuery } from "../lib/data";
import { admin } from "../lib/paths";
import {
  addNote,
  deleteNote,
  fetchOrder,
  NEXT_STATUSES,
  updateCourier,
  updateDetails,
  updateStatus,
  type AdminOrder,
} from "../services/orders";
import {
  normalizePhone,
  orderStatusLabel,
  type OrderStatus,
} from "../../services/orders";
import { toShopError } from "../../lib/errors";
import { imageUrl } from "../../lib/images";
import { formatPrice } from "../../utils/formatPrice";
import { formatDateTime } from "../../utils/formatDate";

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm (called the customer)",
  packed: "Mark packed",
  handed_to_courier: "Hand to courier",
  out_for_delivery: "Out for delivery",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
  returned: "Mark returned",
};

const EDITABLE: OrderStatus[] = ["placed", "confirmed", "packed"];

function StatusDialog({
  order,
  status,
  onClose,
  onDone,
}: {
  order: AdminOrder;
  status: OrderStatus;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [courier, setCourier] = useState(order.courier_name ?? "");
  const [url, setUrl] = useState(order.tracking_url ?? "");
  const [code, setCode] = useState(order.tracking_code ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closing = status === "cancelled" || status === "returned";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (url && !/^https?:\/\//.test(url)) {
      setError("The tracking link should start with https://");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateStatus({
        orderId: order.id,
        status,
        note,
        courierName: courier,
        trackingUrl: url,
        trackingCode: code,
      });
      onDone();
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
      title={`${orderStatusLabel[status]}: ${order.order_number}`}
      bodyClassName="px-5 pb-6 md:px-7"
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {closing && (
          <Notice tone="warning">
            The items go back into stock
            {status === "cancelled" && order.coupon_code
              ? " and the coupon can be used again"
              : ""}
            . This can&rsquo;t be undone.
          </Notice>
        )}
        {status === "handed_to_courier" && (
          <>
            <TextField
              label="Courier"
              placeholder="Pathao, Steadfast, RedX…"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              maxLength={60}
            />
            <TextField
              label="Tracking code"
              optional
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={60}
            />
            <TextField
              label="Tracking link"
              optional
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              helper="Shown to the customer on Track order."
            />
          </>
        )}
        <TextAreaField
          label="Note"
          optional
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          helper={
            closing
              ? "For example why it was cancelled. The customer sees it on Track order."
              : "Kept in the order history."
          }
        />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Back
          </Button>
          <Button type="submit" loading={busy} loadingLabel="Saving">
            {ACTION_LABEL[status]}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DetailsDialog({
  order,
  onClose,
  onDone,
}: {
  order: AdminOrder;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(order.customer_name);
  const [phone, setPhone] = useState(order.phone);
  const [email, setEmail] = useState(order.email ?? "");
  const [place, setPlace] = useState<AddressValue>({
    division: order.division,
    district: order.district,
    area: order.area,
    addressLine: order.address_line,
  });
  const [note, setNote] = useState(order.delivery_note);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateDetails(order.id, {
        name,
        phone: normalizePhone(phone),
        email,
        division: place.division,
        district: place.district,
        area: place.area,
        address_line: place.addressLine,
        delivery_note: note,
      });
      onDone();
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
      title="Edit customer details"
      bodyClassName="px-5 pb-6 md:px-7"
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
        <PhoneField
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          helper="11 digits, starting with 01."
        />
        <TextField
          label="Email"
          optional
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AddressFields
          idPrefix="admin-order"
          value={place}
          onChange={setPlace}
        />
        <TextAreaField
          label="Delivery note"
          optional
          rows={2}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="type-caption text-soft-ink">
          Prices and delivery fee stay as ordered.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} loadingLabel="Saving">
            Save details
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CourierDialog({
  order,
  onClose,
  onDone,
}: {
  order: AdminOrder;
  onClose: () => void;
  onDone: () => void;
}) {
  const [courier, setCourier] = useState(order.courier_name ?? "");
  const [url, setUrl] = useState(order.tracking_url ?? "");
  const [code, setCode] = useState(order.tracking_code ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (url && !/^https?:\/\//.test(url)) {
      setError("The tracking link should start with https://");
      return;
    }
    setBusy(true);
    try {
      await updateCourier(order.id, courier, url, code);
      onDone();
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
      title="Courier and tracking"
      bodyClassName="px-5 pb-6 md:px-7"
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField
          label="Courier"
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          maxLength={60}
        />
        <TextField
          label="Tracking code"
          optional
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={60}
        />
        <TextField
          label="Tracking link"
          optional
          type="url"
          placeholder="https://"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end">
          <Button type="submit" loading={busy} loadingLabel="Saving">
            Save courier
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Notes({
  order,
  onChange,
}: {
  order: AdminOrder;
  onChange: () => void;
}) {
  const auth = useAuth();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const notes = [...order.order_notes].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || !auth.user) return;
    setBusy(true);
    try {
      await addNote(order.id, body, auth.user.id);
      setBody("");
      onChange();
    } catch (e) {
      toast.show(toShopError(e).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Team notes">
      <form onSubmit={add} className="space-y-3">
        <TextAreaField
          label="Add a note"
          rows={2}
          maxLength={1000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          helper="Only the shop team sees these."
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={busy}
          loadingLabel="Saving"
          disabled={!body.trim()}
        >
          Add note
        </Button>
      </form>
      {notes.length > 0 && (
        <ul className="mt-5 space-y-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex gap-3 rounded-control bg-cream px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="type-body whitespace-pre-wrap text-ink">
                  {n.body}
                </p>
                <p className="mt-1 type-caption text-soft-ink">
                  {formatDateTime(n.created_at)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Delete note"
                onClick={async () => {
                  await deleteNote(n.id).catch((e) =>
                    toast.show(toShopError(e).message, "error"),
                  );
                  onChange();
                }}
                className="grid size-11 shrink-0 place-items-center rounded-full text-soft-ink hover:bg-clay-blush hover:text-rosewood"
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function OrderView({
  order,
  reload,
}: {
  order: AdminOrder;
  reload: () => void;
}) {
  const toast = useToast();
  const [next, setNext] = useState<OrderStatus | null>(null);
  const [editing, setEditing] = useState<"details" | "courier" | null>(null);
  const steps = NEXT_STATUSES[order.status];
  const history = [...order.order_status_history].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const done = (message: string) => {
    setNext(null);
    setEditing(null);
    toast.show(message, "success");
    forgetAdmin("dashboard");
    reload();
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Panel title="Status" actions={<StatusChip status={order.status} />}>
          {steps.length ? (
            <div className="flex flex-wrap gap-2">
              {steps.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={
                    s === "cancelled" || s === "returned"
                      ? "secondary"
                      : "primary"
                  }
                  onClick={() => setNext(s)}
                >
                  {s === "handed_to_courier" && (
                    <Truck size={17} aria-hidden="true" />
                  )}
                  {ACTION_LABEL[s]}
                </Button>
              ))}
            </div>
          ) : (
            <p className="type-body text-soft-ink">This order is closed.</p>
          )}
          <ol className="mt-5 space-y-3 border-t border-sand-line pt-4">
            {history.map((h) => (
              <li key={h.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 size-2 shrink-0 rounded-full bg-rosewood"
                />
                <div>
                  <p className="type-body font-medium text-ink">
                    {orderStatusLabel[h.status as OrderStatus]}
                  </p>
                  <p className="type-caption text-soft-ink">
                    {formatDateTime(h.created_at)}
                  </p>
                  {h.note && (
                    <p className="mt-0.5 type-body text-ink">{h.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          title={`Items (${order.order_items.reduce((s, i) => s + i.quantity, 0)})`}
        >
          <ul className="divide-y divide-sand-line">
            {order.order_items.map((i) => {
              const src = imageUrl(i.image_path);
              return (
                <li key={i.id} className="flex gap-3 py-3 first:pt-0">
                  <span className="size-14 shrink-0 overflow-hidden rounded-control border border-sand-line bg-image-placeholder">
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        width={56}
                        height={56}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="grid size-full place-items-center text-sand-line">
                        <LeafSprig className="h-1/2" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">
                      {i.product_name}
                    </span>
                    <span className="block type-caption text-soft-ink">
                      {i.variant_title !== "Default"
                        ? `${i.variant_title} · `
                        : ""}
                      {i.sku} ·{" "}
                      <span className="figures">
                        {i.quantity} × {formatPrice(i.unit_price)}
                      </span>
                    </span>
                  </span>
                  <span className="figures font-semibold">
                    {formatPrice(i.line_total)}
                  </span>
                </li>
              );
            })}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-sand-line pt-4 type-body">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="figures">{formatPrice(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-success">
                <dt>
                  Discount {order.coupon_code && `(${order.coupon_code})`}
                </dt>
                <dd className="figures">−{formatPrice(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Delivery ({order.shipping_zone_name})</dt>
              <dd className="figures">
                {order.delivery_fee ? formatPrice(order.delivery_fee) : "Free"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-sand-line pt-2 font-bold">
              <dt>
                Total · Cash on Delivery (
                {order.payment_status === "paid" ? "paid" : "to collect"})
              </dt>
              <dd className="figures">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel
          title="Customer"
          actions={
            EDITABLE.includes(order.status) && (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => setEditing("details")}
              >
                <Pencil size={16} aria-hidden="true" />
                Edit
              </Button>
            )
          }
        >
          <p className="font-semibold text-ink">{order.customer_name}</p>
          <a
            href={`tel:+88${order.phone}`}
            className="mt-1 inline-flex min-h-11 items-center gap-2 figures font-semibold text-rosewood hover:underline"
          >
            <Phone size={17} aria-hidden="true" />
            {order.phone}
          </a>
          {order.email && (
            <p className="type-body text-soft-ink">{order.email}</p>
          )}
          <p className="mt-3 type-body text-ink">
            {order.address_line}
            <br />
            {order.area}, {order.district}, {order.division}
          </p>
          {order.delivery_note && (
            <p className="mt-2 rounded-control bg-cream px-3 py-2 type-body text-ink">
              Note: {order.delivery_note}
            </p>
          )}
          <p className="mt-3 type-caption text-soft-ink">
            {order.user_id ? "Has an account" : "Guest checkout"} ·{" "}
            {order.shipping_zone_name}, {order.delivery_min_days}–
            {order.delivery_max_days} days
          </p>
        </Panel>

        <Panel
          title="Courier"
          actions={
            order.status !== "placed" &&
            order.status !== "cancelled" && (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => setEditing("courier")}
              >
                <Pencil size={16} aria-hidden="true" />
                Edit
              </Button>
            )
          }
        >
          {order.courier_name || order.tracking_code ? (
            <div className="type-body text-ink">
              <p className="font-semibold">{order.courier_name}</p>
              {order.tracking_code && (
                <p className="figures">Code {order.tracking_code}</p>
              )}
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-11 items-center gap-1.5 link"
                >
                  Tracking page <ExternalLink size={15} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>
          ) : (
            <p className="type-body text-soft-ink">
              Added when the parcel goes to the courier.
            </p>
          )}
        </Panel>

        <Notes order={order} onChange={reload} />
      </div>

      {next && (
        <StatusDialog
          order={order}
          status={next}
          onClose={() => setNext(null)}
          onDone={() =>
            done(`${order.order_number}: ${orderStatusLabel[next]}.`)
          }
        />
      )}
      {editing === "details" && (
        <DetailsDialog
          order={order}
          onClose={() => setEditing(null)}
          onDone={() => done("Customer details saved.")}
        />
      )}
      {editing === "courier" && (
        <CourierDialog
          order={order}
          onClose={() => setEditing(null)}
          onDone={() => done("Courier saved.")}
        />
      )}
    </div>
  );
}

/** One order: move it along, edit details, courier, notes, print. */
function OrderDetailPage() {
  const { id = "" } = useParams();
  const key = `order:${id}`;
  const fetcher = () => fetchOrder(id);
  const query = useAdminQuery(key, fetcher, 10_000);
  const order = query.data;
  const reload = () => {
    forgetAdmin("orders");
    void refreshAdmin(key, fetcher);
  };
  return (
    <AdminPage
      title={order ? `Order ${order.order_number}` : "Order"}
      description={
        order ? `Placed ${formatDateTime(order.created_at)}` : undefined
      }
      back={{ to: admin.orders, label: "All orders" }}
      actions={
        order && (
          <>
            <a
              href={admin.print(order.id, "invoice")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-control border-[1.5px] border-rosewood bg-paper px-4 type-button text-rosewood hover:bg-clay-blush"
            >
              <Printer size={17} aria-hidden="true" />
              Invoice (A4)
            </a>
            <a
              href={admin.print(order.id, "label")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-control border-[1.5px] border-rosewood bg-paper px-4 type-button text-rosewood hover:bg-clay-blush"
            >
              <Printer size={17} aria-hidden="true" />
              Label (A6)
            </a>
          </>
        )
      }
    >
      <QueryView query={query}>
        {(o) =>
          o ? (
            <OrderView order={o} reload={reload} />
          ) : (
            <Notice tone="info">This order doesn&rsquo;t exist.</Notice>
          )
        }
      </QueryView>
    </AdminPage>
  );
}

export default OrderDetailPage;
