import { controlClasses } from "../../../components/ui/fieldStyles";
import {
  variantTitle,
  type FormImage,
  type FormVariant,
  type ProductForm,
} from "../../lib/productForm";

const cell = controlClasses({ className: "h-11 px-2.5" });

/** One row per SKU: price, old price, stock, low-stock alert, photo, on/off. */
function VariantsTable({
  form,
  images,
  onChange,
}: {
  form: ProductForm;
  images: FormImage[];
  onChange: (variants: FormVariant[]) => void;
}) {
  const set = (i: number, patch: Partial<FormVariant>) =>
    onChange(form.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  return (
    <div
      className="overflow-x-auto rounded-control border border-sand-line"
      role="region"
      aria-label="Variants"
      tabIndex={0}
    >
      <table className="w-full min-w-[820px] border-collapse text-left type-body">
        <thead className="bg-cream/70">
          <tr className="type-label text-soft-ink">
            <th scope="col" className="px-3 py-2.5">
              Variant
            </th>
            <th scope="col" className="px-2 py-2.5">
              SKU
            </th>
            <th scope="col" className="px-2 py-2.5">
              Price ৳
            </th>
            <th scope="col" className="px-2 py-2.5">
              Old price ৳
            </th>
            <th scope="col" className="px-2 py-2.5">
              Stock
            </th>
            <th scope="col" className="px-2 py-2.5">
              Alert at
            </th>
            {images.length > 0 && (
              <th scope="col" className="px-2 py-2.5">
                Photo
              </th>
            )}
            <th scope="col" className="px-3 py-2.5">
              On sale
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-line">
          {form.variants.map((v, i) => {
            const title = variantTitle(form, v);
            return (
              <tr key={v.key} className={v.isActive ? "" : "bg-soft-sand/50"}>
                <th scope="row" className="px-3 py-2 font-medium text-ink">
                  {title}
                </th>
                <td className="px-2 py-2">
                  <input
                    aria-label={`SKU, ${title}`}
                    value={v.sku}
                    onChange={(e) => set(i, { sku: e.target.value })}
                    className={`${cell} w-40 uppercase`}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    aria-label={`Price, ${title}`}
                    inputMode="numeric"
                    value={v.price}
                    onChange={(e) =>
                      set(i, { price: e.target.value.replace(/[^\d]/g, "") })
                    }
                    className={`${cell} w-24 figures`}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    aria-label={`Old price, ${title}`}
                    inputMode="numeric"
                    value={v.compareAt}
                    onChange={(e) =>
                      set(i, {
                        compareAt: e.target.value.replace(/[^\d]/g, ""),
                      })
                    }
                    className={`${cell} w-24 figures`}
                    placeholder="—"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    aria-label={`Stock, ${title}`}
                    inputMode="numeric"
                    value={v.stock}
                    onChange={(e) =>
                      set(i, { stock: e.target.value.replace(/[^\d]/g, "") })
                    }
                    className={`${cell} w-20 figures`}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    aria-label={`Low-stock alert, ${title}`}
                    inputMode="numeric"
                    value={v.lowStock}
                    onChange={(e) =>
                      set(i, { lowStock: e.target.value.replace(/[^\d]/g, "") })
                    }
                    className={`${cell} w-16 figures`}
                  />
                </td>
                {images.length > 0 && (
                  <td className="px-2 py-2">
                    <select
                      aria-label={`Main photo, ${title}`}
                      value={v.imageId}
                      onChange={(e) => set(i, { imageId: e.target.value })}
                      className={`${cell} w-32`}
                    >
                      <option value="">First photo</option>
                      {images.map((img, n) => (
                        <option key={img.id} value={img.id}>
                          Photo {n + 1}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="px-3 py-2">
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={v.isActive}
                      onChange={(e) => set(i, { isActive: e.target.checked })}
                      className="size-5 accent-[var(--color-rosewood)]"
                    />
                    <span className="type-caption">
                      {v.isActive ? "Yes" : "Hidden"}
                    </span>
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default VariantsTable;
