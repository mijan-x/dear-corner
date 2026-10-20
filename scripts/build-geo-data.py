"""Builds Bangladesh division / district / area data for Dear Corner.

Source: nuhil/bangladesh-geocode (MIT licence, (c) 2014 Nuhil Mehdy),
https://github.com/nuhil/bangladesh-geocode — divisions, districts, upazilas.
Changes made here:
  - official current spellings (Chattogram, Barishal, Cumilla, Cox's Bazar, ...)
  - Dhaka district: the 51 Dhaka city thanas (Dhaka Metropolitan Police) are
    added as areas, plus "Dhaka city (other area)"; together they form the
    "Inside Dhaka" delivery zone. Savar, Keraniganj, Dhamrai, Nawabganj and
    Dohar stay as areas of Dhaka district and are "Outside Dhaka".
  - every other district gets an "Other area" entry.

Usage: python3 scripts/build-geo-data.py <path-to-bangladesh-geocode> <repo-root>
Outputs: src/data/bd-geo.json and supabase/seeds/geo_areas.generated.sql (pasted into
  supabase/migrations/20261020120100_geo_and_shipping.sql)
"""
import json, pathlib, sys

src, root = map(pathlib.Path, sys.argv[1:3])

def table(path):
    for item in json.loads(path.read_text()):
        if isinstance(item, dict) and item.get("type") == "table":
            return item["data"]
    raise SystemExit(f"no table in {path}")

RENAME = {
    "Chattagram": "Chattogram", "Barisal": "Barishal", "Comilla": "Cumilla",
    "Coxsbazar": "Cox's Bazar", "Jhalakathi": "Jhalokati",
    "Chapainawabganj": "Chapai Nawabganj",
}
fix = lambda n: RENAME.get(n.strip(), n.strip())

# Spelling fixes for upazila names in the source data.
AREA_FIX = {
    "Barisal Sadar": "Barishal Sadar", "Borhan Sddin": "Borhanuddin", "Charfesson": "Char Fasson",
    "Jhalakathi Sadar": "Jhalokati Sadar", "Faridgonj": "Faridganj", "Coxsbazar Sadar": "Cox's Bazar Sadar",
    "Comilla Sadar": "Cumilla Sadar", "Sadarsouth": "Cumilla Sadar South", "Monohargonj": "Manoharganj",
    "Senbug": "Senbagh", "Sonaimori": "Sonaimuri", "Karimgonj": "Karimganj", "Mithamoin": "Mithamain",
    "Louhajanj": "Louhajang", "Zajira": "Zanjira", "Jessore Sadar": "Jashore Sadar",
    "Jhikargacha": "Jhikargachha", "Botiaghata": "Batiaghata", "Digholia": "Dighalia",
    "Fultola": "Phultala", "Paikgasa": "Paikgachha", "Bokshiganj": "Bakshiganj",
    "Dewangonj": "Dewanganj", "Mohongonj": "Mohanganj", "Bogra Sadar": "Bogura Sadar",
    "Nondigram": "Nandigram", "Kahaloo": "Kahalu", "Chapainawabganj Sadar": "Chapai Nawabganj Sadar",
    "Gomostapur": "Gomastapur", "Raigonj": "Raiganj", "Birol": "Biral", "Charrajibpur": "Char Rajibpur",
    "Syedpur": "Saidpur", "Badargonj": "Badarganj", "Pirgonj": "Pirganj", "Taragonj": "Taraganj",
    "Kamolganj": "Kamalganj", "Dakshinsurma": "Dakshin Surma", "Atghoria": "Atgharia",
}
# City corporation areas missing from the upazila list.
EXTRA_AREAS = {"Chattogram": ["Chattogram City"], "Khulna": ["Khulna City"], "Rajshahi": ["Rajshahi City"]}

DHAKA_CITY_THANAS = [
    "Adabor", "Badda", "Banani", "Bangshal", "Bhashantek", "Bhatara",
    "Bimanbandar", "Cantonment", "Chawkbazar", "Dakshinkhan", "Darus Salam",
    "Demra", "Dhanmondi", "Gandaria", "Gulshan", "Hatirjheel", "Hazaribagh",
    "Jatrabari", "Kadamtali", "Kafrul", "Kalabagan", "Kamrangirchar",
    "Khilgaon", "Khilkhet", "Kotwali", "Lalbagh", "Mirpur", "Mohammadpur",
    "Motijheel", "Mugda", "New Market", "Pallabi", "Paltan", "Ramna",
    "Rampura", "Rupnagar", "Sabujbagh", "Shah Ali", "Shahbagh",
    "Shahjahanpur", "Sher-e-Bangla Nagar", "Shyampur", "Sutrapur", "Tejgaon",
    "Tejgaon Industrial Area", "Turag", "Uttara East", "Uttara West",
    "Uttarkhan", "Vatara", "Wari",
]
DHAKA_OTHER = "Dhaka city (other area)"

divisions = table(src / "divisions/divisions.json")
districts = table(src / "districts/districts.json")
upazilas = table(src / "upazilas/upazilas.json")

out = []
sql_rows = []  # (division, district, area, is_dhaka_city)
for dv in sorted(divisions, key=lambda d: fix(d["name"])):
    dv_name = fix(dv["name"])
    ds_out = []
    for ds in sorted((d for d in districts if d["division_id"] == dv["id"]), key=lambda d: fix(d["name"])):
        ds_name = fix(ds["name"])
        ups = sorted(
            [AREA_FIX.get(u["name"].strip(), u["name"].strip()) for u in upazilas if u["district_id"] == ds["id"]]
            + EXTRA_AREAS.get(ds_name, [])
        )
        if ds_name == "Dhaka":
            areas = [{"name": t, "city": True} for t in DHAKA_CITY_THANAS] + [{"name": DHAKA_OTHER, "city": True}]
            areas += [{"name": u} for u in ups]
        else:
            areas = [{"name": u} for u in ups] + [{"name": "Other area"}]
        for a in areas:
            sql_rows.append((dv_name, ds_name, a["name"], bool(a.get("city"))))
        ds_out.append({"name": ds_name, "areas": [a["name"] for a in areas]})
    out.append({"name": dv_name, "districts": ds_out})

(root / "src/data/bd-geo.json").write_text(json.dumps({"divisions": out}, ensure_ascii=False, separators=(",", ":")) + "\n")

q = lambda s: "'" + s.replace("'", "''") + "'"
lines = ",\n".join(f"  ({q(a)}, {q(b)}, {q(c)}, {'true' if d else 'false'})" for a, b, c, d in sql_rows)
(root / "supabase/seeds/geo_areas.generated.sql").write_text(
    "-- Generated by scripts/build-geo-data.py. Do not edit by hand.\n"
    "insert into public.geo_areas (division, district, area, is_dhaka_city) values\n" + lines + ";\n"
)
print(len(out), "divisions,", sum(len(d["districts"]) for d in out), "districts,", len(sql_rows), "areas")
