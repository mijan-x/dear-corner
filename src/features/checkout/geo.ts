import { useQuery } from "../../lib/query";

/**
 * Bangladesh divisions, districts and areas (thanas / upazilas) for the
 * address dropdowns. The same list is in the database (geo_areas), which
 * checks every address; this copy is loaded only on pages with an address
 * form.
 */
export type BdGeo = {
  divisions: {
    name: string;
    districts: { name: string; areas: string[] }[];
  }[];
};

let loading: Promise<BdGeo> | undefined;

export function loadGeo(): Promise<BdGeo> {
  loading ??= import("../../data/bd-geo.json").then(
    (module) => module.default as BdGeo,
  );
  return loading;
}

export function useGeo() {
  return useQuery("bd-geo", loadGeo, { staleMs: 24 * 60 * 60_000 }).data;
}

export function districtsOf(geo: BdGeo | undefined, division: string) {
  return geo?.divisions.find((d) => d.name === division)?.districts ?? [];
}

export function areasOf(
  geo: BdGeo | undefined,
  division: string,
  district: string,
) {
  return (
    districtsOf(geo, division).find((d) => d.name === district)?.areas ?? []
  );
}

/** The division a district belongs to (district names are unique). */
export function divisionOf(geo: BdGeo | undefined, district: string) {
  return (
    geo?.divisions.find((d) => d.districts.some((x) => x.name === district))
      ?.name ?? ""
  );
}
