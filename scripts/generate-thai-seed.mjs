import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [sourceDir, output = "supabase/seed.sql", dopaCentroidsPath] = process.argv.slice(2);
if (!sourceDir) {
  throw new Error(
    "Usage: node scripts/generate-thai-seed.mjs <dataset-dir> [output] [dopa-centroids.json]",
  );
}
const read = (name) => JSON.parse(readFileSync(resolve(sourceDir, name), "utf8"));
const provinces = read("all-provinces.json");
const districts = read("all-districts.json");
const subdistricts = read("all-subdistricts.json");
const dopaCentroids = dopaCentroidsPath
  ? JSON.parse(readFileSync(resolve(dopaCentroidsPath), "utf8"))
  : null;
const centroidByCode = dopaCentroids?.centroids ?? {};
const q = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;
const point = (geo) => geo?.lat && geo?.lon
  ? `extensions.st_setsrid(extensions.st_makepoint(${Number(geo.lon)},${Number(geo.lat)}),4326)::extensions.geography`
  : "null";
const chunks = (rows, size = 250) => Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size));
const statements = [
  "-- Hierarchy generated from open-admin-data/thailand-administrative-divisions (DOPA codes), dataset 2026.06.",
  dopaCentroids
    ? `-- Subdistrict WGS84 fallback points come directly from data.go.th DOPA resource ${dopaCentroids.source.resource_id}.`
    : "-- WGS84 fallback points come from the hierarchy dataset.",
  "-- These approximate points are used only when a user declines precise GPS.",
  "begin;",
];
for (const rows of chunks(provinces)) statements.push(`insert into public.thai_provinces(code,name_th,name_en,geography,source,source_version) values\n${rows.map(x => `(${q(x.id)},${q(x.name.th)},${q(x.name.en)},${point(x.geo)},'open-admin-data/DOPA','2026.06')`).join(",\n")}\non conflict(code) do update set name_th=excluded.name_th,name_en=excluded.name_en,geography=excluded.geography,source=excluded.source,source_version=excluded.source_version;`);
for (const rows of chunks(districts)) statements.push(`insert into public.thai_districts(code,province_code,name_th,name_en,geography,source,source_version) values\n${rows.map(x => `(${q(x.id)},${q(x.parent.id)},${q(x.name.th)},${q(x.name.en)},${point(x.geo)},'open-admin-data/DOPA','2026.06')`).join(",\n")}\non conflict(code) do update set province_code=excluded.province_code,name_th=excluded.name_th,name_en=excluded.name_en,geography=excluded.geography,source=excluded.source,source_version=excluded.source_version;`);
for (const rows of chunks(subdistricts)) statements.push(`insert into public.thai_subdistricts(code,district_code,province_code,name_th,name_en,postal_code,geography,source,source_version) values\n${rows.map(x => {
  const official = centroidByCode[String(x.id)];
  const geography = official ? { lat: official.lat, lon: official.lon } : x.geo;
  const source = official ? "data.go.th/DOPA + open-admin-data" : "open-admin-data/DOPA";
  const version = official ? "DOPA 48039a2a / hierarchy 2026.06" : "2026.06";
  return `(${q(x.id)},${q(x.parent.id)},${q(x.ancestors[0].id)},${q(x.name.th)},${q(x.name.en)},${x.zip_codes?.[0] ? q(x.zip_codes[0]) : "null"},${point(geography)},${q(source)},${q(version)})`;
}).join(",\n")}\non conflict(code) do update set district_code=excluded.district_code,province_code=excluded.province_code,name_th=excluded.name_th,name_en=excluded.name_en,postal_code=excluded.postal_code,geography=excluded.geography,source=excluded.source,source_version=excluded.source_version;`);
statements.push("commit;", "");
writeFileSync(resolve(output), statements.join("\n\n"), "utf8");
const officialCount = subdistricts.filter((item) => centroidByCode[String(item.id)]).length;
console.log(`Generated ${output}: ${provinces.length} provinces, ${districts.length} districts, ${subdistricts.length} subdistricts (${officialCount} direct DOPA centroids)`);
