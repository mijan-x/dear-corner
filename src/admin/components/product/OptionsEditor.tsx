import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Checkbox } from "../../../components/ui/Choice";
import { TextField } from "../../../components/ui/Field";
import { controlClasses } from "../../../components/ui/fieldStyles";
import { newKey, type FormOption } from "../../lib/productForm";

/**
 * Up to 3 options (Color, Size…) with their values. Colors get a swatch.
 * Adding or removing a value rebuilds the variant list (existing rows keep
 * their price and stock).
 */
function OptionsEditor({
  options,
  onChange,
}: {
  options: FormOption[];
  /** `structural` when values or options were added or removed. */
  onChange: (next: FormOption[], structural: boolean) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const update = (i: number, patch: Partial<FormOption>, structural = false) =>
    onChange(
      options.map((o, j) => (j === i ? { ...o, ...patch } : o)),
      structural,
    );

  const addValue = (i: number) => {
    const o = options[i];
    const text = (drafts[o.key] ?? "").trim();
    if (
      !text ||
      o.values.some((v) => v.value.toLowerCase() === text.toLowerCase())
    )
      return;
    update(
      i,
      { values: [...o.values, { key: newKey(), value: text, swatchHex: "" }] },
      true,
    );
    setDrafts((d) => ({ ...d, [o.key]: "" }));
  };

  return (
    <div className="space-y-4">
      {options.map((o, i) => (
        <div
          key={o.key}
          className="rounded-control border border-sand-line p-4"
        >
          <div className="flex items-end gap-3">
            <TextField
              label={`Option ${i + 1} name`}
              value={o.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Color, Size, Scent…"
              className="flex-1"
            />
            <button
              type="button"
              aria-label={`Remove option ${o.name || i + 1}`}
              onClick={() =>
                onChange(
                  options.filter((_, j) => j !== i),
                  true,
                )
              }
              className="grid size-12 shrink-0 place-items-center rounded-control text-soft-ink hover:bg-clay-blush hover:text-rosewood"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
          <Checkbox
            label="This is a color (shows swatches and switches photos)"
            checked={o.isColor}
            onChange={(e) => update(i, { isColor: e.target.checked })}
          />
          <ul className="mt-2 flex flex-wrap gap-2">
            {o.values.map((v, k) => (
              <li
                key={v.key}
                className="flex h-11 items-center gap-2 rounded-full border border-sand-line bg-paper pr-1 pl-3"
              >
                {o.isColor && (
                  <input
                    type="color"
                    aria-label={`Swatch color for ${v.value}`}
                    value={v.swatchHex || "#cccccc"}
                    onChange={(e) =>
                      update(i, {
                        values: o.values.map((x, m) =>
                          m === k ? { ...x, swatchHex: e.target.value } : x,
                        ),
                      })
                    }
                    className="size-6 cursor-pointer rounded-full border border-sand-line bg-transparent p-0"
                  />
                )}
                <input
                  aria-label={`Value ${k + 1} of ${o.name || "option"}`}
                  value={v.value}
                  onChange={(e) =>
                    update(i, {
                      values: o.values.map((x, m) =>
                        m === k ? { ...x, value: e.target.value } : x,
                      ),
                    })
                  }
                  className="w-24 bg-transparent text-[16px] outline-none focus-visible:underline"
                />
                <button
                  type="button"
                  aria-label={`Remove ${v.value}`}
                  onClick={() =>
                    update(
                      i,
                      { values: o.values.filter((_, m) => m !== k) },
                      true,
                    )
                  }
                  className="grid size-9 place-items-center rounded-full text-soft-ink hover:bg-clay-blush hover:text-rosewood"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
            <li>
              <div className="flex h-11 items-center gap-1">
                <input
                  aria-label={`New value for ${o.name || "option"}`}
                  placeholder="Add a value"
                  value={drafts[o.key] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [o.key]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addValue(i);
                    }
                  }}
                  className={controlClasses({ className: "h-11 w-36 px-3" })}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="quiet"
                  aria-label="Add value"
                  onClick={() => addValue(i)}
                >
                  <Plus size={18} aria-hidden="true" />
                </Button>
              </div>
            </li>
          </ul>
        </div>
      ))}
      {options.length < 3 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            onChange(
              [
                ...options,
                {
                  key: newKey("o"),
                  name: options.length ? "Size" : "Color",
                  isColor: !options.length,
                  values: [],
                },
              ],
              false,
            )
          }
        >
          <Plus size={18} aria-hidden="true" />
          Add an option
        </Button>
      )}
    </div>
  );
}

export default OptionsEditor;
