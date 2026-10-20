import { useEffect, useState } from "react";
import { Banknote, SlidersHorizontal, Truck } from "lucide-react";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import {
  PhoneField,
  SelectField,
  TextAreaField,
  TextField,
} from "../../components/ui/Field";
import { Checkbox, RadioCard } from "../../components/ui/Choice";
import QuantityStepper from "../../components/ui/QuantityStepper";
import OptionPicker from "../../components/ui/OptionPicker";
import { FilterChip, ToggleChip } from "../../components/ui/Chip";
import FreeDeliveryProgress from "../../components/ui/FreeDeliveryProgress";
import LoadMore from "../../components/ui/LoadMore";
import Price from "../../components/ui/Price";
import { useToast } from "../../components/ui/useToast";
import { errorCopy } from "../../components/ui/emptyStateCopy";
import { cartStore } from "../../features/cart/cartStore";
import geo from "../../data/bd-geo.json";

/** Interactive pieces of the styleguide (state lives here, not in the shop). */

export function ButtonStatesDemo() {
  const [state, setState] = useState<"idle" | "loading" | "added">("idle");
  useEffect(() => {
    if (state === "loading") {
      const t = window.setTimeout(() => setState("added"), 900);
      return () => window.clearTimeout(t);
    }
    if (state === "added") {
      const t = window.setTimeout(() => setState("idle"), 1500);
      return () => window.clearTimeout(t);
    }
  }, [state]);
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        loading={state === "loading"}
        loadingLabel="Adding to cart"
        successLabel={state === "added" ? "Added" : undefined}
        onClick={() => setState("loading")}
        className="min-w-44"
      >
        Add to cart
      </Button>
      <p className="type-helper">
        Click: spinner (width stays), then green &ldquo;Added&rdquo; for 1.5s.
      </p>
    </div>
  );
}

export function FormDemo() {
  const [phone, setPhone] = useState("0171234");
  const [division, setDivision] = useState("");
  const [qty, setQty] = useState(1);
  const [delivery, setDelivery] = useState("inside");
  const divisions = geo.divisions.map((d) => d.name);
  return (
    <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
      <TextField
        label="Full name"
        autoComplete="name"
        defaultValue="Rima Akter"
      />
      <PhoneField
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        error={/^01[3-9]\d{8}$/.test(phone) ? undefined : errorCopy.phone}
      />
      <TextField
        label="Email"
        type="email"
        optional
        helper="For your order confirmation. We never share it."
        placeholder="name@example.com"
      />
      <SelectField
        label="Division"
        placeholder="Choose your division"
        value={division}
        onChange={(event) => setDivision(event.target.value)}
      >
        {divisions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </SelectField>
      <TextAreaField
        label="Delivery note"
        optional
        rows={3}
        placeholder="Landmark, a good time to call…"
        className="md:col-span-2"
      />
      <TextField label="Coupon code" disabled defaultValue="Disabled field" />
      <div className="flex flex-col gap-1.5">
        <span className="type-label">Quantity</span>
        <QuantityStepper
          value={qty}
          onChange={setQty}
          itemLabel="Grid notebook A5"
        />
      </div>
      <fieldset className="flex flex-col gap-3 md:col-span-2">
        <legend className="mb-1.5 type-label">Delivery</legend>
        <RadioCard
          name="sg-delivery"
          value="inside"
          checked={delivery === "inside"}
          onChange={() => setDelivery("inside")}
          icon={<Truck size={20} />}
          label="Inside Dhaka"
          description="Arrives in 2–3 days"
          aside="৳80"
        />
        <RadioCard
          name="sg-delivery"
          value="outside"
          checked={delivery === "outside"}
          onChange={() => setDelivery("outside")}
          icon={<Truck size={20} />}
          label="Outside Dhaka"
          description="Arrives in 3–5 days"
          aside="৳130"
        />
        <RadioCard
          name="sg-payment"
          value="cod"
          defaultChecked
          icon={<Banknote size={20} />}
          label="Cash on Delivery"
          description="Pay the rider when your parcel arrives."
        />
      </fieldset>
      <div className="md:col-span-2">
        <Checkbox label="Save this address for next time" defaultChecked />
        <Checkbox
          label="Email me when new pieces arrive"
          description="One short email, no more than twice a month."
        />
        <Checkbox label="Disabled option" disabled />
      </div>
    </div>
  );
}

export function OptionDemo() {
  const [color, setColor] = useState("ivory");
  const [size, setSize] = useState("a5");
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <OptionPicker
        label="Color"
        kind="swatch"
        value={color}
        onChange={setColor}
        choices={[
          { id: "ivory", value: "Ivory", hex: "#F4EEE3" },
          { id: "blush", value: "Blush", hex: "#E8C4B8" },
          { id: "sage", value: "Sage", hex: "#9CAF88", unavailable: true },
          { id: "rosewood", value: "Rosewood", hex: "#784B4E" },
        ]}
      />
      <OptionPicker
        label="Size"
        kind="button"
        value={size}
        onChange={setSize}
        choices={[
          { id: "a6", value: "A6" },
          { id: "a5", value: "A5" },
          { id: "a4", value: "A4", unavailable: true },
          { id: "b5", value: "5 x 7 in" },
        ]}
      />
    </div>
  );
}

export function ChipDemo() {
  const [inStock, setInStock] = useState(true);
  const [onSale, setOnSale] = useState(false);
  const [filters, setFilters] = useState(["Sage", "Under ৳1,000", "In stock"]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ToggleChip selected={inStock} onClick={() => setInStock(!inStock)}>
          In stock
        </ToggleChip>
        <ToggleChip selected={onSale} onClick={() => setOnSale(!onSale)}>
          On sale
        </ToggleChip>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <FilterChip
            key={filter}
            removeLabel={`Remove filter: ${filter}`}
            onRemove={() => setFilters(filters.filter((f) => f !== filter))}
          >
            {filter}
          </FilterChip>
        ))}
        {filters.length > 0 ? (
          <button
            type="button"
            onClick={() => setFilters([])}
            className="min-h-11 type-nav link"
          >
            Clear all
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setFilters(["Sage", "Under ৳1,000", "In stock"])}
            className="min-h-11 type-nav link"
          >
            Bring them back
          </button>
        )}
      </div>
    </div>
  );
}

export function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast.show("Address saved.")}
      >
        Success toast
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast.show(errorCopy.connection, "error")}
      >
        Error toast
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast.show("Prices were updated in your cart.", "info")}
      >
        Info toast
      </Button>
    </div>
  );
}

export function LoadMoreDemo() {
  const [shown, setShown] = useState(24);
  const [loading, setLoading] = useState(false);
  return (
    <LoadMore
      shown={shown}
      total={60}
      loading={loading}
      onLoadMore={() => {
        setLoading(true);
        window.setTimeout(() => {
          setShown((n) => Math.min(60, n + 24));
          setLoading(false);
        }, 700);
      }}
    />
  );
}

export function FreeDeliveryDemo() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <FreeDeliveryProgress amount={290} threshold={1000} />
      <FreeDeliveryProgress amount={750} threshold={1000} />
      <FreeDeliveryProgress amount={1000} threshold={1000} />
    </div>
  );
}

export function OverlayDemo() {
  const [open, setOpen] = useState<null | "right" | "cart" | "sheet" | "modal">(
    null,
  );
  const close = () => setOpen(null);
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen("cart")}
        aria-haspopup="dialog"
      >
        Cart drawer
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen("sheet")}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal size={18} aria-hidden="true" /> Filter sheet
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen("modal")}
        aria-haspopup="dialog"
      >
        Modal
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen("right")}
        aria-haspopup="dialog"
      >
        Right panel
      </Button>

      <Dialog
        open={open === "cart"}
        onClose={close}
        variant="cart"
        title="Your cart"
        footer={
          <div className="space-y-3">
            <FreeDeliveryProgress amount={750} threshold={1000} />
            <div className="flex items-baseline justify-between">
              <span className="type-body">Subtotal</span>
              <Price size="inline" price={750} />
            </div>
            <Button fullWidth onClick={close}>
              Checkout
            </Button>
          </div>
        }
      >
        <div className="p-5 type-body text-soft-ink">
          A bottom sheet 90% high on phones, a 420px panel from 768px. Lines,
          coupon and totals arrive in Phase E.
        </div>
      </Dialog>

      <Dialog
        open={open === "sheet"}
        onClose={close}
        variant="sheet"
        title="Filter"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={close}>
              Clear all
            </Button>
            <Button className="flex-1" onClick={close}>
              Show 24 products
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-5">
          <Checkbox label="In stock" defaultChecked />
          <Checkbox label="On sale" />
        </div>
      </Dialog>

      <Dialog
        open={open === "modal"}
        onClose={close}
        variant="modal"
        title="Remove this item?"
      >
        <div className="p-5">
          <p className="type-body text-soft-ink">
            Grid notebook A5 (Sage) will leave your cart.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={close}>
              Keep it
            </Button>
            <Button onClick={close}>Remove</Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={open === "right"}
        onClose={close}
        variant="right"
        title="Order notes"
      >
        <div className="p-5 type-body text-soft-ink">
          A 420px panel from the right.
        </div>
      </Dialog>
    </div>
  );
}

/** Adds a made-up line to the guest cart so the header badge can be seen. */
export function CartBadgeDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => cartStore.add("styleguide-sample", 1)}
      >
        Add 1 to the cart badge
      </Button>
      <Button
        variant="quiet"
        size="sm"
        onClick={() => cartStore.remove("styleguide-sample")}
      >
        Reset badge
      </Button>
    </div>
  );
}
