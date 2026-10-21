import { useState } from "react";
import AdminPage from "../components/AdminPage";
import Pager from "../components/Pager";
import QueryView from "../components/QueryView";
import Table, { Td } from "../components/Table";
import { useAdminQuery } from "../lib/data";
import { fetchActivity } from "../services/settings";
import { formatDateTime } from "../../utils/formatDate";

/** Who changed what in the admin, newest first. */
function ActivityPage() {
  const [page, setPage] = useState(0);
  const query = useAdminQuery(
    `activity:${page}`,
    () => fetchActivity(page),
    15_000,
  );
  return (
    <AdminPage
      title="Activity"
      description="Every change made in the admin is recorded here."
    >
      <QueryView query={query}>
        {({ rows, total }) => (
          <>
            <Table
              label="Activity"
              head={["When", "What", "Area"]}
              minWidth={560}
              empty={rows.length ? undefined : "Nothing yet."}
            >
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap text-soft-ink">
                    {formatDateTime(r.created_at)}
                  </Td>
                  <Td className="text-ink">{r.summary || r.action}</Td>
                  <Td className="text-soft-ink">{r.entity}</Td>
                </tr>
              ))}
            </Table>
            <Pager page={page} pageSize={50} total={total} onPage={setPage} />
          </>
        )}
      </QueryView>
    </AdminPage>
  );
}

export default ActivityPage;
