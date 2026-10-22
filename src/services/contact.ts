import { getSupabase } from "../lib/supabase";

export type ContactMessage = {
  name: string;
  phone: string;
  message: string;
  email?: string;
  orderNumber?: string;
};

/**
 * Saves a Contact page message (admin reads them under Messages). The
 * database checks the fields again and allows 5 messages an hour per visitor.
 */
export async function sendContactMessage(input: ContactMessage) {
  const { error } = await (
    await getSupabase()
  ).rpc("submit_contact_message", {
    p_name: input.name,
    p_phone: input.phone,
    p_message: input.message,
    p_email: input.email || undefined,
    p_order_number: input.orderNumber || undefined,
  });
  if (error) throw error;
}
