import { Link } from "react-router";
import { AlertTriangle, Mail, ShoppingBag, Star, Wallet } from "lucide-react";
import AdminPage from "../components/AdminPage";
import Panel from "../components/Panel";
import QueryView from "../components/QueryView";
import Table, { Td } from "../components/Table";
import StatusChip from "../../components/order/StatusChip";
import { useAdminQuery } from "../lib/data";
import { admin } from "../lib/paths";
import { fetchDashboard } from "../services/dashboard";
import { formatPrice } from "../../utils/formatPrice";
import { formatDateTime } from "../../utils/formatDate";

function Stat({
  label,
  value,
  icon,
  to,
  alert,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  to?: string;
  alert?: boolean;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className={alert ? "text-terracotta-deep" : "text-rosewood"}
      >
        {icon}
      </span>
      <span className="mt-3 block figures text-[28px] leading-none font-bold text-ink">
        {value}
      </span>
      <span className="mt-1.5 block type-caption text-soft-ink">{label}</span>
    </>
  );
  const cls =
    "block rounded-card border border-sand-line bg-paper p-5 transition-shadow hover:shadow-[0_8px_30px_-14px_rgb(43_33_35/0.25)]";
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Today at a glance: new orders, takings, things waiting. */
function DashboardPage() {
  const query = useAdminQuery("dashboard", fetchDashboard);
  return (
    <AdminPage title="Dashboard" description="Today in Bangladesh time.">
      <QueryView query={query}>
        {(d) => (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
              <Stat
                label="Orders today"
                value={d.todayOrders}
                icon={<ShoppingBag size={22} />}
                to={admin.orders}
              />
              <Stat
                label="Sales today"
                value={formatPrice(d.todayRevenue)}
                icon={<Wallet size={22} />}
              />
              <Stat
                label="Waiting for a call"
                value={d.pendingOrders}
                icon={<ShoppingBag size={22} />}
                to={`${admin.orders}?status=placed`}
                alert={d.pendingOrders > 0}
              />
              <Stat
                label="Reviews to check"
                value={d.pendingReviews}
                icon={<Star size={22} />}
                to={admin.reviews}
                alert={d.pendingReviews > 0}
              />
              <Stat
                label="New messages"
                value={d.newMessages}
                icon={<Mail size={22} />}
                to={admin.messages}
                alert={d.newMessages > 0}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="type-h3 text-ink">Latest orders</h2>
                  <Link to={admin.orders} className="type-nav link">
                    All orders
                  </Link>
                </div>
                <Table
                  label="Latest orders"
                  minWidth={560}
                  head={["Order", "Customer", "Total", "Status"]}
                  empty={d.recentOrders.length ? undefined : "No orders yet."}
                >
                  {d.recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-cream/50">
                      <Td>
                        <Link
                          to={admin.order(o.id)}
                          className="font-semibold text-ink hover:underline"
                        >
                          <span className="figures">{o.orderNumber}</span>
                        </Link>
                        <span className="block type-caption text-soft-ink">
                          {formatDateTime(o.createdAt)}
                        </span>
                      </Td>
                      <Td>
                        {o.customerName}
                        <span className="block type-caption text-soft-ink">
                          {o.district}
                        </span>
                      </Td>
                      <Td className="figures font-semibold">
                        {formatPrice(o.total)}
                      </Td>
                      <Td>
                        <StatusChip status={o.status} />
                      </Td>
                    </tr>
                  ))}
                </Table>
              </div>

              <Panel
                title={
                  <span className="flex items-center gap-2">
                    <AlertTriangle
                      size={20}
                      aria-hidden="true"
                      className="text-warning"
                    />
                    Low stock ({d.lowStockCount})
                  </span>
                }
                actions={
                  <Link to={admin.inventory} className="type-nav link">
                    Inventory
                  </Link>
                }
              >
                {d.lowStock.length === 0 ? (
                  <p className="type-body text-soft-ink">
                    Everything is well stocked.
                  </p>
                ) : (
                  <ul className="divide-y divide-sand-line">
                    {d.lowStock.map((v) => (
                      <li
                        key={v.variantId}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <span className="min-w-0">
                          <Link
                            to={admin.product(v.productId)}
                            className="block truncate font-medium text-ink hover:underline"
                          >
                            {v.productName}
                          </Link>
                          <span className="type-caption text-soft-ink">
                            {v.variantTitle !== "Default"
                              ? `${v.variantTitle} · `
                              : ""}
                            {v.sku}
                          </span>
                        </span>
                        <span
                          className={
                            v.stock === 0
                              ? "font-semibold text-error"
                              : "font-semibold text-warning"
                          }
                        >
                          {v.stock === 0 ? "Sold out" : `${v.stock} left`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        )}
      </QueryView>
    </AdminPage>
  );
}

export default DashboardPage;
