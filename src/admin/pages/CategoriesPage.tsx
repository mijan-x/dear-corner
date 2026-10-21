import { useState, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import AdminPage from "../components/AdminPage";
import ConfirmDialog from "../components/ConfirmDialog";
import ImageField from "../components/ImageField";
import QueryView from "../components/QueryView";
import Table, { Td } from "../components/Table";
import Tabs from "../components/Tabs";
import Toggle from "../components/Toggle";
import { Button } from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import Notice from "../../components/ui/Notice";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "../../components/ui/Field";
import { useToast } from "../../components/ui/useToast";
import { forgetAdmin, refreshAdmin, useAdminQuery } from "../lib/data";
import { slugify } from "../lib/slug";
import { productTabs } from "../lib/tabs";
import {
  deleteCategory,
  fetchCategories,
  inUse,
  saveCategory,
  type CategoryRow,
} from "../services/taxonomy";
import { toShopError } from "../../lib/errors";

type Row = Awaited<ReturnType<typeof fetchCategories>>[number];

function CategoryDialog({
  category,
  parents,
  onClose,
  onSaved,
}: {
  category: CategoryRow | null;
  parents: CategoryRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    parent_id: category?.parent_id ?? "",
    intro: category?.intro ?? "",
    description: category?.description ?? "",
    card_image_path: category?.card_image_path ?? null,
    banner_desktop_path: category?.banner_desktop_path ?? null,
    banner_mobile_path: category?.banner_mobile_path ?? null,
    position: String(category?.position ?? 0),
    is_active: category?.is_active ?? true,
    show_in_nav: category?.show_in_nav ?? true,
    seo_title: category?.seo_title ?? "",
    seo_description: category?.seo_description ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const folder = `categories/${category?.id ?? "new"}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!f.name.trim()) return setError("Give the category a name.");
    setBusy(true);
    setError(null);
    try {
      await saveCategory(
        {
          ...f,
          name: f.name.trim(),
          slug: slugify(f.slug || f.name),
          parent_id: f.parent_id || null,
          position: Number(f.position) || 0,
          seo_title: f.seo_title || null,
          seo_description: f.seo_description || null,
        },
        category?.id,
      );
      onSaved();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(
        code === "23505"
          ? "Another category already uses this web address."
          : toShopError(e).message,
      );
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      variant="modal"
      title={category ? `Edit ${category.name}` : "New category"}
      bodyClassName="px-5 pb-6 md:px-7"
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          label="Name"
          maxLength={80}
          value={f.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <TextField
          label="Web address"
          optional
          value={f.slug}
          onChange={(e) => set({ slug: e.target.value })}
          helper={`/shop/${slugify(f.slug || f.name) || "…"}`}
        />
        <SelectField
          label="Inside"
          value={f.parent_id}
          onChange={(e) => set({ parent_id: e.target.value })}
          helper="Sub-categories show as chips on their parent's page."
        >
          <option value="">Top level</option>
          {parents
            .filter((p) => p.id !== category?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </SelectField>
        <TextField
          label="Intro"
          optional
          maxLength={200}
          value={f.intro}
          onChange={(e) => set({ intro: e.target.value })}
          helper="One line under the title."
        />
        <TextAreaField
          label="Description"
          optional
          rows={3}
          maxLength={2000}
          value={f.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <ImageField
          label="Card photo (homepage and menu)"
          value={f.card_image_path}
          onChange={(p) => set({ card_image_path: p })}
          folder={folder}
          aspect="aspect-[4/5] max-w-[220px]"
          longest={1000}
        />
        <ImageField
          label="Banner, desktop (4:1)"
          value={f.banner_desktop_path}
          onChange={(p) => set({ banner_desktop_path: p })}
          folder={folder}
          aspect="aspect-[4/1]"
          longest={2000}
        />
        <ImageField
          label="Banner, phone (2:1)"
          value={f.banner_mobile_path}
          onChange={(p) => set({ banner_mobile_path: p })}
          folder={folder}
          aspect="aspect-[2/1] max-w-[320px]"
          longest={1000}
        />
        <TextField
          label="Order"
          inputMode="numeric"
          value={f.position}
          onChange={(e) => set({ position: e.target.value.replace(/\D/g, "") })}
          helper="Lower numbers come first."
        />
        <Toggle
          label="Visible in the shop"
          checked={f.is_active}
          onChange={(v) => set({ is_active: v })}
        />
        <Toggle
          label="In the menu"
          checked={f.show_in_nav}
          onChange={(v) => set({ show_in_nav: v })}
        />
        <TextField
          label="Search engine title"
          optional
          maxLength={70}
          value={f.seo_title}
          onChange={(e) => set({ seo_title: e.target.value })}
        />
        <TextAreaField
          label="Search engine description"
          optional
          rows={2}
          maxLength={170}
          value={f.seo_description}
          onChange={(e) => set({ seo_description: e.target.value })}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} loadingLabel="Saving">
            Save category
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CategoriesPage() {
  const toast = useToast();
  const query = useAdminQuery("categories", fetchCategories);
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = () => {
    forgetAdmin("category-options");
    void refreshAdmin("categories", fetchCategories);
  };
  const rows = query.data ?? [];
  const ordered = rows
    .filter((c) => !c.parent_id)
    .flatMap((p) => [p, ...rows.filter((c) => c.parent_id === p.id)]);
  const count = (c: Row) =>
    (c.products as unknown as { count: number }[])[0]?.count ?? 0;

  return (
    <AdminPage
      title="Categories"
      tabs={<Tabs items={productTabs} label="Catalog" />}
      actions={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={18} aria-hidden="true" />
          New category
        </Button>
      }
    >
      <QueryView query={query}>
        {() => (
          <Table
            label="Categories"
            head={["Category", "Products", "Menu", "Shop", ""]}
            minWidth={600}
          >
            {ordered.map((c) => (
              <tr key={c.id} className="hover:bg-cream/50">
                <Td>
                  <span
                    className={
                      c.parent_id ? "pl-6 text-ink" : "font-semibold text-ink"
                    }
                  >
                    {c.parent_id && (
                      <span aria-hidden="true" className="mr-2 text-soft-ink">
                        └
                      </span>
                    )}
                    {c.name}
                  </span>
                  <span className="block type-caption text-soft-ink">
                    /shop/{c.slug}
                  </span>
                </Td>
                <Td className="figures">{count(c)}</Td>
                <Td>{c.show_in_nav ? "Shown" : "Hidden"}</Td>
                <Td>{c.is_active ? "Visible" : "Hidden"}</Td>
                <Td className="text-right whitespace-nowrap">
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setEditing(c)}
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setRemoving(c)}
                    aria-label={`Delete ${c.name}`}
                  >
                    Delete
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </QueryView>
      {editing && (
        <CategoryDialog
          category={editing === "new" ? null : editing}
          parents={rows.filter((c) => !c.parent_id)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.show("Category saved.", "success");
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        title={`Delete ${removing?.name ?? ""}?`}
        confirmLabel="Delete category"
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(true);
          try {
            await deleteCategory(removing.id);
            toast.show("Category deleted.", "success");
            reload();
          } catch (e) {
            toast.show(
              inUse(e)
                ? "It still has products or sub-categories. Move them first, or hide it instead."
                : toShopError(e).message,
              "error",
            );
          } finally {
            setBusy(false);
            setRemoving(null);
          }
        }}
      >
        Only empty categories can be deleted. To keep it but take it out of the
        shop, edit it and turn off “Visible in the shop”.
      </ConfirmDialog>
    </AdminPage>
  );
}

export default CategoriesPage;
