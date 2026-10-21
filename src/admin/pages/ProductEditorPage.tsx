import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { ExternalLink, Save } from "lucide-react";
import AdminPage from "../components/AdminPage";
import Panel from "../components/Panel";
import QueryView from "../components/QueryView";
import Toggle from "../components/Toggle";
import OptionsEditor from "../components/product/OptionsEditor";
import PhotosEditor from "../components/product/PhotosEditor";
import VariantsTable from "../components/product/VariantsTable";
import { Button } from "../../components/ui/Button";
import { Checkbox } from "../../components/ui/Choice";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "../../components/ui/Field";
import Notice from "../../components/ui/Notice";
import { useToast } from "../../components/ui/useToast";
import { forgetAdmin, refreshAdmin, useAdminQuery } from "../lib/data";
import { removeFiles } from "../lib/images";
import { admin } from "../lib/paths";
import {
  emptyForm,
  generateVariants,
  toForm,
  toPayload,
  type ProductForm,
} from "../lib/productForm";
import {
  categoryLabel,
  fetchCategoryOptions,
  fetchCollectionOptions,
  fetchProduct,
  saveProduct,
  type ProductStatus,
} from "../services/catalog";
import { toShopError } from "../../lib/errors";
import { routes } from "../../lib/routes";

function Editor({ initial }: { initial: ProductForm }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: categories = [] } = useAdminQuery(
    "category-options",
    fetchCategoryOptions,
    60_000,
  );
  const { data: collections = [] } = useAdminQuery(
    "collection-options",
    fetchCollectionOptions,
    60_000,
  );
  const manual = collections.filter((c) => c.rule === "manual");
  const set = (patch: Partial<ProductForm>) =>
    setForm((f) => ({ ...f, ...patch }));
  const colorOption = form.options.find((o) => o.isColor);

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!form.name.trim()) return setError("Give the product a name.");
    if (!form.categoryId) return setError("Choose a category.");
    if (form.options.some((o) => !o.values.length))
      return setError("Every option needs at least one value.");
    setBusy(true);
    setError(null);
    try {
      const result = await saveProduct(toPayload(form));
      await removeFiles(
        "product-images",
        result.deleted_image_paths.flatMap((d) => [d.path, d.thumb]),
      ).catch(() => {});
      forgetAdmin("products", "dashboard", "inventory");
      toast.show(
        form.id ? "Product saved." : "Product created. Now add its photos.",
        "success",
      );
      // The page reloads the saved product (new ids, cleaned values).
      await refreshAdmin(`product:${result.id}`, () => fetchProduct(result.id));
      if (!form.id) navigate(admin.product(result.id), { replace: true });
    } catch (e) {
      setError(toShopError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={save}
      noValidate
      className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="min-w-0 space-y-6">
        <Panel title="Basics">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              maxLength={140}
              className="md:col-span-2"
            />
            <TextField
              label="Web address"
              optional
              value={form.slug}
              onChange={(e) => set({ slug: e.target.value })}
              helper={`dearcorner…/products/${form.slug || "made-from-the-name"}`}
            />
            <SelectField
              label="Category"
              value={form.categoryId}
              onChange={(e) => set({ categoryId: e.target.value })}
              placeholder="Choose a category"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabel(categories, c.id)}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label="Short description"
              optional
              rows={2}
              maxLength={300}
              value={form.shortDescription}
              onChange={(e) => set({ shortDescription: e.target.value })}
              helper="One or two lines under the price."
              className="md:col-span-2"
            />
            <TextAreaField
              label="Description"
              optional
              rows={6}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              className="md:col-span-2"
            />
            <TextAreaField
              label="Details and care"
              optional
              rows={4}
              value={form.detailsAndCare}
              onChange={(e) => set({ detailsAndCare: e.target.value })}
              helper="Size, material, how to clean. One item per line."
              className="md:col-span-2"
            />
          </div>
        </Panel>

        <Panel title="Photos">
          <PhotosEditor
            productId={form.id}
            images={form.images}
            colorOption={colorOption}
            onChange={(images) => set({ images })}
          />
        </Panel>

        <Panel title="Options and variants">
          <p className="mb-4 type-body text-soft-ink">
            No options means one variant. Add Color or Size to sell each
            combination as its own SKU with its own price and stock.
          </p>
          <OptionsEditor
            options={form.options}
            onChange={(options, structural) =>
              setForm((f) => {
                const next = { ...f, options };
                return structural
                  ? { ...next, variants: generateVariants(next) }
                  : next;
              })
            }
          />
          <div className="mt-6">
            <VariantsTable
              form={form}
              images={form.images}
              onChange={(variants) => set({ variants })}
            />
          </div>
        </Panel>

        <Panel title="Search engines">
          <div className="grid gap-5">
            <TextField
              label="Page title"
              optional
              maxLength={70}
              value={form.seoTitle}
              onChange={(e) => set({ seoTitle: e.target.value })}
              helper="Leave empty to use the name."
            />
            <TextAreaField
              label="Description"
              optional
              rows={2}
              maxLength={160}
              value={form.seoDescription}
              onChange={(e) => set({ seoDescription: e.target.value })}
            />
          </div>
        </Panel>
      </div>

      {/* Below 1536px the side column sits under the form: keep Save in reach. */}
      <div className="sticky bottom-0 z-20 -mx-4 flex items-center justify-end gap-3 border-t border-sand-line bg-paper/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8 2xl:hidden">
        {error && (
          <p className="mr-auto line-clamp-2 type-caption text-error">
            {error}
          </p>
        )}
        <Button type="submit" loading={busy} loadingLabel="Saving the product">
          <Save size={18} aria-hidden="true" />
          {form.id ? "Save product" : "Create product"}
        </Button>
      </div>

      <div className="space-y-6 2xl:sticky 2xl:top-6 2xl:self-start">
        <Panel title="Visibility">
          <SelectField
            label="Status"
            value={form.status}
            onChange={(e) => set({ status: e.target.value as ProductStatus })}
          >
            <option value="draft">Draft (hidden)</option>
            <option value="active">Active (in the shop)</option>
            <option value="archived">Archived (hidden, kept for orders)</option>
          </SelectField>
          <div className="mt-4 space-y-1">
            <Toggle
              label="Bestseller badge"
              checked={form.isBestseller}
              onChange={(v) => set({ isBestseller: v })}
            />
            <Toggle
              label="Gift badge"
              checked={form.isGift}
              onChange={(v) => set({ isGift: v })}
            />
            <Toggle
              label="Featured"
              checked={form.isFeatured}
              onChange={(v) => set({ isFeatured: v })}
            />
          </div>
          {form.isFeatured && (
            <TextField
              label="Featured order"
              optional
              inputMode="numeric"
              value={form.featuredRank}
              onChange={(e) =>
                set({ featuredRank: e.target.value.replace(/\D/g, "") })
              }
              className="mt-3"
            />
          )}
          <TextField
            label="New until"
            optional
            type="date"
            value={form.newUntil}
            onChange={(e) => set({ newUntil: e.target.value })}
            helper="Shows the New badge until this day (30 days after publishing by default)."
            className="mt-4"
          />
        </Panel>

        <Panel title="Collections">
          {manual.length === 0 ? (
            <p className="type-body text-soft-ink">
              Automatic collections (New arrivals, Gifts under ৳999…) fill
              themselves.
            </p>
          ) : (
            manual.map((c) => (
              <Checkbox
                key={c.id}
                label={c.name}
                checked={form.collectionIds.includes(c.id)}
                onChange={(e) =>
                  set({
                    collectionIds: e.target.checked
                      ? [...form.collectionIds, c.id]
                      : form.collectionIds.filter((x) => x !== c.id),
                  })
                }
              />
            ))
          )}
        </Panel>

        <div className="space-y-3 rounded-card border border-sand-line bg-paper p-5">
          {error && <Notice tone="error">{error}</Notice>}
          <Button
            type="submit"
            fullWidth
            loading={busy}
            loadingLabel="Saving the product"
          >
            <Save size={18} aria-hidden="true" />
            {form.id ? "Save product" : "Create product"}
          </Button>
          {form.id && form.status === "active" && (
            <a
              href={routes.product(form.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center gap-1.5 type-nav link"
            >
              See it in the shop <ExternalLink size={15} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
          {form.isSample && (
            <p className="type-caption text-soft-ink">
              Sample product: removed with “Remove sample data” in Settings.
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

/** Create or edit a product with its options, variants and photos. */
function ProductEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const query = useAdminQuery(
    isNew ? null : `product:${id}`,
    () => fetchProduct(id ?? ""),
    60_000,
  );
  return (
    <AdminPage
      title={isNew ? "New product" : (query.data?.name ?? "Product")}
      back={{ to: admin.products, label: "All products" }}
    >
      {isNew ? (
        <Editor initial={emptyForm()} />
      ) : (
        <QueryView query={query}>
          {(p) =>
            p ? (
              <Editor key={p.id + p.updated_at} initial={toForm(p)} />
            ) : (
              <Notice tone="info">This product doesn&rsquo;t exist.</Notice>
            )
          }
        </QueryView>
      )}
    </AdminPage>
  );
}

export default ProductEditorPage;
