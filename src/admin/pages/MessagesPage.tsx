import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import AdminPage from "../components/AdminPage";
import QueryView from "../components/QueryView";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/useToast";
import {
  db,
  forgetAdmin,
  must,
  refreshAdmin,
  useAdminQuery,
} from "../lib/data";
import { admin } from "../lib/paths";
import { toShopError } from "../../lib/errors";
import { formatDateTime } from "../../utils/formatDate";
import { cx } from "../../utils/cx";

type Status = "new" | "read" | "done";
const WORD: Record<Status, string> = { new: "New", read: "Seen", done: "Done" };

async function fetchMessages(status: Status | "all") {
  let q = (await db())
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") q = q.eq("status", status);
  return must(await q) ?? [];
}

type MessageRow = Awaited<ReturnType<typeof fetchMessages>>[number];

async function findOrderId(number: string) {
  const row = must(
    await (
      await db()
    )
      .from("orders")
      .select("id")
      .eq("order_number", number.toUpperCase())
      .maybeSingle(),
  );
  return row?.id ?? null;
}

function MessageCard({
  m,
  onDone,
}: {
  m: MessageRow;
  onDone: (message?: string) => void;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const [note, setNote] = useState(m.admin_note ?? "");
  const [busy, setBusy] = useState(false);
  const update = async (
    patch: { status?: Status; admin_note?: string },
    message?: string,
  ) => {
    setBusy(true);
    try {
      must(
        await (
          await db()
        )
          .from("contact_messages")
          .update(patch)
          .eq("id", m.id),
      );
      onDone(message);
    } catch (e) {
      toast.show(toShopError(e).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const openOrder = async () => {
    const id = m.order_number
      ? await findOrderId(m.order_number).catch(() => null)
      : null;
    if (id) navigate(admin.order(id));
    else toast.show("No order with that number.", "info");
  };
  const wa = m.phone ? `https://wa.me/88${m.phone}` : null;
  return (
    <li
      className={cx(
        "rounded-card border bg-paper p-5",
        m.status === "new" ? "border-rosewood" : "border-sand-line",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">
            {m.name}
            {m.status === "new" && (
              <span className="ml-2 rounded-full bg-rosewood px-2 py-0.5 text-[11px] font-bold text-white">
                New
              </span>
            )}
          </p>
          <p className="type-caption text-soft-ink">
            {formatDateTime(m.created_at)}
          </p>
        </div>
        {m.order_number && (
          <Button variant="quiet" size="sm" onClick={openOrder}>
            Order <span className="figures">{m.order_number}</span>
          </Button>
        )}
      </div>
      <p className="mt-3 type-body whitespace-pre-wrap text-ink">{m.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {m.phone && (
          <a
            href={`tel:+88${m.phone}`}
            className="inline-flex h-11 items-center gap-2 rounded-control border border-sand-line px-3 type-nav hover:border-rosewood"
          >
            <Phone size={16} aria-hidden="true" />
            <span className="figures">{m.phone}</span>
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-control border border-sand-line px-3 type-nav hover:border-rosewood"
          >
            <MessageCircle size={16} aria-hidden="true" />
            WhatsApp<span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
        {m.email && (
          <a
            href={`mailto:${m.email}?subject=${encodeURIComponent("Your message to Dear Corner")}`}
            className="inline-flex h-11 items-center gap-2 rounded-control border border-sand-line px-3 type-nav hover:border-rosewood"
          >
            <Mail size={16} aria-hidden="true" />
            {m.email}
          </a>
        )}
      </div>
      <div className="mt-4 grid gap-3 border-t border-sand-line pt-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <TextField
          label="Team note"
          optional
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() =>
            note !== (m.admin_note ?? "") && update({ admin_note: note })
          }
          maxLength={1000}
        />
        <div className="flex gap-2">
          {m.status !== "done" ? (
            <Button
              size="sm"
              onClick={() =>
                update({ status: "done", admin_note: note }, "Marked done.")
              }
              loading={busy}
              loadingLabel="Saving"
            >
              Mark done
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => update({ status: "read" }, "Moved back to open.")}
              loading={busy}
              loadingLabel="Saving"
            >
              Reopen
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Messages from the Contact page, with quick ways to reply. */
function MessagesPage() {
  const toast = useToast();
  const [status, setStatus] = useState<Status | "all">("all");
  const key = `messages:${status}`;
  const query = useAdminQuery(key, () => fetchMessages(status));
  const done = (message?: string) => {
    if (message) toast.show(message, "success");
    forgetAdmin(
      "dashboard",
      "messages:all",
      "messages:new",
      "messages:read",
      "messages:done",
    );
    void refreshAdmin(key, () => fetchMessages(status));
  };
  return (
    <AdminPage
      title="Messages"
      description={
        <>
          From the Contact page. Customers can also find their order on{" "}
          <Link to={admin.orders} className="link">
            Orders
          </Link>
          .
        </>
      }
    >
      <div
        className="mb-5 flex flex-wrap gap-1.5"
        role="group"
        aria-label="Show"
      >
        {(["all", "new", "read", "done"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={cx(
              "h-10 rounded-full border px-4 type-nav",
              status === s
                ? "border-rosewood bg-rosewood text-white"
                : "border-sand-line bg-paper text-ink hover:border-rosewood",
            )}
          >
            {s === "all" ? "All" : WORD[s]}
          </button>
        ))}
      </div>
      <QueryView query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <p className="rounded-card border border-sand-line bg-paper px-5 py-10 text-center type-body text-soft-ink">
              No messages here.
            </p>
          ) : (
            <ul className="space-y-4">
              {rows.map((m) => (
                <MessageCard key={m.id} m={m} onDone={done} />
              ))}
            </ul>
          )
        }
      </QueryView>
    </AdminPage>
  );
}

export default MessagesPage;
