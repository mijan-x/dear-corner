import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { PackageSearch } from "lucide-react";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import Notice from "../components/ui/Notice";
import { PhoneField, TextField } from "../components/ui/Field";
import { errorCopy } from "../components/ui/emptyStateCopy";
import OrderDetails from "../components/order/OrderDetails";
import Sparkle from "../components/brand/Sparkle";
import { useAuth } from "../features/auth/session";
import { phoneError } from "../features/checkout/validate";
import { usePageMeta } from "../hooks/usePageMeta";
import { toShopError } from "../lib/errors";
import { routes } from "../lib/routes";
import {
  normalizeOrderNumber,
  normalizePhone,
  trackOrder,
  type OrderView,
} from "../services/orders";

const ORDER_NUMBER = /^DC-\d{4,}$/;

/**
 * Track order (brand doc page 9): order number and phone, then the status
 * timeline. The lookup is a database function that returns only the order
 * matching both (and hides the street address); orders can't be listed.
 */
function TrackOrderPage() {
  usePageMeta({
    title: "Track your order",
    description:
      "See where your Dear Corner order is with your order number and phone.",
  });
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const [number, setNumber] = useState(params.get("order") ?? "");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ number?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    order: OrderView;
    proof: { orderNumber: string; phone: string };
  } | null>(null);

  const lookup = async (orderNumber: string, mobile: string, focus = true) => {
    setBusy(true);
    setMessage(null);
    try {
      const order = await trackOrder(orderNumber, mobile);
      if (!order) {
        setResult(null);
        setMessage(errorCopy.orderLookup);
        return;
      }
      setResult({ order, proof: { orderNumber, phone: mobile } });
      if (focus) {
        window.setTimeout(
          () => document.getElementById("track-result")?.focus(),
          50,
        );
      }
    } catch (e) {
      setMessage(toShopError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const orderNumber = normalizeOrderNumber(number);
    const found = {
      number: ORDER_NUMBER.test(orderNumber)
        ? undefined
        : "Enter your order number, like DC-10482.",
      phone: phoneError(phone),
    };
    setErrors(found);
    if (found.number || found.phone) return;
    setNumber(orderNumber);
    setParams({ order: orderNumber }, { replace: true });
    void lookup(orderNumber, normalizePhone(phone));
  };

  return (
    <div className="container-page pt-4 pb-20 md:pt-6">
      <Breadcrumbs
        items={[{ label: "Home", to: routes.home }, { label: "Track order" }]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div className="max-w-md">
          <p className="flex items-center gap-2 type-eyebrow text-terracotta-deep">
            <Sparkle size={12} className="text-rosewood" />
            Where&rsquo;s my parcel?
          </p>
          <h1 className="mt-3 type-h1 text-ink">Track your order</h1>
          <p className="mt-3 type-body-lg text-soft-ink">
            Enter the order number from your confirmation and the phone number
            you ordered with.
          </p>
          <form onSubmit={submit} noValidate className="mt-7 space-y-5">
            <TextField
              id="track-number"
              label="Order number"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="DC-10482"
              maxLength={20}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              error={errors.number}
            />
            <PhoneField
              id="track-phone"
              helper="The number you gave at checkout."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
            />
            {message && <Notice tone="error">{message}</Notice>}
            <Button
              type="submit"
              fullWidth
              loading={busy}
              loadingLabel="Looking up your order"
            >
              Track order
            </Button>
          </form>
          {auth.status === "signed-in" && (
            <p className="mt-5 type-body text-soft-ink">
              Signed in?{" "}
              <Link to={routes.account} className="link">
                See all your orders
              </Link>
              .
            </p>
          )}
        </div>
        <div
          aria-hidden="true"
          className="relative hidden aspect-[5/4] overflow-hidden corner-mask-lg bg-clay-blush lg:grid lg:place-items-center"
        >
          <div className="absolute -top-16 -left-10 size-80 glow" />
          <PackageSearch
            size={120}
            strokeWidth={1}
            className="relative text-rosewood/80"
          />
        </div>
      </div>

      {result && (
        <div
          id="track-result"
          tabIndex={-1}
          className="mt-12 scroll-mt-24 border-t border-sand-line pt-10 focus:outline-none"
        >
          <OrderDetails
            order={result.order}
            proof={result.proof}
            headingLevel={2}
            onReviewed={() =>
              void lookup(result.proof.orderNumber, result.proof.phone, false)
            }
          />
        </div>
      )}
    </div>
  );
}

export default TrackOrderPage;
