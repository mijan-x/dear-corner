import { Link, useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import AdminPage from "../components/AdminPage";
import Pager from "../components/Pager";
import QueryView from "../components/QueryView";
import SearchBox from "../components/SearchBox";
import Table, { Td } from "../components/Table";
import Tabs from "../components/Tabs";
import { ButtonLink } from "../../components/ui/Button";
import { SelectField } from "../../components/ui/Field";
import LeafSprig from "../../components/brand/LeafSprig";
import { useAdminQuery } from "../lib/data";
import { admin } from "../lib/paths";
import { productTabs } from "../lib/tabs";
import {
  categoryLabel,
  fetchCategoryOptions,
  fetchProducts,
  PRODUCT_PAGE,
  type ProductListFilters,
  type ProductStatus,
} from "../services/catalog";
import { imageUrl } from "../../lib/images";
import { formatPrice } from "../../utils/formatPrice";
import { cx } from "../../utils/cx";

const STATUS_LOOK: Record<ProductStatus, string> = {
  active: "bg-success-bg text-success",
  draft: "bg-warning-bg text-warning",
  archived: "bg-soft-sand text-soft-ink",
};
const STATUS_WORD: Record<ProductStatus, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
};

function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const filters: ProductListFilters = {
    search: params.get("q") ?? "",
    status: (params.get("status") as ProductStatus | null) ?? "",
    category: params.get("category") ?? "",
    page: Math.max(0, Number(params.get("page") ?? 0) || 0),
  };
  const query = useAdminQuery(`products:${JSON.stringify(filters)}`, () =>
    fetchProducts(filters),
  );
  const { data: categories = [] } = useAdminQuery(
    "category-options",
    fetchCategoryOptions,
    60_000,
  );
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <AdminPage
      title="Products"
      tabs={<Tabs items={productTabs} label="Catalog" />}
      actions={
        <ButtonLink to={admin.newProduct} size="sm">
          <Plus size={18} aria-hidden="true" />
          New product
        </ButtonLink>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_220px] md:items-end">
        <SearchBox
          label="Search products"
          placeholder="Product name"
          value={filters.search}
          onChange={(q) => set({ q })}
        />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </SelectField>
        <SelectField
          label="Category"
          value={filters.category}
          onChange={(e) => set({ category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryLabel(categories, c.id)}
            </option>
          ))}
        </SelectField>
      </div>
      <QueryView query={query}>
        {({ rows, total }) => (
          <>
            <Table
              label="Products"
              head={["Product", "Category", "Price", "Stock", "Status"]}
              empty={rows.length ? undefined : "No products match."}
            >
              {rows.map((p) => {
                const images = (
                  Array.isArray(p.card_images) ? p.card_images : []
                ) as { thumb?: string; path?: string }[];
                const src = imageUrl(images[0]?.thumb ?? images[0]?.path);
                const stock = p.product_variants
                  .filter((v) => v.is_active)
                  .reduce((s, v) => s + v.stock, 0);
                return (
                  <tr key={p.id} className="hover:bg-cream/50">
                    <Td>
                      <Link
                        to={admin.product(p.id)}
                        className="flex items-center gap-3 font-medium text-ink hover:underline"
                      >
                        <span className="size-12 shrink-0 overflow-hidden rounded-control border border-sand-line bg-image-placeholder">
                          {src ? (
                            <img
                              src={src}
                              alt=""
                              width={48}
                              height={48}
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          ) : (
                            <span className="grid size-full place-items-center text-sand-line">
                              <LeafSprig className="h-1/2" />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0">
                          {p.name}
                          <span className="block type-caption font-normal text-soft-ink">
                            {p.variant_count}{" "}
                            {p.variant_count === 1 ? "variant" : "variants"}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-soft-ink">
                      {categoryLabel(categories, p.category_id)}
                    </Td>
                    <Td className="figures whitespace-nowrap">
                      {p.price_min === p.price_max
                        ? formatPrice(p.price_min ?? 0)
                        : `${formatPrice(p.price_min ?? 0)}–${formatPrice(p.price_max ?? 0)}`}
                    </Td>
                    <Td
                      className={cx(
                        "figures",
                        stock === 0 && "font-semibold text-error",
                      )}
                    >
                      {stock === 0 ? "Sold out" : stock}
                    </Td>
                    <Td>
                      <span
                        className={cx(
                          "inline-flex h-7 items-center rounded-full px-2.5 text-[13px] font-semibold",
                          STATUS_LOOK[p.status as ProductStatus],
                        )}
                      >
                        {STATUS_WORD[p.status as ProductStatus]}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </Table>
            <Pager
              page={filters.page}
              pageSize={PRODUCT_PAGE}
              total={total}
              onPage={(n) => set({ page: n ? String(n) : "" })}
            />
          </>
        )}
      </QueryView>
    </AdminPage>
  );
}

export default ProductsPage;
