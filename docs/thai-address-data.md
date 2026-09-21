# Thai address reference data

Locomall stores the official six-digit DOPA subdistrict code and uses parent
codes for the province → district → subdistrict picker. Names, postal codes,
and the current administrative hierarchy come from
`open-admin-data/thailand-administrative-divisions` dataset `2026.06`.

Fallback location points come directly from the Department of Provincial
Administration workbook published on data.go.th:

- Dataset: <https://data.go.th/th/dataset/item_c6d42e1b-3219-47e1-b6b7-dfe914f27910>
- Resource: `48039a2a-2f01-448c-b2a2-bb0d541dedcd` (`tambon.xlsx`)
- Coordinate system: WGS84 latitude/longitude

The official workbook has 7,769 populated coordinate rows representing all
7,364 current subdistrict codes. Some coastal and island subdistricts have
multiple rows. The last valid point for each `TA_ID` is the workbook's
representative point and exactly matches the maintained hierarchy source for
all 7,364 codes. The importer deliberately uses codes rather than names because
the workbook's legacy Thai text encoding is not reliable.

These points are approximate and are used only when the user declines precise
GPS. Exact GPS and shipping addresses remain private under RLS and are never
returned by public discovery queries.

## Rebuild

```powershell
python scripts/extract-dopa-centroids.py tambon.xlsx dopa-centroids.json
node scripts/generate-thai-seed.mjs <hierarchy-data-dir> supabase/seed.sql dopa-centroids.json
```

The generated seed is idempotent: it uses `ON CONFLICT ... DO UPDATE` and does
not truncate user or reference data.
