import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import Notice from "../../components/ui/Notice";
import { PhoneField, TextField } from "../../components/ui/Field";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/useToast";
import { useAuth } from "../../features/auth/session";
import { nameError, phoneError } from "../../features/checkout/validate";
import { usePageMeta } from "../../hooks/usePageMeta";
import { toShopError } from "../../lib/errors";
import { getSupabase } from "../../lib/supabase";
import { saveProfile, useProfile, type Profile } from "../../services/account";
import { normalizePhone } from "../../services/orders";

function ProfileForm({
  userId,
  email,
  profile,
}: {
  userId: string;
  email: string | null;
  profile: Profile;
}) {
  const toast = useToast();
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = {
      fullName: nameError(fullName),
      phone: phone.trim() ? phoneError(phone) : undefined,
    };
    setErrors(found);
    if (found.fullName || found.phone) return;
    setBusy(true);
    setError(null);
    try {
      await saveProfile(userId, {
        fullName,
        phone: phone.trim() ? normalizePhone(phone) : null,
      });
      toast.show("Profile saved.", "success");
    } catch (e) {
      setError(toShopError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="max-w-xl space-y-5 rounded-card border border-sand-line bg-paper p-5 md:p-7"
    >
      <TextField
        label="Full name"
        autoComplete="name"
        maxLength={120}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={errors.fullName}
      />
      <PhoneField
        optional
        helper="We fill it in at checkout for you."
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
      />
      <TextField
        label="Email"
        type="email"
        value={email ?? ""}
        readOnly
        helper="You sign in with this email, using a code or your password."
        inputClassName="bg-soft-sand/60 text-soft-ink"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" loading={busy} loadingLabel="Saving your profile">
        Save profile
      </Button>
    </form>
  );
}

const MIN_PASSWORD = 8;

function passwordMessage(error: unknown): string {
  const e = (error ?? {}) as { code?: string; message?: string };
  const text = (e.message ?? "").toLowerCase();
  if (e.code === "same_password" || text.includes("different from the old")) {
    return "That's already your password. Choose a new one.";
  }
  if (e.code === "weak_password" || text.includes("weak")) {
    return "Choose a stronger password: longer, with a mix of letters and numbers.";
  }
  if (e.code === "reauthentication_needed" || text.includes("reauthenticat")) {
    return "For safety, sign out and sign in again with a code, then set your password.";
  }
  return toShopError(error).message;
}

/** Sets or changes the password, so the customer can sign in without a code. */
function PasswordForm() {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [errors, setErrors] = useState<{ password?: string; repeat?: string }>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = {
      password:
        password.length < MIN_PASSWORD
          ? `Use at least ${MIN_PASSWORD} characters.`
          : undefined,
      repeat:
        repeat !== password ? "The two passwords don't match." : undefined,
    };
    setErrors(found);
    if (found.password || found.repeat) return;
    setBusy(true);
    setError(null);
    try {
      const client = await getSupabase();
      const { error: updateError } = await client.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setPassword("");
      setRepeat("");
      toast.show("Password saved. You can sign in with it now.", "success");
    } catch (e) {
      setError(passwordMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby="password-title"
      className="max-w-xl space-y-5 rounded-card border border-sand-line bg-paper p-5 md:p-7"
    >
      <div>
        <h2 id="password-title" className="type-h3 text-ink">
          Password
        </h2>
        <p className="mt-1 type-body text-soft-ink">
          Set a password to sign in without waiting for a code. You can still
          sign in with a code any time.
        </p>
      </div>
      <TextField
        id="new-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        helper={`At least ${MIN_PASSWORD} characters.`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <TextField
        id="repeat-password"
        label="Type it again"
        type="password"
        autoComplete="new-password"
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
        error={errors.repeat}
      />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" loading={busy} loadingLabel="Saving your password">
        Save password
      </Button>
    </form>
  );
}

/** Name and phone, used to fill in checkout, and the sign-in password. */
function ProfilePage() {
  usePageMeta({ title: "Profile", noindex: true });
  const auth = useAuth();
  const { data, error, refetch } = useProfile(auth.user?.id);

  return (
    <div>
      <h1 className="type-h2 text-ink">Profile</h1>
      <div className="mt-5">
        {error && !data ? (
          <Notice
            tone="error"
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                Try again
              </Button>
            }
          >
            {toShopError(error).message}
          </Notice>
        ) : !data || !auth.user ? (
          <div
            aria-hidden="true"
            className="max-w-xl space-y-4 rounded-card border border-sand-line bg-paper p-7"
          >
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <ProfileForm
              userId={auth.user.id}
              email={auth.user.email}
              profile={data}
            />
            <PasswordForm />
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
