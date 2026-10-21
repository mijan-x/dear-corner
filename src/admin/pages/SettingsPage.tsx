import { useState, type FormEvent } from "react";
import { Download, Trash2 } from "lucide-react";
import AdminPage from "../components/AdminPage";
import ConfirmDialog from "../components/ConfirmDialog";
import HomepageEditor from "../components/HomepageEditor";
import Panel from "../components/Panel";
import QueryView from "../components/QueryView";
import Toggle from "../components/Toggle";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/useToast";
import { forgetAdmin, refreshAdmin, useAdminQuery } from "../lib/data";
import { downloadFile } from "../services/orders";
import { deleteSampleData } from "../services/catalog";
import {
  fetchSettings,
  newsletterCsv,
  saveSettings,
  type SettingsRow,
} from "../services/settings";
import { fetchShopSettings } from "../../services/settings";
import { fetchQuery, invalidateQuery } from "../../lib/query";
import { toShopError } from "../../lib/errors";
import { cx } from "../../utils/cx";

const refreshShop = async () => {
  invalidateQuery("shop-settings");
  await fetchQuery("shop-settings", fetchShopSettings, { persist: true }).catch(
    () => {},
  );
};

function ShopSettings({ s, onSaved }: { s: SettingsRow; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    announcement_enabled: s.announcement_enabled,
    announcement_text: s.announcement_text,
    announcement_link: s.announcement_link ?? "",
    contact_phone: s.contact_phone,
    contact_whatsapp: s.contact_whatsapp,
    contact_email: s.contact_email,
    contact_address: s.contact_address,
    opening_hours: s.opening_hours,
    reply_time: s.reply_time,
    facebook_url: s.facebook_url,
    instagram_url: s.instagram_url,
    instagram_handle: s.instagram_handle,
    tiktok_url: s.tiktok_url,
    max_open_orders_per_phone: String(s.max_open_orders_per_phone),
    max_quantity_per_item: String(s.max_quantity_per_item),
    max_items_per_order: String(s.max_items_per_order),
  });
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const text = (
    key: keyof typeof f,
    label: string,
    extra: Record<string, unknown> = {},
  ) => (
    <TextField
      label={label}
      optional
      value={f[key] as string}
      onChange={(e) => set({ [key]: e.target.value })}
      {...extra}
    />
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveSettings({
        ...f,
        announcement_link: f.announcement_link || null,
        max_open_orders_per_phone: Number(f.max_open_orders_per_phone) || 3,
        max_quantity_per_item: Number(f.max_quantity_per_item) || 10,
        max_items_per_order: Number(f.max_items_per_order) || 20,
      });
      await refreshShop();
      toast.show("Settings saved.", "success");
      onSaved();
    } catch (e) {
      toast.show(toShopError(e).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Panel title="Announcement bar">
        <Toggle
          label="Show the bar at the top of every page"
          checked={f.announcement_enabled}
          onChange={(v) => set({ announcement_enabled: v })}
        />
        <div className="mt-3 grid gap-5 md:grid-cols-2">
          {text("announcement_text", "Text", {
            maxLength: 140,
            helper:
              "Short enough for one line on phones, for example “Cash on Delivery · Free delivery over ৳1,000”.",
          })}
          {text("announcement_link", "Link", {
            placeholder: "/collections/new-arrivals",
          })}
        </div>
      </Panel>
      <Panel title="Contact details (footer and Contact page)">
        <div className="grid gap-5 md:grid-cols-2">
          {text("contact_phone", "Phone", { inputMode: "tel" })}
          {text("contact_whatsapp", "WhatsApp number", { inputMode: "tel" })}
          {text("contact_email", "Email", { type: "email" })}
          {text("contact_address", "Address")}
          {text("opening_hours", "Opening hours", {
            placeholder: "Sat–Thu, 10 am – 8 pm",
          })}
          {text("reply_time", "We usually reply", {
            placeholder: "within a few hours",
          })}
          {text("facebook_url", "Facebook page", { type: "url" })}
          {text("instagram_url", "Instagram", { type: "url" })}
          {text("instagram_handle", "Instagram handle", {
            placeholder: "@dearcorner.bd",
          })}
          {text("tiktok_url", "TikTok", { type: "url" })}
        </div>
      </Panel>
      <Panel title="Order limits (against fake orders)">
        <div className="grid gap-5 md:grid-cols-3">
          <TextField
            label="Open orders per phone"
            inputMode="numeric"
            value={f.max_open_orders_per_phone}
            onChange={(e) =>
              set({
                max_open_orders_per_phone: e.target.value.replace(/\D/g, ""),
              })
            }
          />
          <TextField
            label="Most of one item"
            inputMode="numeric"
            value={f.max_quantity_per_item}
            onChange={(e) =>
              set({ max_quantity_per_item: e.target.value.replace(/\D/g, "") })
            }
          />
          <TextField
            label="Most lines per order"
            inputMode="numeric"
            value={f.max_items_per_order}
            onChange={(e) =>
              set({ max_items_per_order: e.target.value.replace(/\D/g, "") })
            }
          />
        </div>
      </Panel>
      <div className="flex justify-end">
        <Button type="submit" loading={busy} loadingLabel="Saving settings">
          Save settings
        </Button>
      </div>
    </form>
  );
}

function DataTools() {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<"csv" | "sample" | null>(null);
  return (
    <div className="space-y-6">
      <Panel title="Newsletter sign-ups">
        <p className="type-body text-soft-ink">
          Emails from the footer sign-up. Download them for your email tool.
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          size="sm"
          loading={busy === "csv"}
          loadingLabel="Preparing"
          onClick={async () => {
            setBusy("csv");
            try {
              const { count, csv } = await newsletterCsv();
              if (!count) toast.show("No sign-ups yet.", "info");
              else
                downloadFile(
                  `dear-corner-newsletter-${new Date().toISOString().slice(0, 10)}.csv`,
                  csv,
                );
            } catch (e) {
              toast.show(toShopError(e).message, "error");
            } finally {
              setBusy(null);
            }
          }}
        >
          <Download size={17} aria-hidden="true" />
          Download CSV
        </Button>
      </Panel>
      <Panel title="Sample data">
        <p className="type-body text-soft-ink">
          Removes the 12 [SAMPLE] products. Samples that were ordered are
          archived instead, so those orders stay complete.
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          size="sm"
          onClick={() => setConfirm(true)}
        >
          <Trash2 size={17} aria-hidden="true" />
          Remove sample data
        </Button>
      </Panel>
      <Panel title="Admin accounts">
        <p className="type-body text-soft-ink">
          To add someone to the admin: they sign up on the shop with their
          email, then the owner gives that account the admin role in Supabase
          (SQL editor:{" "}
          <code className="font-mono text-[14px]">
            update public.user_roles set role = &apos;admin&apos; where user_id
            = (select id from auth.users where email = &apos;their@email&apos;);
          </code>
          ). They set up two-step login the first time they open the admin.
        </p>
      </Panel>
      <ConfirmDialog
        open={confirm}
        title="Remove the sample products?"
        confirmLabel="Remove sample data"
        busy={busy === "sample"}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy("sample");
          try {
            const r = await deleteSampleData();
            toast.show(
              `Done: ${r.deleted} deleted, ${r.archived} archived.`,
              "success",
            );
            forgetAdmin(
              "products",
              "inventory",
              "dashboard",
              "category-options",
              "categories",
            );
          } catch (e) {
            toast.show(toShopError(e).message, "error");
          } finally {
            setBusy(null);
            setConfirm(false);
          }
        }}
      >
        This can&rsquo;t be undone. Your own products aren&rsquo;t touched.
      </ConfirmDialog>
    </div>
  );
}

const TABS = [
  { id: "shop", label: "Shop" },
  { id: "homepage", label: "Homepage" },
  { id: "data", label: "Data and admins" },
] as const;

/** Announcement, contact details, limits, homepage content and data tools. */
function SettingsPage() {
  const query = useAdminQuery("settings", fetchSettings);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("shop");
  const reload = () => void refreshAdmin("settings", fetchSettings);
  return (
    <AdminPage
      title="Settings"
      tabs={
        <div
          role="tablist"
          aria-label="Settings"
          className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-sand-line"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="settings-panel"
              onClick={() => setTab(t.id)}
              className={cx(
                "-mb-px min-h-11 shrink-0 border-b-2 px-4 type-nav whitespace-nowrap",
                tab === t.id
                  ? "border-rosewood font-semibold text-rosewood"
                  : "border-transparent text-soft-ink hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <div id="settings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "data" ? (
          <DataTools />
        ) : (
          <QueryView query={query}>
            {(s) =>
              tab === "shop" ? (
                <ShopSettings key={s.updated_at} s={s} onSaved={reload} />
              ) : (
                <HomepageEditor
                  key={s.updated_at}
                  homepage={s.homepage}
                  onSaved={async () => {
                    reload();
                    await refreshShop();
                  }}
                />
              )
            }
          </QueryView>
        )}
      </div>
    </AdminPage>
  );
}

export default SettingsPage;
