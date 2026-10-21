import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import AdminPage from "../components/AdminPage";
import Panel from "../components/Panel";
import QueryView from "../components/QueryView";
import SearchBox from "../components/SearchBox";
import Table, { Td } from "../components/Table";
import Toggle from "../components/Toggle";
import { Button } from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import Notice from "../../components/ui/Notice";
import { TextField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/useToast";
import { forgetAdmin, refreshAdmin, useAdminQuery } from "../lib/data";
import { admin } from "../lib/paths";
import {
  fetchMovements,
  fetchStock,
  REASON,
  setStock,
  type StockRow,
} from "../services/inventory";
import { toShopError } from "../../lib/errors";
import { formatDateTime } from "../../utils/formatDate";
import { cx } from "../../utils/cx";

function StockDialog({
  row,
  onClose,
  onSaved,
}: {
  row: StockRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(String(row.stock));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0)
      return setError("Enter a whole number, 0 or more.");
    setBusy(true);
    try {
      await setStock(row.id, n, note);
      onSaved();
    } catch (e) {
      setError(toShopError(e).message);
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      variant="modal"
      title="Set stock"
      bodyClassName="px-5 pb-6 md:px-7"
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="type-body text-soft-ink">
          <span className="font-semibold text-ink">{row.products?.name}</span>
          {row.title !== "Default" && ` · ${row.title}`} · {row.sku}. Now{" "}
          <span className="figures">{row.stock}</span>.
        </p>
        <TextField
          label="Stock on the shelf"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          inputClassName="figures"
        />
        <TextField
          label="Reason"
          optional
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="New delivery from supplier, counted the shelf…"
        />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end">
          <Button type="submit" loading={busy} loadingLabel="Saving">
            Save stock
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Stock per SKU, quick corrections, and the last stock changes. */
function InventoryPage() {
  const toast = useToast();
  const query = useAdminQuery("inventory", fetchStock);
  const moves = useAdminQuery("movements", fetchMovements);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<StockRow | null>(null);

  return (
    <AdminPage
      title="Inventory"
      description="Stock goes down when an order is placed and back up if it's cancelled or returned."
    >
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <SearchBox
          label="Search stock"
          placeholder="Product or SKU"
          value={search}
          onChange={setSearch}
        />
        <Toggle
          label="Low stock only"
          checked={lowOnly}
          onChange={setLowOnly}
        />
      </div>
      <QueryView query={query}>
        {(all) => {
          const term = search.trim().toLowerCase();
          const rows = all.filter(
            (r) =>
              (!lowOnly || r.stock <= r.low_stock_threshold) &&
              (!term ||
                r.sku.toLowerCase().includes(term) ||
                (r.products?.name ?? "").toLowerCase().includes(term)),
          );
          return (
            <Table
              label="Stock"
              head={["Product", "SKU", "Stock", "Alert at", ""]}
              minWidth={620}
              empty={rows.length ? undefined : "Nothing matches."}
            >
              {rows.map((r) => {
                const low = r.stock <= r.low_stock_threshold;
                return (
                  <tr
                    key={r.id}
                    className={cx(
                      "hover:bg-cream/50",
                      !r.is_active && "text-soft-ink",
                    )}
                  >
                    <Td>
                      <Link
                        to={admin.product(r.product_id)}
                        className="font-medium text-ink hover:underline"
                      >
                        {r.products?.name}
                      </Link>
                      {r.title !== "Default" && (
                        <span className="block type-caption text-soft-ink">
                          {r.title}
                        </span>
                      )}
                      {(!r.is_active || r.products?.status !== "active") && (
                        <span className="block type-caption text-soft-ink">
                          Not on sale
                        </span>
                      )}
                    </Td>
                    <Td className="text-soft-ink">{r.sku}</Td>
                    <Td>
                      <span
                        className={cx(
                          "figures font-semibold",
                          r.stock === 0
                            ? "text-error"
                            : low
                              ? "text-warning"
                              : "text-ink",
                        )}
                      >
                        {r.stock}
                        {r.stock === 0 ? " · Sold out" : low ? " · Low" : ""}
                      </span>
                    </Td>
                    <Td className="figures text-soft-ink">
                      {r.low_stock_threshold}
                    </Td>
                    <Td className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditing(r)}
                        aria-label={`Set stock for ${r.sku}`}
                      >
                        Set stock
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          );
        }}
      </QueryView>

      <Panel title="Recent stock changes" className="mt-8">
        <QueryView query={moves}>
          {(list) =>
            list.length === 0 ? (
              <p className="type-body text-soft-ink">No changes yet.</p>
            ) : (
              <ul className="divide-y divide-sand-line">
                {list.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-ink">
                        {m.products?.name ?? m.sku}
                      </span>{" "}
                      <span className="type-caption text-soft-ink">
                        {m.sku} · {REASON[m.reason] ?? m.reason}
                        {m.note ? ` · ${m.note}` : ""}
                      </span>
                    </span>
                    <span className="type-caption text-soft-ink">
                      <span
                        className={cx(
                          "figures font-semibold",
                          m.delta < 0 ? "text-terracotta-deep" : "text-success",
                        )}
                      >
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </span>{" "}
                      → <span className="figures">{m.stock_after}</span> ·{" "}
                      {formatDateTime(m.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryView>
      </Panel>

      {editing && (
        <StockDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.show("Stock saved.", "success");
            forgetAdmin("dashboard", "products");
            void refreshAdmin("inventory", fetchStock);
            void refreshAdmin("movements", fetchMovements);
          }}
        />
      )}
    </AdminPage>
  );
}

export default InventoryPage;
