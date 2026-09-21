"""Extract one official DOPA fallback point per Thai subdistrict from tambon.xlsx.

The workbook contains more than one row for some island/coastal subdistricts. Its
last valid row per TA_ID is the representative point used by the maintained
hierarchy dataset, so this script preserves that published convention.
"""

from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"


def cell_column(reference: str) -> int:
    letters = "".join(character for character in reference if character.isalpha())
    result = 0
    for character in letters:
        result = result * 26 + ord(character.upper()) - ord("A") + 1
    return result - 1


def shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return ["".join(node.itertext()) for node in root.findall(f"{{{MAIN_NS}}}si")]


def first_worksheet_path(archive: zipfile.ZipFile) -> str:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    sheet = workbook.find(f"{{{MAIN_NS}}}sheets/{{{MAIN_NS}}}sheet")
    if sheet is None:
        raise ValueError("Workbook has no worksheets")
    relationship_id = sheet.attrib[f"{{{REL_NS}}}id"]
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    for relationship in relationships.findall(f"{{{PKG_REL_NS}}}Relationship"):
        if relationship.attrib["Id"] == relationship_id:
            target = relationship.attrib["Target"].lstrip("/")
            return target if target.startswith("xl/") else f"xl/{target}"
    raise ValueError("Worksheet relationship is missing")


def rows(archive: zipfile.ZipFile):
    strings = shared_strings(archive)
    worksheet_path = first_worksheet_path(archive)
    with archive.open(worksheet_path) as stream:
        for _, element in ET.iterparse(stream, events=("end",)):
            if element.tag != f"{{{MAIN_NS}}}row":
                continue
            values: dict[int, object] = {}
            for cell in element.findall(f"{{{MAIN_NS}}}c"):
                index = cell_column(cell.attrib["r"])
                value = cell.find(f"{{{MAIN_NS}}}v")
                if value is None:
                    values[index] = None
                elif cell.attrib.get("t") == "s":
                    values[index] = strings[int(value.text or "0")]
                else:
                    values[index] = value.text
            width = max(values, default=-1) + 1
            yield [values.get(index) for index in range(width)]
            element.clear()


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/extract-dopa-centroids.py <tambon.xlsx> <output.json>")

    workbook_path, output_path = map(Path, sys.argv[1:])
    centroids: dict[str, dict[str, float | int]] = {}
    observations: dict[str, int] = {}
    with zipfile.ZipFile(workbook_path) as archive:
        iterator = rows(archive)
        header = next(iterator)
        columns = {str(value): index for index, value in enumerate(header)}
        required = {"TA_ID", "LAT", "LONG"}
        if not required.issubset(columns):
            raise ValueError(f"Missing columns: {sorted(required - columns.keys())}")
        for row in iterator:
            try:
                code = str(int(float(row[columns["TA_ID"]])))
                latitude = float(row[columns["LAT"]])
                longitude = float(row[columns["LONG"]])
            except (IndexError, TypeError, ValueError):
                continue
            if not (5 <= latitude <= 21 and 97 <= longitude <= 106):
                continue
            observations[code] = observations.get(code, 0) + 1
            centroids[code] = {"lat": latitude, "lon": longitude}

    for code, count in observations.items():
        centroids[code]["observations"] = count

    payload = {
        "source": {
            "publisher": "Department of Provincial Administration (DOPA)",
            "dataset_url": "https://data.go.th/th/dataset/item_c6d42e1b-3219-47e1-b6b7-dfe914f27910",
            "resource_id": "48039a2a-2f01-448c-b2a2-bb0d541dedcd",
            "file": "tambon.xlsx",
        },
        "centroids": dict(sorted(centroids.items())),
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted {len(centroids)} subdistrict centroids to {output_path}")


if __name__ == "__main__":
    main()
