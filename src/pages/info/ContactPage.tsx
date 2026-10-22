import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import {
  CircleCheck,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { ContentPage } from "../../components/content/ContentPage";
import { Button } from "../../components/ui/Button";
import Notice from "../../components/ui/Notice";
import {
  PhoneField,
  TextAreaField,
  TextField,
} from "../../components/ui/Field";
import {
  emailError,
  focusFirstError,
  nameError,
  phoneError,
} from "../../features/checkout/validate";
import { usePageMeta } from "../../hooks/usePageMeta";
import { toShopError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { sendContactMessage } from "../../services/contact";
import { normalizePhone } from "../../services/orders";
import { useShopSettings } from "../../services/settings";

const MAX_MESSAGE = 2000;
const FIELD_IDS = [
  "contact-name",
  "contact-phone",
  "contact-email",
  "contact-order",
  "contact-message",
];

type Errors = Partial<
  Record<"name" | "phone" | "email" | "order" | "message", string>
>;

/** The shop's contact details from admin Settings; shown only when filled. */
function ContactDetails() {
  const { settings } = useShopSettings();
  const whatsapp = settings.contact_whatsapp.replace(/\D/g, "");
  const rows = [
    settings.contact_phone && {
      icon: Phone,
      label: "Call",
      node: (
        <a
          className="link"
          href={`tel:${settings.contact_phone.replace(/\s+/g, "")}`}
        >
          {settings.contact_phone}
        </a>
      ),
    },
    whatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      node: (
        <a
          className="link"
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
        >
          {settings.contact_whatsapp}
        </a>
      ),
    },
    settings.contact_email && {
      icon: Mail,
      label: "Email",
      node: (
        <a className="break-all link" href={`mailto:${settings.contact_email}`}>
          {settings.contact_email}
        </a>
      ),
    },
    settings.opening_hours && {
      icon: Clock,
      label: "Open",
      node: <span>{settings.opening_hours}</span>,
    },
    settings.contact_address && {
      icon: MapPin,
      label: "Address",
      node: <span>{settings.contact_address}</span>,
    },
  ].filter(Boolean) as {
    icon: typeof Phone;
    label: string;
    node: ReactNode;
  }[];

  return (
    <div className="rounded-card border border-sand-line bg-paper p-5 md:p-6">
      <h2 className="type-h3 text-ink">Other ways to reach us</h2>
      {rows.length > 0 ? (
        <dl className="mt-4 space-y-4">
          {rows.map(({ icon: Icon, label, node }) => (
            <div key={label} className="flex gap-3">
              <Icon
                size={20}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-rosewood"
              />
              <div>
                <dt className="type-label text-ink">{label}</dt>
                <dd className="type-body text-soft-ink">{node}</dd>
              </div>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 type-body text-soft-ink">
          The form is the quickest way to reach us. We read every message.
        </p>
      )}
      {settings.reply_time && (
        <p className="mt-4 border-t border-sand-line pt-4 type-caption text-soft-ink">
          {settings.reply_time}
        </p>
      )}
      <p className="mt-4 border-t border-sand-line pt-4 type-body text-soft-ink">
        Looking for a parcel?{" "}
        <Link to={routes.trackOrder} className="link">
          Track your order
        </Link>
        .
      </p>
    </div>
  );
}

/** Contact: form saved to contact_messages (admin → Messages). */
function ContactPage() {
  usePageMeta({
    title: "Contact us",
    description:
      "Questions about a product or an order? Send Dear Corner a message and we'll get back to you.",
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const orderNumber = order.trim().toUpperCase();
    const found: Errors = {
      name: nameError(name),
      phone: phoneError(phone),
      email: emailError(email),
      order:
        orderNumber && !/^DC-\d{4,}$/.test(orderNumber)
          ? "Order numbers look like DC-10482. Leave it empty if you don't have one."
          : undefined,
      message: message.trim()
        ? message.length > MAX_MESSAGE
          ? `Please keep it under ${MAX_MESSAGE.toLocaleString("en-US")} characters.`
          : undefined
        : "Write a short message so we know how to help.",
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      focusFirstError(FIELD_IDS);
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      await sendContactMessage({
        name: name.trim(),
        phone: normalizePhone(phone),
        email: email.trim(),
        orderNumber,
        message: message.trim(),
      });
      setSent(true);
      window.setTimeout(() => {
        const card = document.getElementById("contact-sent");
        card?.focus({ preventScroll: true });
        card?.scrollIntoView({ block: "start" });
      }, 50);
    } catch (e) {
      setFailure(toShopError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ContentPage
      eyebrow="We're here to help"
      title="Contact us"
      intro={
        <p>
          A question about a product, an order or a gift? Send us a message and
          we&rsquo;ll call or write back.
        </p>
      }
      aside={<ContactDetails />}
    >
      {sent ? (
        <div
          id="contact-sent"
          tabIndex={-1}
          className="scroll-mt-28 rounded-card border border-sand-line bg-paper p-6 text-center focus:outline-none md:p-10"
        >
          <CircleCheck
            size={48}
            strokeWidth={1.5}
            aria-hidden="true"
            className="mx-auto text-success"
          />
          <h2 className="mt-4 type-h2 text-ink">
            Thank you, we&rsquo;ve got it.
          </h2>
          <p className="mt-2 type-body-lg text-soft-ink">
            We&rsquo;ll get back to you on {phone.trim()} as soon as we can.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setSent(false);
                setMessage("");
                setOrder("");
              }}
            >
              Send another message
            </Button>
            <Link to={routes.shop} className="self-center link">
              Back to the shop
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => void submit(e)}
          noValidate
          className="space-y-5"
          aria-label="Contact form"
        >
          <TextField
            id="contact-name"
            label="Your name"
            autoComplete="name"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <PhoneField
            id="contact-phone"
            helper="11 digits, starting with 01. So we can call you back."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="contact-email"
              label="Email"
              optional
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <TextField
              id="contact-order"
              label="Order number"
              optional
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="DC-10482"
              maxLength={20}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              error={errors.order}
            />
          </div>
          <TextAreaField
            id="contact-message"
            label="Message"
            rows={6}
            maxLength={MAX_MESSAGE}
            helper={`${message.length.toLocaleString("en-US")} / ${MAX_MESSAGE.toLocaleString("en-US")} characters`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            error={errors.message}
          />
          {failure && <Notice tone="error">{failure}</Notice>}
          <Button
            type="submit"
            loading={busy}
            loadingLabel="Sending your message"
            className="w-full sm:w-auto"
          >
            Send message
          </Button>
        </form>
      )}
    </ContentPage>
  );
}

export default ContactPage;
