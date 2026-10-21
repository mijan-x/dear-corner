import { Link, useSearchParams } from "react-router";
import AdminPage from "../components/AdminPage";
import Pager from "../components/Pager";
import QueryView from "../components/QueryView";
import SearchBox from "../components/SearchBox";
import Table, { Td } from "../components/Table";
import { db, must, useAdminQuery } from "../lib/data";
import { admin } from "../lib/paths";
import { formatPrice } from "../../utils/formatPrice";
import { formatDate } from "../../utils/formatDate";

const PAGE = 50;

type Customer = {
  kind: "account" | "guest";
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  since: string;
  orders_count: number;
  delivered_total: number;
  last_order_at: string | null;
};

async function fetchCustomers(search: string, page: number) {
  const data = must(
    await (
      await db()
    ).rpc("admin_customers", {
      p_search: search || undefined,
      p_limit: PAGE,
      p_offset: page * PAGE,
    }),
  ) as { total: number; rows: Customer[] };
  return data;
}

/** Account holders and guest buyers (grouped by phone) with their orders. */
function CustomersPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const query = useAdminQuery(
    `customers:${search}:${page}`,
    () => fetchCustomers(search, page),
    60_000,
  );
  return (
    <AdminPage
      title="Customers"
      description="People with an account, and guests grouped by phone number."
    >
      <div className="mb-4">
        <SearchBox
          label="Search customers"
          placeholder="Name, phone or email"
          value={search}
          onChange={(q) => setParams(q ? { q } : {}, { replace: true })}
        />
      </div>
      <QueryView query={query}>
        {({ rows, total }) => (
          <>
            <Table
              label="Customers"
              head={[
                "Customer",
                "Contact",
                "Orders",
                "Delivered",
                "Last order",
              ]}
              empty={rows.length ? undefined : "No customers match."}
            >
              {rows.map((c) => (
                <tr key={`${c.kind}:${c.key}`} className="hover:bg-cream/50">
                  <Td>
                    <span className="font-medium text-ink">
                      {c.name || "No name yet"}
                    </span>
                    <span className="block type-caption text-soft-ink">
                      {c.kind === "account"
                        ? `Account since ${formatDate(c.since)}`
                        : "Guest"}
                    </span>
                  </Td>
                  <Td>
                    {c.phone && (
                      <span className="block figures">{c.phone}</span>
                    )}
                    {c.email && (
                      <span className="block type-caption text-soft-ink">
                        {c.email}
                      </span>
                    )}
                  </Td>
                  <Td className="figures">
                    {c.orders_count > 0 && c.phone ? (
                      <Link
                        to={`${admin.orders}?q=${c.phone}`}
                        className="link"
                      >
                        {c.orders_count}
                      </Link>
                    ) : (
                      c.orders_count
                    )}
                  </Td>
                  <Td className="figures">{formatPrice(c.delivered_total)}</Td>
                  <Td className="whitespace-nowrap text-soft-ink">
                    {c.last_order_at ? formatDate(c.last_order_at) : "—"}
                  </Td>
                </tr>
              ))}
            </Table>
            <Pager
              page={page}
              pageSize={PAGE}
              total={total}
              onPage={(p) => {
                const next = new URLSearchParams(params);
                if (p) next.set("page", String(p));
                else next.delete("page");
                setParams(next, { replace: true });
              }}
            />
          </>
        )}
      </QueryView>
    </AdminPage>
  );
}

export default CustomersPage;
