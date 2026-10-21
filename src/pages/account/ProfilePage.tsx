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
        helper="You sign in with this email."
        inputClassName="bg-soft-sand/60 text-soft-ink"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" loading={busy} loadingLabel="Saving your profile">
        Save profile
      </Button>
    </form>
  );
}

/** Name and phone, used to fill in checkout. */
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
          <ProfileForm
            userId={auth.user.id}
            email={auth.user.email}
            profile={data}
          />
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
