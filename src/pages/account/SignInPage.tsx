import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { Heart, MailCheck, MapPin, Package } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/Field";
import Notice from "../../components/ui/Notice";
import Sparkle from "../../components/brand/Sparkle";
import PageLoader from "../../components/system/PageLoader";
import { useAuth } from "../../features/auth/session";
import { usePageMeta } from "../../hooks/usePageMeta";
import { getSupabase } from "../../lib/supabase";
import { toShopError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { safeNext } from "../../features/auth/safeNext";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function authMessage(error: unknown): string {
  const e = (error ?? {}) as {
    status?: number;
    message?: string;
    code?: string;
  };
  const text = (e.message ?? "").toLowerCase();
  if (e.code === "invalid_credentials" || text.includes("invalid login")) {
    return "That email and password don't match. No password yet? Sign in with a code, then set one in your account.";
  }
  if (e.code === "email_not_confirmed" || text.includes("not confirmed")) {
    return "Please sign in with a code first to confirm your email.";
  }
  if (
    e.status === 429 ||
    text.includes("rate limit") ||
    text.includes("security purposes")
  ) {
    return "We've sent a few codes already. Please wait a minute and try again.";
  }
  if (
    e.code === "otp_expired" ||
    text.includes("expired") ||
    text.includes("invalid") ||
    text.includes("token")
  ) {
    return "That code didn't work. Check it, or ask for a new one.";
  }
  if (text.includes("signups not allowed")) {
    return "New accounts can't be made right now. Please try again later.";
  }
  return toShopError(error).message;
}

/**
 * Sign in with an email code, or with a password once one is set in the
 * account. New accounts start with a code (that confirms the email); the code
 * email also has a link that signs in on the device it's opened on. Checkout
 * never needs an account.
 */
function SignInPage() {
  usePageMeta({ title: "Sign in", noindex: true });
  const auth = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [step, setStep] = useState<"email" | "code">("email");
  const [method, setMethod] = useState<"code" | "password">("code");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  if (auth.status === "signed-in") return <Navigate to={next} replace />;
  if (auth.status === "loading") return <PageLoader />;

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) {
      setFieldError("Enter an email address, like name@example.com.");
      return;
    }
    setFieldError(null);
    setError(null);
    setBusy(true);
    try {
      const client = await getSupabase();
      const { error: sendError } = await client.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}${routes.signInNext(next)}`,
        },
      });
      if (sendError) throw sendError;
      setEmail(address);
      setStep("code");
      setCode("");
      setWait(60);
      window.setTimeout(
        () => document.getElementById("sign-in-code")?.focus(),
        50,
      );
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const signInWithPassword = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    const badEmail = EMAIL.test(address)
      ? null
      : "Enter an email address, like name@example.com.";
    const badPassword = password ? null : "Enter your password.";
    setFieldError(badEmail);
    setPasswordError(badPassword);
    if (badEmail || badPassword) return;
    setError(null);
    setBusy(true);
    try {
      const client = await getSupabase();
      const { error: signInError } = await client.auth.signInWithPassword({
        email: address,
        password,
      });
      if (signInError) throw signInError;
      // The session listener moves the page on to `next`.
    } catch (e) {
      setError(authMessage(e));
      setBusy(false);
    }
  };

  const chooseMethod = (value: "code" | "password") => {
    setMethod(value);
    setError(null);
    setFieldError(null);
    setPasswordError(null);
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setFieldError("Enter the code from the email (6 digits).");
      return;
    }
    setFieldError(null);
    setError(null);
    setBusy(true);
    try {
      const client = await getSupabase();
      const { error: verifyError } = await client.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (verifyError) throw verifyError;
      // The session listener moves the page on to `next`.
    } catch (e) {
      setError(authMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="container-page pt-8 pb-20 md:pt-14">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div className="max-w-md">
          <p className="flex items-center gap-2 type-eyebrow text-terracotta-deep">
            <Sparkle size={12} className="text-rosewood" />
            Your account
          </p>
          {step === "email" ? (
            <>
              <h1 className="mt-3 type-h1 text-ink">
                Sign in or create an account
              </h1>
              <p className="mt-3 type-body-lg text-soft-ink">
                {method === "code"
                  ? "We’ll email you a 6-digit code. New here? This makes your account too."
                  : "Use the password you set in your account."}
              </p>
              <div
                role="radiogroup"
                aria-label="How to sign in"
                className="mt-7 grid grid-cols-2 gap-1 rounded-full border border-sand-line bg-soft-sand/60 p-1"
              >
                {(
                  [
                    ["code", "Email code"],
                    ["password", "Password"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={method === value}
                    onClick={() => chooseMethod(value)}
                    className={`min-h-11 rounded-full px-4 type-label transition-colors ${
                      method === value
                        ? "bg-paper text-ink shadow-sm"
                        : "text-soft-ink hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <form
                onSubmit={method === "code" ? send : signInWithPassword}
                noValidate
                className="mt-6 space-y-5"
              >
                <TextField
                  label="Email address"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={fieldError}
                  placeholder="name@example.com"
                />
                {method === "password" && (
                  <TextField
                    id="sign-in-password"
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={passwordError}
                  />
                )}
                {error && <Notice tone="error">{error}</Notice>}
                {method === "code" ? (
                  <Button
                    type="submit"
                    fullWidth
                    loading={busy}
                    loadingLabel="Sending the code"
                  >
                    Email me a code
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    fullWidth
                    loading={busy}
                    loadingLabel="Signing you in"
                  >
                    Sign in
                  </Button>
                )}
              </form>
              {method === "password" && (
                <button
                  type="button"
                  onClick={() => chooseMethod("code")}
                  className="mt-4 inline-flex min-h-11 items-center type-body link"
                >
                  Forgot your password? Sign in with a code
                </button>
              )}
            </>
          ) : (
            <>
              <h1 className="mt-3 type-h1 text-ink">Check your email</h1>
              <p className="mt-3 type-body-lg text-soft-ink">
                We sent a code to{" "}
                <span className="font-semibold text-ink">{email}</span>. Enter
                it below, or tap the link in the email on this device.
              </p>
              <form onSubmit={verify} noValidate className="mt-8 space-y-5">
                <TextField
                  id="sign-in-code"
                  label="Code from the email"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  error={fieldError}
                  inputClassName="figures text-[20px] tracking-[0.3em]"
                />
                {error && <Notice tone="error">{error}</Notice>}
                <Button
                  type="submit"
                  fullWidth
                  loading={busy}
                  loadingLabel="Signing you in"
                >
                  Sign in
                </Button>
              </form>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 type-body">
                <button
                  type="button"
                  disabled={wait > 0 || busy}
                  onClick={() => send()}
                  className="inline-flex min-h-11 items-center link disabled:cursor-not-allowed disabled:text-soft-ink disabled:no-underline"
                >
                  {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError(null);
                    setFieldError(null);
                  }}
                  className="inline-flex min-h-11 items-center link"
                >
                  Use a different email
                </button>
              </div>
              <p className="mt-4 flex items-start gap-2 type-caption text-soft-ink">
                <MailCheck size={18} aria-hidden="true" className="shrink-0" />
                Not there? Check Promotions or Spam. The code works for one
                hour.
              </p>
            </>
          )}
          <p className="mt-10 border-t border-sand-line pt-6 type-body text-soft-ink">
            Just here to order? You don&rsquo;t need an account.{" "}
            <Link to={routes.cart} className="link">
              Go to your cart
            </Link>{" "}
            or{" "}
            <Link to={routes.trackOrder} className="link">
              track an order
            </Link>
            .
          </p>
        </div>

        <aside className="relative hidden overflow-hidden corner-mask-lg bg-clay-blush p-10 lg:block">
          <div
            aria-hidden="true"
            className="absolute -top-20 -right-20 size-80 glow"
          />
          <h2 className="relative type-h3 text-ink">With an account you can</h2>
          <ul className="relative mt-6 space-y-5 type-body text-ink">
            <li className="flex gap-3">
              <Package
                size={22}
                aria-hidden="true"
                className="shrink-0 text-rosewood"
              />
              See every order and where it is, and order again in one tap
            </li>
            <li className="flex gap-3">
              <MapPin
                size={22}
                aria-hidden="true"
                className="shrink-0 text-rosewood"
              />
              Save your addresses for a faster checkout
            </li>
            <li className="flex gap-3">
              <Heart
                size={22}
                aria-hidden="true"
                className="shrink-0 text-rosewood"
              />
              Keep a wishlist of the little things you love
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

export default SignInPage;
