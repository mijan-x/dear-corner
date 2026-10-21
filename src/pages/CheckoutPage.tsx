import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Banknote, Lock, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { Button, ButtonLink } from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Notice from "../components/ui/Notice";
import { Skeleton } from "../components/ui/Skeleton";
import { Checkbox, RadioCard } from "../components/ui/Choice";
import { PhoneField, TextAreaField, TextField } from "../components/ui/Field";
import { emptyCopy } from "../components/ui/emptyStateCopy";
import CartLines from "../components/cart/CartLines";
import CartTotals from "../components/cart/CartTotals";
import CouponField from "../components/cart/CouponField";
import AddressFields, {
  type AddressErrors,
  type AddressValue,
} from "../components/checkout/AddressFields";
import { useAuth } from "../features/auth/session";
import { cartStore, useCartLines } from "../features/cart/cartStore";
import { rememberOrder } from "../features/checkout/lastOrder";
import {
  addressErrors,
  emailError,
  focusFirstError,
  nameError,
  phoneError,
} from "../features/checkout/validate";
import { usePageMeta } from "../hooks/usePageMeta";
import { toShopError } from "../lib/errors";
import { routes } from "../lib/routes";
import {
  forgetMyOrders,
  saveAddress,
  useAddresses,
  useProfile,
  type Address,
} from "../services/account";
import { cartItems, couponStore, useQuote } from "../services/cart";
import { dayRange } from "../services/shipping";
import { isValidPhone, normalizePhone, placeOrder } from "../services/orders";
import { formatPrice } from "../utils/formatPrice";

const EMPTY_ADDRESS: AddressValue = {
  division: "",
  district: "",
  area: "",
  addressLine: "",
};

type Errors = AddressErrors & { name?: string; phone?: string; email?: string };

const FIELD_ORDER = [
  "checkout-name",
  "checkout-phone",
  "checkout-email",
  "checkout-division",
  "checkout-district",
  "checkout-area",
  "checkout-address",
];

const FIELD_FOR_CODE: Record<string, keyof Errors> = {
  DC_MISSING_NAME: "name",
  DC_INVALID_PHONE: "phone",
  DC_INVALID_EMAIL: "email",
  DC_INVALID_AREA: "area",
  DC_MISSING_ADDRESS: "addressLine",
  DC_TOO_LONG: "addressLine",
};

function Section({
  step,
  title,
  aside,
  children,
}: {
  step: number;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const id = `checkout-step-${step}`;
  return (
    <section
      aria-labelledby={id}
      className="rounded-card border border-sand-line bg-paper p-5 md:p-7"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={id} className="flex items-center gap-3 type-h3 text-ink">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-clay-blush font-sans text-[15px] font-bold text-rosewood"
          >
            {step}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function addressSummary(a: Address) {
  return `${a.addressLine}, ${a.area}, ${a.district}`;
}

/**
 * One-page checkout (brand doc section 6). Guest checkout by default; a
 * signed-in customer can pick a saved address. Cash on Delivery. The
 * database works out every price again when the order is placed; if the
 * total moved, nothing is placed and the new total is shown.
 */
function CheckoutPage() {
  usePageMeta({ title: "Checkout", noindex: true });
  const navigate = useNavigate();
  const auth = useAuth();
  const user = auth.user;
  const lines = useCartLines();
  const coupon = couponStore.useStore();
  const { data: addresses } = useAddresses(user?.id);
  const { data: profile } = useProfile(user?.id);

  // Inputs start empty and fall back to the account's details until edited.
  const [nameInput, setName] = useState<string | null>(null);
  const [phoneInput, setPhone] = useState<string | null>(null);
  const [emailInput, setEmail] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [keepAddress, setKeepAddress] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<ReactNode>(null);
  const [busy, setBusy] = useState(false);

  // The confirmation page is ready the moment the order is placed.
  useEffect(() => {
    void import("./OrderConfirmedPage");
  }, []);

  const saved = addresses ?? [];
  const pickedId =
    picked ?? saved.find((a) => a.isDefault)?.id ?? saved[0]?.id ?? "new";
  const savedAddress = saved.find((a) => a.id === pickedId) ?? null;

  const name = savedAddress
    ? savedAddress.fullName
    : (nameInput ?? profile?.fullName ?? "");
  const phone = savedAddress
    ? savedAddress.phone
    : (phoneInput ?? profile?.phone ?? "");
  const email = emailInput ?? user?.email ?? "";
  const place: AddressValue = savedAddress
    ? {
        division: savedAddress.division,
        district: savedAddress.district,
        area: savedAddress.area,
        addressLine: savedAddress.addressLine,
      }
    : address;

  const { quote, updating, refetch } = useQuote(lines, {
    coupon: coupon || undefined,
    district: place.district && place.area ? place.district : undefined,
    area: place.district && place.area ? place.area : undefined,
    phone: isValidPhone(phone) ? normalizePhone(phone) : undefined,
  });

  const problems = quote?.lines.some((line) => line.status !== "ok");
  const knownTotal = quote?.delivery.known ? quote.total : null;
  const placeLabel =
    knownTotal !== null
      ? `Place order · ${formatPrice(knownTotal)}`
      : "Place order";

  if (lines.length === 0 && !busy) {
    return (
      <div className="container-page pt-4 pb-16 md:pt-6">
        <Breadcrumbs
          items={[{ label: "Home", to: routes.home }, { label: "Checkout" }]}
        />
        <EmptyState
          headingLevel={1}
          title={emptyCopy.cart.title}
          icon={<ShoppingBag size={40} strokeWidth={1.5} aria-hidden="true" />}
          action={
            <ButtonLink to={routes.newArrivals}>
              {emptyCopy.cart.action}
            </ButtonLink>
          }
          className="py-16"
        />
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const found: Errors = savedAddress
      ? {}
      : {
          name: nameError(name),
          phone: phoneError(phone),
          ...addressErrors(address),
        };
    found.email = emailError(email);
    const clean = Object.fromEntries(
      Object.entries(found).filter(([, v]) => v),
    ) as Errors;
    setErrors(clean);
    setFormError(null);
    if (Object.keys(clean).length) {
      focusFirstError(FIELD_ORDER);
      return;
    }
    if (!quote || updating) {
      setFormError(
        "We're still working out your total. Try again in a moment.",
      );
      return;
    }
    if (problems) {
      setFormError(
        <>
          Some items in your cart changed.{" "}
          <Link to={routes.cart} className="font-semibold underline">
            Check your cart
          </Link>{" "}
          before you order.
        </>,
      );
      return;
    }

    setBusy(true);
    const items = cartItems(lines);
    try {
      const order = await placeOrder({
        items,
        customer: {
          name: name.trim(),
          phone: normalizePhone(phone),
          email: email.trim() || undefined,
          division: place.division,
          district: place.district,
          area: place.area,
          address_line: place.addressLine.trim(),
          delivery_note: note.trim() || undefined,
        },
        coupon:
          quote.coupon?.status === "applied" ? quote.coupon.code : undefined,
        expectedTotal: quote.total,
      });
      if (user && !savedAddress && keepAddress) {
        // Best effort: the order is placed either way.
        void saveAddress(user.id, {
          label: "Home",
          fullName: name,
          phone: normalizePhone(phone),
          ...address,
        }).catch(() => {});
      }
      if (user) forgetMyOrders(user.id);
      rememberOrder(order);
      couponStore.set("");
      navigate(routes.orderConfirmed(order.orderNumber), { replace: true });
      cartStore.forget(items.map((item) => item.variant_id));
    } catch (error) {
      const e = toShopError(error);
      const field = FIELD_FOR_CODE[e.code];
      if (field && !savedAddress) {
        setErrors({ [field]: e.message });
        focusFirstError(FIELD_ORDER);
      } else if (e.code === "DC_PRICE_CHANGED") {
        refetch();
        setFormError(
          "Prices changed since you opened checkout, so we've updated your total. Check it and place your order again.",
        );
      } else if (
        e.code === "DC_ITEMS_UNAVAILABLE" ||
        e.code === "DC_COUPON_INVALID"
      ) {
        refetch();
        setFormError(e.message);
      } else {
        setFormError(e.message);
      }
      setBusy(false);
    }
  };

  const delivery = quote?.delivery;

  return (
    <>
      <div className="container-page pt-4 pb-28 md:pt-6 lg:pb-24">
        <Breadcrumbs
          items={[
            { label: "Home", to: routes.home },
            { label: "Cart", to: routes.cart },
            { label: "Checkout" },
          ]}
        />
        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h1 className="type-h1 text-ink">Checkout</h1>
          {auth.status === "guest" && (
            <p className="type-body text-soft-ink">
              No account needed.{" "}
              <Link to={routes.signInNext(routes.checkout)} className="link">
                Sign in
              </Link>{" "}
              to use saved addresses.
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          {/* The summary (with its own coupon form) sits beside the form,
              not inside it; the Place order buttons point at the form. */}
          <form
            id="checkout-form"
            onSubmit={submit}
            noValidate
            className="min-w-0 space-y-6"
          >
            {saved.length > 0 && (
              <Section
                step={1}
                title="Deliver to"
                aside={
                  <Link
                    to={routes.addresses}
                    className="hidden type-nav link sm:inline"
                  >
                    Manage addresses
                  </Link>
                }
              >
                <fieldset>
                  <legend className="sr-only">Choose a delivery address</legend>
                  <div className="grid gap-3">
                    {saved.map((a) => (
                      <RadioCard
                        key={a.id}
                        name="saved-address"
                        value={a.id}
                        checked={pickedId === a.id}
                        onChange={() => setPicked(a.id)}
                        label={
                          <>
                            {a.label}
                            {a.isDefault && (
                              <span className="font-normal text-soft-ink">
                                {" "}
                                · Default
                              </span>
                            )}
                          </>
                        }
                        description={
                          <>
                            {a.fullName},{" "}
                            <span className="figures">{a.phone}</span>
                            <br />
                            {addressSummary(a)}
                          </>
                        }
                      />
                    ))}
                    <RadioCard
                      name="saved-address"
                      value="new"
                      checked={pickedId === "new"}
                      onChange={() => setPicked("new")}
                      label="Use a new address"
                    />
                  </div>
                </fieldset>
              </Section>
            )}

            {!savedAddress && (
              <>
                <Section step={saved.length ? 2 : 1} title="Your details">
                  <div className="grid gap-5 md:grid-cols-2">
                    <TextField
                      id="checkout-name"
                      label="Full name"
                      autoComplete="name"
                      maxLength={120}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      error={errors.name}
                      className="md:col-span-2"
                    />
                    <PhoneField
                      id="checkout-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      error={errors.phone}
                      className="md:col-span-2"
                    />
                  </div>
                </Section>
                <Section step={saved.length ? 3 : 2} title="Delivery address">
                  <AddressFields
                    idPrefix="checkout"
                    value={address}
                    onChange={setAddress}
                    errors={errors}
                  />
                  {user && (
                    <Checkbox
                      className="mt-3"
                      label="Save this address for next time"
                      checked={keepAddress}
                      onChange={(e) => setKeepAddress(e.target.checked)}
                    />
                  )}
                </Section>
              </>
            )}

            <Section
              step={saved.length ? (savedAddress ? 2 : 4) : 3}
              title="Delivery and payment"
            >
              <div className="space-y-5">
                <div className="flex gap-3 rounded-control bg-cream px-4 py-3.5">
                  <Truck
                    size={22}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-rosewood"
                  />
                  <div className="min-w-0 flex-1 type-body text-ink">
                    {delivery?.known && delivery.zoneName ? (
                      <>
                        <p className="font-semibold">
                          {delivery.zoneName}
                          {delivery.minDays !== null &&
                            delivery.maxDays !== null && (
                              <>
                                {" "}
                                ·{" "}
                                {dayRange({
                                  minDays: delivery.minDays,
                                  maxDays: delivery.maxDays,
                                })}
                              </>
                            )}
                        </p>
                        <p className="text-soft-ink">
                          {delivery.fee === 0
                            ? "Free delivery on this order."
                            : `Delivery ${formatPrice(delivery.fee ?? 0)}.`}{" "}
                          We&rsquo;ll call to confirm before we send it.
                        </p>
                      </>
                    ) : (
                      <p className="text-soft-ink">
                        Choose your area to see the delivery fee and time.
                      </p>
                    )}
                  </div>
                </div>

                <fieldset>
                  <legend className="mb-2 type-label text-ink">Payment</legend>
                  <RadioCard
                    name="payment"
                    value="cash_on_delivery"
                    checked
                    readOnly
                    icon={<Banknote size={22} />}
                    label="Cash on Delivery"
                    description="Pay in cash when your parcel arrives. Check it at the door first; if it's not right, hand it back and pay only the delivery charge."
                  />
                </fieldset>

                <TextField
                  id="checkout-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  label="Email"
                  optional
                  helper="For your order details. We never share it."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                />
                <TextAreaField
                  id="checkout-note"
                  label="Delivery note"
                  optional
                  rows={3}
                  maxLength={300}
                  placeholder="For example: call before you come, leave with the guard"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </Section>
          </form>

          <aside
            aria-labelledby="order-summary-title"
            className="lg:sticky lg:top-[84px] lg:self-start"
          >
            <div className="space-y-5 rounded-card border border-sand-line bg-paper p-5 md:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="order-summary-title" className="type-h3 text-ink">
                  Your order
                </h2>
                <Link to={routes.cart} className="type-nav link">
                  Edit cart
                </Link>
              </div>
              <div className="-my-2 max-h-[360px] overflow-y-auto overscroll-contain pr-1">
                <CartLines lines={lines} quote={quote} />
              </div>
              <CouponField quote={quote} checking={updating} />
              {quote ? (
                <CartTotals quote={quote} />
              ) : (
                <div aria-hidden="true" className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-6 w-full" />
                </div>
              )}
              {formError && <Notice tone="error">{formError}</Notice>}
              <div className="hidden lg:block">
                <Button
                  type="submit"
                  form="checkout-form"
                  fullWidth
                  loading={busy}
                  loadingLabel="Placing your order"
                  disabled={!quote}
                >
                  {placeLabel}
                </Button>
              </div>
              <ul className="space-y-2 type-caption text-soft-ink">
                <li className="flex items-center gap-2">
                  <ShieldCheck
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 text-success"
                  />
                  Check your parcel at the door before you pay.
                </li>
                <li className="flex items-center gap-2">
                  <Lock size={16} aria-hidden="true" className="shrink-0" />
                  Prices and the total are checked again when you order.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Phones and tablets: total and Place order always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        <div className="container-page flex h-[72px] items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="type-caption text-soft-ink">
              {knownTotal !== null ? "Total" : "Before delivery"}
            </p>
            <p className="figures text-[18px] font-bold text-ink">
              {quote ? formatPrice(quote.total) : "…"}
            </p>
          </div>
          <div className="w-[58%] max-w-xs">
            <Button
              type="submit"
              form="checkout-form"
              fullWidth
              loading={busy}
              loadingLabel="Placing your order"
              disabled={!quote}
            >
              Place order
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default CheckoutPage;
