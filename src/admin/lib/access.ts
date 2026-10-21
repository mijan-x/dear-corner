import { useCallback, useState } from "react";
import { useAuth } from "../../features/auth/session";
import { getSupabase } from "../../lib/supabase";
import { useQuery } from "../../lib/query";

/**
 * Who may use the admin: an account with the admin role, signed in with
 * two-step login (an authenticator app code). The database checks the same
 * thing on every admin request (public.is_admin), this only picks the screen.
 */
export type AdminAccess =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "not-admin"; email: string | null }
  | { status: "enroll" }
  | { status: "code"; factorId: string }
  | { status: "ready"; email: string | null }
  | { status: "error"; error: unknown };

type Check =
  | { kind: "not-admin" }
  | { kind: "enroll" }
  | { kind: "code"; factorId: string }
  | { kind: "ready" };

async function checkAccess(): Promise<Check> {
  const client = await getSupabase();
  const { data, error } = await client.rpc("my_access");
  if (error) throw error;
  const access = (data ?? {}) as { is_admin_role?: boolean };
  if (!access.is_admin_role) return { kind: "not-admin" };
  const aal = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal.error) throw aal.error;
  if (aal.data.currentLevel === "aal2") return { kind: "ready" };
  const factors = await client.auth.mfa.listFactors();
  if (factors.error) throw factors.error;
  const verified = factors.data.totp.find((f) => f.status === "verified");
  return verified
    ? { kind: "code", factorId: verified.id }
    : { kind: "enroll" };
}

export function useAdminAccess(): AdminAccess & { recheck: () => void } {
  const auth = useAuth();
  const [round, setRound] = useState(0);
  const key =
    auth.status === "signed-in"
      ? `admin-access:${auth.user.id}:${round}`
      : null;
  const query = useQuery(key, checkAccess, { staleMs: 5 * 60_000 });
  const recheck = useCallback(() => setRound((r) => r + 1), []);

  if (auth.status === "loading") return { status: "loading", recheck };
  if (auth.status === "guest") return { status: "guest", recheck };
  if (query.error && !query.data)
    return { status: "error", error: query.error, recheck };
  const check = query.data;
  if (!check) return { status: "loading", recheck };
  if (check.kind === "not-admin") {
    return { status: "not-admin", email: auth.user.email, recheck };
  }
  if (check.kind === "enroll") return { status: "enroll", recheck };
  if (check.kind === "code") {
    return { status: "code", factorId: check.factorId, recheck };
  }
  return { status: "ready", email: auth.user.email, recheck };
}
