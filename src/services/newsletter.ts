import { getSupabase } from "../lib/supabase";

/**
 * Newsletter sign-up (collected only for now). Repeat sign-ups succeed
 * quietly, so the form never reveals who is already on the list.
 */
export async function subscribeToNewsletter(email: string, source = "footer") {
  const { error } = await (
    await getSupabase()
  ).rpc("subscribe_newsletter", {
    p_email: email,
    p_source: source,
  });
  if (error) throw error;
}
