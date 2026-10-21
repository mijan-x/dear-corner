import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Download } from "lucide-react";
import AdminPage from "../components/AdminPage";
import Pager from "../components/Pager";
import QueryView from "../components/QueryView";
import SearchBox from "../components/SearchBox";
import Table, { Td } from "../components/Table";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/useToast";
import StatusChip from "../../components/order/StatusChip";
import { useAdminQuery } from "../lib/data";
import { admin } from "../lib/paths";
import {
  downloadFile,
  exportOrdersCsv,
  fetchOrders,
  ORDER_STATUSES,
  PAGE_SIZE,
  type OrderFilters,
} from "../services/orders";
import { orderStatusLabel, type OrderStatus } from "../../services/orders";
import { toShopError } from "../../lib/errors";
import { formatPrice } from "../../utils/formatPrice";
import { formatDateTime } from "../../utils/formatDate";
import { cx } from "../../utils/cx";

/** Every order (newest first) with status, search, dates and CSV export. */
function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const filters: OrderFilters = {
    status: (params.get("status") as OrderStatus | null) ?? "",
    search: params.get("q") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    page: Math.max(0, Number(params.get("page") ?? 0) || 0),
  };
  const query = useAdminQuery(
    `orders:${JSON.stringify(filters)}`,
    () => fetchOrders(filters),
    15_000,
  );

  const set = (
    patch: Partial<Record<"status" | "q" | "from" | "to" | "page", string>>,
  ) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const csv = await exportOrdersCsv(filters);
      if (!csv) toast.show("No orders match these filters.", "info");
      else
        downloadFile(
          `dear-corner-orders-${new Date().toISOString().slice(0, 10)}.csv`,
          csv,
        );
    } catch (e) {
      toast.show(toShopError(e).message, "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminPage
      title="Orders"
      description="Call each new order to confirm it, then move it along as it ships."
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={exportCsv}
          loading={exporting}
          loadingLabel="Preparing the file"
        >
          <Download size={18} aria-hidden="true" />
          Export CSV
        </Button>
      }
    >
      <div
        className="mb-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto pb-1"
        role="group"
        aria-label="Status"
      >
        {(["", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s || "all"}
            type="button"
            aria-pressed={filters.status === s}
            onClick={() => set({ status: s })}
            className={cx(
              "h-10 shrink-0 rounded-full border px-4 type-nav whitespace-nowrap transition-colors",
              filters.status === s
                ? "border-rosewood bg-rosewood text-white"
                : "border-sand-line bg-paper text-ink hover:border-rosewood",
            )}
          >
            {s ? orderStatusLabel[s] : "All"}
          </button>
        ))}
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_170px_170px] md:items-end">
        <SearchBox
          label="Search orders"
          placeholder="Order number, name or phone"
          value={filters.search}
          onChange={(q) => set({ q })}
        />
        <TextField
          label="From"
          type="date"
          value={filters.from}
          onChange={(e) => set({ from: e.target.value })}
          inputClassName="h-11"
        />
        <TextField
          label="To"
          type="date"
          value={filters.to}
          onChange={(e) => set({ to: e.target.value })}
          inputClassName="h-11"
        />
      </div>

      <QueryView query={query}>
        {({ rows, total }) => (
          <>
            <Table
              label="Orders"
              head={["Order", "Placed", "Customer", "Area", "Total", "Status"]}
              empty={rows.length ? undefined : "No orders match."}
            >
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-cream/50">
                  <Td>
                    <Link
                      to={admin.order(o.id)}
                      className="font-semibold whitespace-nowrap text-ink hover:underline"
                    >
                      <span className="figures">{o.order_number}</span>
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-soft-ink">
                    {formatDateTime(o.created_at)}
                  </Td>
                  <Td>
                    {o.customer_name}
                    <span className="block type-caption figures text-soft-ink">
                      {o.phone}
                    </span>
                  </Td>
                  <Td className="text-soft-ink">
                    {o.area}, {o.district}
                  </Td>
                  <Td className="figures font-semibold whitespace-nowrap">
                    {formatPrice(o.total)}
                  </Td>
                  <Td>
                    <StatusChip status={o.status} />
                  </Td>
                </tr>
              ))}
            </Table>
            <Pager
              page={filters.page}
              pageSize={PAGE_SIZE}
              total={total}
              onPage={(p) => set({ page: p ? String(p) : "" })}
            />
          </>
        )}
      </QueryView>
    </AdminPage>
  );
}

export default OrdersPage;
