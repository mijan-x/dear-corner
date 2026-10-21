import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import Panel from "./Panel";
import ImageField from "./ImageField";
import { Button } from "../../components/ui/Button";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "../../components/ui/Field";
import { useToast } from "../../components/ui/useToast";
import {
  DEFAULT_HOMEPAGE,
  toHomepageContent,
  type HomeBanner,
  type HomeHero,
  type InstagramPhoto,
} from "../../services/home";
import { saveHomepage } from "../services/settings";
import { toShopError } from "../../lib/errors";

type Raw = Record<string, unknown>;

function rawBanners(homepage: unknown): HomeBanner[] {
  const v = (homepage && typeof homepage === "object" ? homepage : {}) as Raw;
  if (!Array.isArray(v.banners)) return DEFAULT_HOMEPAGE.banners;
  return (v.banners as Raw[]).map((b, i) => ({
    id: String(b.id ?? `banner-${i}`),
    eyebrow: String(b.eyebrow ?? ""),
    title: String(b.title ?? ""),
    text: String(b.text ?? ""),
    cta_label: String(b.cta_label ?? "Shop now"),
    link: String(b.link ?? "/shop"),
    tone: b.tone === "light" ? "light" : "dark",
    image_desktop: (b.image_desktop as string | null) ?? null,
    image_mobile: (b.image_mobile as string | null) ?? null,
    image_alt: String(b.image_alt ?? ""),
  }));
}

/**
 * Homepage hero, promo banners and Instagram photos (stored in
 * store_settings.homepage). Banners show only with a photo; Instagram only
 * once there are 6 photos.
 */
function HomepageEditor({
  homepage,
  onSaved,
}: {
  homepage: unknown;
  onSaved: () => void;
}) {
  const toast = useToast();
  const content = toHomepageContent(homepage);
  const [hero, setHero] = useState<HomeHero>(content.hero);
  const [banners, setBanners] = useState<HomeBanner[]>(() =>
    rawBanners(homepage),
  );
  const [instagram, setInstagram] = useState<InstagramPhoto[]>(
    content.instagram,
  );
  const [busy, setBusy] = useState(false);
  const h = (patch: Partial<HomeHero>) => setHero((x) => ({ ...x, ...patch }));
  const b = (i: number, patch: Partial<HomeBanner>) =>
    setBanners((list) =>
      list.map((x, j) => (j === i ? { ...x, ...patch } : x)),
    );

  const save = async () => {
    setBusy(true);
    try {
      await saveHomepage({
        hero,
        banners,
        instagram: instagram.filter((p) => p.image),
      });
      toast.show("Homepage saved.", "success");
      onSaved();
    } catch (e) {
      toast.show(toShopError(e).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Hero">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Small line above"
            value={hero.eyebrow}
            onChange={(e) => h({ eyebrow: e.target.value })}
          />
          <TextField
            label="Title"
            value={hero.title}
            onChange={(e) => h({ title: e.target.value })}
            helper="Put *stars* around a word to set it in italics."
          />
          <TextAreaField
            label="Text"
            rows={2}
            value={hero.text}
            onChange={(e) => h({ text: e.target.value })}
            className="md:col-span-2"
          />
          <TextField
            label="Button"
            value={hero.cta_label}
            onChange={(e) => h({ cta_label: e.target.value })}
          />
          <TextField
            label="Button link"
            value={hero.cta_link}
            onChange={(e) => h({ cta_link: e.target.value })}
            helper="For example /shop or /collections/new-arrivals"
          />
          <TextField
            label="Second link"
            optional
            value={hero.secondary_label}
            onChange={(e) => h({ secondary_label: e.target.value })}
          />
          <TextField
            label="Second link goes to"
            optional
            value={hero.secondary_link}
            onChange={(e) => h({ secondary_link: e.target.value })}
          />
          <ImageField
            label="Photo, desktop (2400×1000)"
            value={hero.image_desktop}
            onChange={(p) => h({ image_desktop: p })}
            folder="home"
            aspect="aspect-[12/5]"
            longest={2400}
          />
          <ImageField
            label="Photo, phone (4:5)"
            value={hero.image_mobile}
            onChange={(p) => h({ image_mobile: p })}
            folder="home"
            aspect="aspect-[4/5] max-w-[220px]"
            longest={1350}
          />
          <TextField
            label="Photo description"
            value={hero.image_alt}
            onChange={(e) => h({ image_alt: e.target.value })}
            className="md:col-span-2"
            helper="Read out to people using screen readers."
          />
        </div>
      </Panel>

      <Panel
        title="Promo banners"
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setBanners((list) => [
                ...list,
                {
                  id: `banner-${Date.now()}`,
                  eyebrow: "",
                  title: "",
                  text: "",
                  cta_label: "Shop now",
                  link: "/shop",
                  tone: "dark",
                  image_desktop: null,
                  image_mobile: null,
                  image_alt: "",
                },
              ])
            }
          >
            <Plus size={17} aria-hidden="true" />
            Add banner
          </Button>
        }
      >
        {banners.length === 0 && (
          <p className="type-body text-soft-ink">No banners.</p>
        )}
        <div className="space-y-6">
          {banners.map((x, i) => (
            <fieldset
              key={x.id}
              className="rounded-control border border-sand-line p-4"
            >
              <legend className="px-1 type-label text-ink">
                Banner {i + 1}
                {!x.image_desktop &&
                  !x.image_mobile &&
                  " (hidden until it has a photo)"}
              </legend>
              <div className="mb-3 flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="quiet"
                  disabled={i === 0}
                  onClick={() =>
                    setBanners((l) => {
                      const n = [...l];
                      [n[i - 1], n[i]] = [n[i], n[i - 1]];
                      return n;
                    })
                  }
                  aria-label={`Move banner ${i + 1} up`}
                >
                  <ArrowUp size={17} aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="quiet"
                  disabled={i === banners.length - 1}
                  onClick={() =>
                    setBanners((l) => {
                      const n = [...l];
                      [n[i + 1], n[i]] = [n[i], n[i + 1]];
                      return n;
                    })
                  }
                  aria-label={`Move banner ${i + 1} down`}
                >
                  <ArrowDown size={17} aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="quiet"
                  onClick={() => setBanners((l) => l.filter((_, j) => j !== i))}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  Remove
                </Button>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <TextField
                  label="Small line above"
                  value={x.eyebrow}
                  onChange={(e) => b(i, { eyebrow: e.target.value })}
                />
                <TextField
                  label="Title"
                  value={x.title}
                  onChange={(e) => b(i, { title: e.target.value })}
                />
                <TextAreaField
                  label="Text"
                  rows={2}
                  value={x.text}
                  onChange={(e) => b(i, { text: e.target.value })}
                  className="md:col-span-2"
                />
                <TextField
                  label="Button"
                  value={x.cta_label}
                  onChange={(e) => b(i, { cta_label: e.target.value })}
                />
                <TextField
                  label="Link"
                  value={x.link}
                  onChange={(e) => b(i, { link: e.target.value })}
                />
                <SelectField
                  label="Text colour"
                  value={x.tone}
                  onChange={(e) =>
                    b(i, { tone: e.target.value as "dark" | "light" })
                  }
                >
                  <option value="dark">Light text on a dark fade</option>
                  <option value="light">Dark text on a light fade</option>
                </SelectField>
                <TextField
                  label="Photo description"
                  value={x.image_alt}
                  onChange={(e) => b(i, { image_alt: e.target.value })}
                />
                <ImageField
                  label="Photo, desktop (about 2.4:1)"
                  value={x.image_desktop}
                  onChange={(p) => b(i, { image_desktop: p })}
                  folder="home"
                  aspect="aspect-[12/5]"
                  longest={2400}
                />
                <ImageField
                  label="Photo, phone (5:4)"
                  value={x.image_mobile}
                  onChange={(p) => b(i, { image_mobile: p })}
                  folder="home"
                  aspect="aspect-[5/4] max-w-[260px]"
                  longest={1200}
                />
              </div>
            </fieldset>
          ))}
        </div>
      </Panel>

      <Panel
        title={`Instagram photos (${instagram.filter((p) => p.image).length} of 6)`}
      >
        <p className="mb-4 type-body text-soft-ink">
          The Instagram strip shows on the homepage once all 6 photos are here.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => {
            const p = instagram[i] ?? { image: "", alt: "", link: "" };
            const setP = (patch: Partial<InstagramPhoto>) =>
              setInstagram((list) => {
                const next = Array.from(
                  { length: 6 },
                  (_, j) => list[j] ?? { image: "", alt: "", link: "" },
                );
                next[i] = { ...next[i], ...patch };
                return next;
              });
            return (
              <div key={i} className="space-y-2">
                <ImageField
                  label={`Photo ${i + 1}`}
                  value={p.image || null}
                  onChange={(path) => setP({ image: path ?? "" })}
                  folder="instagram"
                  aspect="aspect-square max-w-[200px]"
                  longest={800}
                />
                <TextField
                  label="Description"
                  value={p.alt}
                  onChange={(e) => setP({ alt: e.target.value })}
                />
                <TextField
                  label="Post link"
                  optional
                  type="url"
                  value={p.link}
                  onChange={(e) => setP({ link: e.target.value })}
                />
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button
          onClick={save}
          loading={busy}
          loadingLabel="Saving the homepage"
        >
          Save homepage
        </Button>
      </div>
    </div>
  );
}

export default HomepageEditor;
