import { useState, type FormEvent } from "react";
import Dialog from "../ui/Dialog";
import { Button } from "../ui/Button";
import Notice from "../ui/Notice";
import { Checkbox } from "../ui/Choice";
import { PhoneField, TextField } from "../ui/Field";
import AddressFields, { type AddressValue } from "../checkout/AddressFields";
import {
  addressErrors,
  focusFirstError,
  nameError,
  phoneError,
} from "../../features/checkout/validate";
import { toShopError } from "../../lib/errors";
import { saveAddress, type Address } from "../../services/account";
import { normalizePhone } from "../../services/orders";

type Errors = Partial<
  Record<keyof AddressValue | "fullName" | "phone", string>
>;

const FIELDS = [
  "address-name",
  "address-phone",
  "address-division",
  "address-district",
  "address-area",
  "address-address",
];

/** Add or edit a saved address. */
function AddressDialog({
  userId,
  address,
  open,
  onClose,
  onSaved,
  first,
}: {
  userId: string;
  /** The address to edit; empty to add one. */
  address: Address | null;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  /** The customer's first address becomes the default anyway. */
  first: boolean;
}) {
  const [label, setLabel] = useState(address?.label ?? "Home");
  const [fullName, setFullName] = useState(address?.fullName ?? "");
  const [phone, setPhone] = useState(address?.phone ?? "");
  const [place, setPlace] = useState<AddressValue>({
    division: address?.division ?? "",
    district: address?.district ?? "",
    area: address?.area ?? "",
    addressLine: address?.addressLine ?? "",
  });
  const [makeDefault, setMakeDefault] = useState(address?.isDefault ?? first);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Errors = {
      fullName: nameError(fullName),
      phone: phoneError(phone),
      ...addressErrors(place),
    };
    const clean = Object.fromEntries(
      Object.entries(found).filter(([, v]) => v),
    ) as Errors;
    setErrors(clean);
    if (Object.keys(clean).length) {
      focusFirstError(FIELDS);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveAddress(
        userId,
        {
          label,
          fullName,
          phone: normalizePhone(phone),
          ...place,
          // Only ever switch the default on; the database moves it.
          ...(makeDefault ? { isDefault: true } : {}),
        },
        address?.id,
      );
      onSaved(address ? "Address saved." : "Address added.");
    } catch (e) {
      const shopError = toShopError(e);
      const text =
        shopError.code === "DC_LIMIT"
          ? "You can save up to 10 addresses. Delete one to add another."
          : shopError.code === "DC_UNKNOWN"
            ? "We couldn't save this address. Check the details and try again."
            : shopError.message;
      setError(text);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="modal"
      title={address ? "Edit address" : "Add an address"}
      bodyClassName="px-5 pb-6 md:px-7"
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          id="address-label"
          label="Label"
          helper="For example Home, Office or Hostel"
          maxLength={30}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <TextField
          id="address-name"
          label="Full name"
          autoComplete="name"
          maxLength={120}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />
        <PhoneField
          id="address-phone"
          helper="11 digits, starting with 01. The rider calls this number."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
        />
        <AddressFields
          idPrefix="address"
          value={place}
          onChange={setPlace}
          errors={errors}
        />
        {!(address?.isDefault ?? false) && (
          <Checkbox
            label="Use this as my default address"
            checked={makeDefault}
            onChange={(e) => setMakeDefault(e.target.checked)}
          />
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={busy}
            loadingLabel="Saving the address"
          >
            Save address
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default AddressDialog;
