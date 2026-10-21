import { SelectField, TextField } from "../ui/Field";
import { areasOf, districtsOf, useGeo } from "../../features/checkout/geo";

export type AddressValue = {
  division: string;
  district: string;
  area: string;
  addressLine: string;
};

export type AddressErrors = Partial<Record<keyof AddressValue, string>>;

/**
 * Division, district and area dropdowns (each list depends on the one before
 * it), then the street address. Used at checkout and for saved addresses.
 */
function AddressFields({
  value,
  onChange,
  errors = {},
  idPrefix,
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  errors?: AddressErrors;
  /** Keeps ids unique when two forms are on one page. */
  idPrefix: string;
}) {
  const geo = useGeo();
  const districts = districtsOf(geo, value.division);
  const areas = areasOf(geo, value.division, value.district);
  const set = (patch: Partial<AddressValue>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <SelectField
        id={`${idPrefix}-division`}
        label="Division"
        autoComplete="address-level1"
        value={value.division}
        disabled={!geo}
        placeholder={geo ? "Choose a division" : "Loading…"}
        onChange={(e) =>
          set({ division: e.target.value, district: "", area: "" })
        }
        error={errors.division}
      >
        {geo?.divisions.map((d) => (
          <option key={d.name} value={d.name}>
            {d.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        id={`${idPrefix}-district`}
        label="District"
        autoComplete="address-level2"
        value={value.district}
        disabled={!value.division}
        placeholder={
          value.division ? "Choose a district" : "Choose a division first"
        }
        onChange={(e) => set({ district: e.target.value, area: "" })}
        error={errors.district}
      >
        {districts.map((d) => (
          <option key={d.name} value={d.name}>
            {d.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        id={`${idPrefix}-area`}
        label="Area (thana)"
        autoComplete="address-level3"
        value={value.area}
        disabled={!value.district}
        placeholder={
          value.district ? "Choose an area" : "Choose a district first"
        }
        onChange={(e) => set({ area: e.target.value })}
        error={errors.area}
        className="md:col-span-2"
      >
        {areas.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </SelectField>
      <TextField
        id={`${idPrefix}-address`}
        label="House, road and area details"
        autoComplete="street-address"
        maxLength={300}
        value={value.addressLine}
        onChange={(e) => set({ addressLine: e.target.value })}
        error={errors.addressLine}
        helper="For example: House 12, Road 5, Block C, near the mosque"
        className="md:col-span-2"
      />
    </div>
  );
}

export default AddressFields;
