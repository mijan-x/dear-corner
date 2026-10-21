import { errorCopy } from "../../components/ui/emptyStateCopy";
import { isValidPhone } from "../../services/orders";
import type {
  AddressErrors,
  AddressValue,
} from "../../components/checkout/AddressFields";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Same checks the database makes, so most mistakes show next to the field. */
export function nameError(name: string): string | undefined {
  return name.trim() ? undefined : "Enter your full name.";
}

export function phoneError(phone: string): string | undefined {
  return isValidPhone(phone) ? undefined : errorCopy.phone;
}

export function emailError(email: string): string | undefined {
  if (!email.trim()) return undefined;
  return EMAIL.test(email.trim())
    ? undefined
    : "Enter an email address, like name@example.com, or leave it empty.";
}

export function addressErrors(value: AddressValue): AddressErrors {
  const errors: AddressErrors = {};
  if (!value.division) errors.division = "Choose your division.";
  if (!value.district) errors.district = "Choose your district.";
  if (!value.area) errors.area = "Choose your area.";
  if (!value.addressLine.trim())
    errors.addressLine = "Enter your house, road and area details.";
  return errors;
}

/** Focuses the first field with an error, in page order. */
export function focusFirstError(ids: string[]) {
  window.setTimeout(() => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el?.getAttribute("aria-invalid") === "true") {
        el.focus();
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
    }
  }, 0);
}
