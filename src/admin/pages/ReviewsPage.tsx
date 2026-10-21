import { useState } from "react";
import { Link } from "react-router";
import { Check, Flag, Star, X } from "lucide-react";
import AdminPage from "../components/AdminPage";
import ConfirmDialog from "../components/ConfirmDialog";
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
import { formatDate } from "../../utils/formatDate";
import { cx } from "../../utils/cx";

type Status = "pending" | "approved" | "rejected";
const WORD: Record<Status, string> = {
  pending: "Waiting",
  approved: "Published",
  rejected: "Not published",
};

async function fetchReviews(status: Status) {
  return (
    must(
      await (
        await db()
      )
        .from("reviews")
        .select(
          "id, rating, title, body, reviewer_name, status, admin_note, created_at, product_id, order_id, products(name, slug), orders(order_number), review_reports(reason)",
        )
        .eq("status", status)
        .order("created_at", { ascending: status === "pending" })
        .limit(200),
    ) ?? []
  );
}

type ReviewRow = Awaited<ReturnType<typeof fetchReviews>>[number];

async function moderate(id: string, status: Status, note: string) {
  must(
    await (
      await db()
    )
      .from("reviews")
      .update({ status, admin_note: note })
      .eq("id", id),
  );
}

function ReviewCard({
  r,
  onDone,
}: {
  r: ReviewRow;
  onDone: (message: string) => void;
}) {
  const toast = useToast();
  const [note, setNote] = useState(r.admin_note ?? "");
  const [busy, setBusy] = useState<Status | "delete" | null>(null);
  const [confirm, setConfirm] = useState(false);
  const act = async (status: Status) => {
    setBusy(status);
    try {
      await moderate(r.id, status, note);
      onDone(
        status === "approved"
          ? "Review published."
          : status === "rejected"
            ? "Review hidden."
            : "Moved back to waiting.",
      );
    } catch (e) {
      toast.show(toShopError(e).message, "error");
      setBusy(null);
    }
  };
  return (
    <li className="rounded-card border border-sand-line bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="flex items-center gap-1"
            aria-label={`${r.rating} out of 5 stars`}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={18}
                aria-hidden="true"
                className={
                  n <= r.rating
                    ? "fill-lamp-glow text-terracotta-deep"
                    : "text-mauve-grey"
                }
              />
            ))}
          </p>
          {r.title && (
            <h2 className="mt-2 type-body font-semibold text-ink">{r.title}</h2>
          )}
        </div>
        <p className="type-caption text-soft-ink">{formatDate(r.created_at)}</p>
      </div>
      <p className="mt-2 type-body whitespace-pre-wrap text-ink">{r.body}</p>
      <p className="mt-3 type-caption text-soft-ink">
        {r.reviewer_name} on{" "}
        {r.products ? (
          <Link to={admin.product(r.product_id)} className="link">
            {r.products.name}
          </Link>
        ) : (
          "a removed product"
        )}
        {r.orders && (
          <>
            {" "}
            · order{" "}
            <Link to={admin.order(r.order_id)} className="figures link">
              {r.orders.order_number}
            </Link>
          </>
        )}{" "}
        · verified buyer
      </p>
      {r.review_reports.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 type-caption font-medium text-warning">
          <Flag size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          Reported {r.review_reports.length}×:{" "}
          {r.review_reports.map((x) => x.reason).join("; ")}
        </p>
      )}
      <div className="mt-4 grid gap-3 border-t border-sand-line pt-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <TextField
          label="Team note"
          optional
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
        <div className="flex flex-wrap gap-2 md:pb-0.5">
          {r.status !== "approved" && (
            <Button
              size="sm"
              onClick={() => act("approved")}
              loading={busy === "approved"}
              loadingLabel="Publishing"
            >
              <Check size={17} aria-hidden="true" />
              Publish
            </Button>
          )}
          {r.status !== "rejected" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => act("rejected")}
              loading={busy === "rejected"}
              loadingLabel="Hiding"
            >
              <X size={17} aria-hidden="true" />
              {r.status === "approved" ? "Unpublish" : "Don't publish"}
            </Button>
          )}
          <Button size="sm" variant="quiet" onClick={() => setConfirm(true)}>
            Delete
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Delete this review?"
        confirmLabel="Delete review"
        busy={busy === "delete"}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy("delete");
          try {
            must(await (await db()).from("reviews").delete().eq("id", r.id));
            setConfirm(false);
            onDone("Review deleted. The customer can write a new one.");
          } catch (e) {
            toast.show(toShopError(e).message, "error");
            setBusy(null);
          }
        }}
      >
        Prefer “Don&rsquo;t publish” to keep a record. Deleting lets the
        customer review the item again.
      </ConfirmDialog>
    </li>
  );
}

/** Reviews from buyers of delivered orders wait here until published. */
function ReviewsPage() {
  const toast = useToast();
  const [status, setStatus] = useState<Status>("pending");
  const key = `reviews:${status}`;
  const query = useAdminQuery(key, () => fetchReviews(status));
  const done = (message: string) => {
    toast.show(message, "success");
    forgetAdmin(
      "dashboard",
      "reviews:pending",
      "reviews:approved",
      "reviews:rejected",
    );
    void refreshAdmin(key, () => fetchReviews(status));
  };
  return (
    <AdminPage
      title="Reviews"
      description="Only people whose order was delivered can review. Nothing shows in the shop until you publish it."
    >
      <div className="mb-5 flex gap-1.5" role="group" aria-label="Show">
        {(["pending", "approved", "rejected"] as Status[]).map((s) => (
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
            {WORD[s]}
          </button>
        ))}
      </div>
      <QueryView query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <p className="rounded-card border border-sand-line bg-paper px-5 py-10 text-center type-body text-soft-ink">
              {status === "pending"
                ? "No reviews waiting. All caught up."
                : "None here."}
            </p>
          ) : (
            <ul className="space-y-4">
              {rows.map((r) => (
                <ReviewCard key={r.id} r={r} onDone={done} />
              ))}
            </ul>
          )
        }
      </QueryView>
    </AdminPage>
  );
}

export default ReviewsPage;
