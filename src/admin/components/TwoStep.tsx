import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/Field";
import Notice from "../../components/ui/Notice";
import Sparkle from "../../components/brand/Sparkle";
import { getSupabase } from "../../lib/supabase";
import { toShopError } from "../../lib/errors";

type Enrollment = { factorId: string; qr: string; secret: string };

/** The QR code comes as raw SVG after a data: prefix; encode it so "#" colors don't cut it short. */
function safeQr(qr: string) {
  const raw = qr.replace(/^data:image\/svg\+xml;utf-8,/, "");
  return raw.startsWith("<")
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`
    : qr;
}

function codeMessage(error: unknown) {
  const text = String(
    (error as { message?: string })?.message ?? "",
  ).toLowerCase();
  if (
    text.includes("invalid") ||
    text.includes("expired") ||
    text.includes("code")
  ) {
    return "That code didn't work. Check the time on your phone and try the newest code.";
  }
  return toShopError(error).message;
}

/**
 * Two-step login for the admin (an authenticator app such as Google
 * Authenticator). First time: scan the QR code and enter a code to turn it
 * on. After that: a code at every sign-in.
 */
function TwoStep({
  mode,
  factorId,
  onDone,
}: {
  mode: "enroll" | "code";
  factorId?: string;
  onDone: () => void;
}) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "enroll") return;
    let cancelled = false;
    (async () => {
      try {
        const client = await getSupabase();
        // Leftovers from an earlier, unfinished attempt would block a new one.
        const factors = await client.auth.mfa.listFactors();
        for (const f of factors.data?.all ?? []) {
          if (f.status !== "verified")
            await client.auth.mfa.unenroll({ factorId: f.id });
        }
        const { data, error: enrollError } = await client.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: `Dear Corner admin ${new Date().toISOString().slice(0, 10)}`,
          issuer: "Dear Corner",
        });
        if (enrollError) throw enrollError;
        if (!cancelled) {
          setEnrollment({
            factorId: data.id,
            qr: safeQr(data.totp.qr_code),
            secret: data.totp.secret,
          });
        }
      } catch (e) {
        if (!cancelled) setError(toShopError(e).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const token = code.replace(/\D/g, "");
    const id = mode === "enroll" ? enrollment?.factorId : factorId;
    if (!id) return;
    if (token.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const client = await getSupabase();
      const { error: verifyError } = await client.auth.mfa.challengeAndVerify({
        factorId: id,
        code: token,
      });
      if (verifyError) throw verifyError;
      onDone();
    } catch (e) {
      setError(codeMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-linen px-4 py-10">
      <div className="w-full max-w-md rounded-card border border-sand-line bg-paper p-6 md:p-8">
        <p className="flex items-center gap-2 type-eyebrow text-terracotta-deep">
          <Sparkle size={12} className="text-rosewood" />
          Dear Corner admin
        </p>
        <h1 className="mt-3 type-h2 text-ink">
          {mode === "enroll" ? "Turn on two-step login" : "Enter your code"}
        </h1>
        <p className="mt-2 type-body text-soft-ink">
          {mode === "enroll"
            ? "The admin needs a code from an authenticator app (Google Authenticator, Microsoft Authenticator or 1Password) every time you sign in. Scan this with the app, then enter the code it shows."
            : "Open your authenticator app and enter the 6-digit code for Dear Corner."}
        </p>

        {mode === "enroll" && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-control bg-cream p-5">
            {enrollment ? (
              <>
                <img
                  src={enrollment.qr}
                  alt="QR code to add Dear Corner to your authenticator app"
                  width={180}
                  height={180}
                  className="size-[180px] rounded-control bg-white p-2"
                />
                <p className="text-center type-caption text-soft-ink">
                  Can&rsquo;t scan? Enter this key in the app:
                  <br />
                  <code className="font-mono text-[14px] font-semibold break-all text-ink">
                    {enrollment.secret}
                  </code>
                </p>
              </>
            ) : (
              !error && (
                <span className="block size-3 animate-glow-pulse rounded-full bg-lamp-glow" />
              )
            )}
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <TextField
            id="admin-code"
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            inputClassName="figures text-[20px] tracking-[0.3em]"
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button
            type="submit"
            fullWidth
            loading={busy}
            loadingLabel="Checking the code"
            disabled={mode === "enroll" && !enrollment}
          >
            <ShieldCheck size={18} aria-hidden="true" />
            {mode === "enroll" ? "Turn on and continue" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default TwoStep;
