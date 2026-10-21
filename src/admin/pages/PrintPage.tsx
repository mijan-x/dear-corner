import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import Logo from "../../components/brand/Logo";
import PageLoader from "../../components/system/PageLoader";
import { useAdminQuery } from "../lib/data";
import { fetchOrder, type AdminOrder } from "../services/orders";
import { useShopSettings } from "../../services/settings";
import { formatPrice } from "../../utils/formatPrice";
import { formatDate } from "../../utils/formatDate";

function Invoice({
  order,
  shop,
}: {
  order: AdminOrder;
  shop: { phone: string; address: string; email: string };
}) {
  return (
    <div className="print-a4 mx-auto bg-white p-[14mm] text-[12pt] leading-snug text-ink">
      <header className="flex items-start justify-between border-b border-sand-line pb-5">
        <Logo variant="horizontal-tagline" width={290} />
        <div className="text-right text-[10pt] text-soft-ink">
          {shop.address && <p>{shop.address}</p>}
          {shop.phone && <p>{shop.phone}</p>}
          {shop.email && <p>{shop.email}</p>}
        </div>
      </header>
      <div className="mt-6 flex justify-between gap-8">
        <div>
          <h1 className="font-display text-[22pt] font-semibold">Invoice</h1>
          <p className="figures">Order {order.order_number}</p>
          <p>Date: {formatDate(order.created_at)}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{order.customer_name}</p>
          <p className="figures">{order.phone}</p>
          <p>{order.address_line}</p>
          <p>
            {order.area}, {order.district}, {order.division}
          </p>
        </div>
      </div>
      <table className="mt-8 w-full border-collapse text-[11pt]">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="py-2">Item</th>
            <th className="py-2">SKU</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items.map((i) => (
            <tr key={i.id} className="border-b border-sand-line">
              <td className="py-2">
                {i.product_name}
                {i.variant_title !== "Default" && (
                  <span className="text-soft-ink"> · {i.variant_title}</span>
                )}
              </td>
              <td className="py-2 text-soft-ink">{i.sku}</td>
              <td className="py-2 text-right figures">{i.quantity}</td>
              <td className="py-2 text-right figures">
                {formatPrice(i.unit_price)}
              </td>
              <td className="py-2 text-right figures">
                {formatPrice(i.line_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-4 ml-auto w-[70mm] space-y-1 text-[11pt]">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="figures">{formatPrice(order.subtotal)}</dd>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between">
            <dt>
              Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}
            </dt>
            <dd className="figures">−{formatPrice(order.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd className="figures">
            {order.delivery_fee ? formatPrice(order.delivery_fee) : "Free"}
          </dd>
        </div>
        <div className="flex justify-between border-t-2 border-ink pt-1 text-[13pt] font-bold">
          <dt>Total</dt>
          <dd className="figures">{formatPrice(order.total)}</dd>
        </div>
      </dl>
      <p className="mt-6 text-[11pt]">
        Payment: Cash on Delivery (
        {order.payment_status === "paid"
          ? "paid"
          : `collect ${formatPrice(order.total)}`}
        ).
      </p>
      <p className="mt-10 text-[10pt] text-soft-ink">
        Please check your parcel when it arrives. If it&rsquo;s not right, hand
        it back to the rider and pay only the delivery charge. Thank you for
        shopping with Dear Corner.
      </p>
    </div>
  );
}

function Label({
  order,
  shop,
}: {
  order: AdminOrder;
  shop: { phone: string };
}) {
  const items = order.order_items.reduce((s, i) => s + i.quantity, 0);
  return (
    <div className="print-a6 mx-auto flex flex-col bg-white p-[6mm] text-[10pt] leading-snug text-ink">
      <div className="flex items-center justify-between border-b border-ink pb-2">
        <Logo variant="horizontal" width={180} />
        <span className="figures text-[12pt] font-bold">
          {order.order_number}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-[8pt] tracking-wide text-soft-ink uppercase">
          Deliver to
        </p>
        <p className="text-[14pt] font-bold">{order.customer_name}</p>
        <p className="figures text-[14pt] font-bold">{order.phone}</p>
        <p className="mt-1 text-[11pt]">{order.address_line}</p>
        <p className="text-[11pt] font-semibold">
          {order.area}, {order.district}
        </p>
        {order.delivery_note && (
          <p className="mt-1 text-[9pt]">Note: {order.delivery_note}</p>
        )}
      </div>
      <div className="mt-auto border-t border-ink pt-2">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[8pt] tracking-wide text-soft-ink uppercase">
              Cash to collect
            </p>
            <p className="figures text-[18pt] font-bold">
              {order.payment_status === "paid"
                ? "Paid"
                : formatPrice(order.total)}
            </p>
          </div>
          <p className="text-right text-[9pt]">
            {items} {items === 1 ? "item" : "items"}
            {order.courier_name && (
              <>
                <br />
                {order.courier_name} {order.tracking_code}
              </>
            )}
          </p>
        </div>
        {shop.phone && (
          <p className="mt-1 text-[8pt] text-soft-ink">
            From Dear Corner · {shop.phone}
          </p>
        )}
      </div>
    </div>
  );
}

/** Printable invoice (A4) or parcel label (A6). Opens the print dialog. */
function PrintPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const doc = params.get("doc") === "label" ? "label" : "invoice";
  const { data: order } = useAdminQuery(
    `order:${id}`,
    () => fetchOrder(id),
    10_000,
  );
  const { settings } = useShopSettings();
  const shop = {
    phone: settings.contact_phone,
    address: settings.contact_address,
    email: settings.contact_email,
  };

  useEffect(() => {
    if (!order) return;
    document.title = `${doc === "label" ? "Label" : "Invoice"} ${order.order_number}`;
    const timer = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timer);
  }, [order, doc]);

  if (!order) return <PageLoader />;
  return (
    <div className="min-h-dvh bg-soft-sand py-6 print:bg-white print:p-0">
      <style>{`@page { size: ${doc === "label" ? "A6" : "A4"}; margin: 0; }`}</style>
      {doc === "label" ? (
        <Label order={order} shop={shop} />
      ) : (
        <Invoice order={order} shop={shop} />
      )}
    </div>
  );
}

export default PrintPage;
