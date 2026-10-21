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
  deleteCollection,
  fetchCollections,
  saveCollection,
  type CollectionRow,
} from "../services/taxonomy";
import { toShopError } from "../../lib/errors";

type Rule = CollectionRow["rule"];
const RULES: { value: Rule; label: string }[] = [
  { value: "manual", label: "Products I pick" },
  { value: "new_arrivals", label: "New arrivals (automatic)" },
  { value: "max_price", label: "Under a price (automatic)" },
  { value: "on_sale", label: "On sale (automatic)" },
  { value: "bestsellers", label: "Bestsellers (automatic)" },
  { value: "gifts", label: "Gifts (automatic)" },
];
const ruleLabel = (r: Rule) => RULES.find((x) => x.value === r)?.label ?? r;

function CollectionDialog({
  collection,
  onClose,
  onSaved,
}: {
  collection: CollectionRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: collection?.name ?? "",
    slug: collection?.slug ?? "",
    rule: (collection?.rule ?? "manual") as Rule,
    rule_value: collection?.rule_value ? String(collection.rule_value) : "",
    intro: collection?.intro ?? "",
    description: collection?.description ?? "",
    card_image_path: collection?.card_image_path ?? null,
    banner_desktop_path: collection?.banner_desktop_path ?? null,
    banner_mobile_path: collection?.banner_mobile_path ?? null,
    position: String(collection?.position ?? 0),
    is_active: collection?.is_active ?? true,
    show_in_nav: collection?.show_in_nav ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const folder = `collections/${collection?.id ?? "new"}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!f.name.trim()) return setError("Give the collection a name.");
    if (f.rule === "max_price" && !Number(f.rule_value))
      return setError("Enter the price limit, for example 999.");
    setBusy(true);
    setError(null);
    try {
      await saveCollection(
        {
          ...f,
          name: f.name.trim(),
          slug: slugify(f.slug || f.name),
          rule_value: f.rule === "max_price" ? Number(f.rule_value) : null,
          position: Number(f.position) || 0,
        },
        collection?.id,
      );
      onSaved();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(
        code === "23505"
          ? "Another collection already uses this web address."
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
      title={collection ? `Edit ${collection.name}` : "New collection"}
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
          helper={`/collections/${slugify(f.slug || f.name) || "…"}`}
        />
        <SelectField
          label="Which products"
          value={f.rule}
          onChange={(e) => set({ rule: e.target.value as Rule })}
          helper={
            f.rule === "manual"
              ? "Tick this collection on each product's page."
              : "Fills itself from the products' details."
          }
        >
          {RULES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </SelectField>
        {f.rule === "max_price" && (
          <TextField
            label="Price limit (৳)"
            inputMode="numeric"
            value={f.rule_value}
            onChange={(e) =>
              set({ rule_value: e.target.value.replace(/\D/g, "") })
            }
          />
        )}
        <TextField
          label="Intro"
          optional
          maxLength={200}
          value={f.intro}
          onChange={(e) => set({ intro: e.target.value })}
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
          label="Card photo"
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
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} loadingLabel="Saving">
            Save collection
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CollectionsPage() {
  const toast = useToast();
  const query = useAdminQuery("collections", fetchCollections);
  const [editing, setEditing] = useState<CollectionRow | "new" | null>(null);
  const [removing, setRemoving] = useState<CollectionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = () => {
    forgetAdmin("collection-options");
    void refreshAdmin("collections", fetchCollections);
  };
  return (
    <AdminPage
      title="Collections"
      tabs={<Tabs items={productTabs} label="Catalog" />}
      actions={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={18} aria-hidden="true" />
          New collection
        </Button>
      }
    >
      <QueryView query={query}>
        {(rows) => (
          <Table
            label="Collections"
            head={["Collection", "Products", "Menu", "Shop", ""]}
            minWidth={600}
            empty={rows.length ? undefined : "No collections yet."}
          >
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-cream/50">
                <Td>
                  <span className="font-semibold text-ink">{c.name}</span>
                  <span className="block type-caption text-soft-ink">
                    /collections/{c.slug}
                  </span>
                </Td>
                <Td>
                  {c.rule === "manual"
                    ? `${(c.product_collections as unknown as { count: number }[])[0]?.count ?? 0} picked`
                    : c.rule === "max_price"
                      ? `Under ৳${c.rule_value}`
                      : ruleLabel(c.rule)}
                </Td>
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
        <CollectionDialog
          collection={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.show("Collection saved.", "success");
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        title={`Delete ${removing?.name ?? ""}?`}
        confirmLabel="Delete collection"
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(true);
          try {
            await deleteCollection(removing.id);
            toast.show("Collection deleted.", "success");
            reload();
          } catch (e) {
            toast.show(toShopError(e).message, "error");
          } finally {
            setBusy(false);
            setRemoving(null);
          }
        }}
      >
        Its products stay in the shop; only the collection page goes away.
      </ConfirmDialog>
    </AdminPage>
  );
}

export default CollectionsPage;
