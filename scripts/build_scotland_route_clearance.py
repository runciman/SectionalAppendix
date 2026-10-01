#!/usr/bin/env python3
"""Build Scotland Route Clearance data from the source Appendix PDF.

The generated module is keyed by LOR and preserves every source row, status,
restriction code, note and physical PDF page. It never infers clearance from
another LOR or mileage span.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
TABLES = {
    "D1A": (range(999, 1013), "Diesel multiple units", 15, None),
    "D1B": (range(1013, 1027), "Diesel multiple units", 15, None),
    "D2A": (range(1027, 1040), "Electric multiple units", 15, None),
    "D2B": (range(1040, 1059), "Electric multiple units", 7, None),
    "D3": (range(1059, 1073), "Coaching stock", 7, None),
    "D4A": (range(1073, 1091), "Locomotives", 16, 15),
    "D4B": (range(1091, 1109), "Locomotives", 16, 15),
    "D4C": (range(1109, 1131), "Locomotives", 16, 15),
    "D4D": (range(1131, 1147), "Locomotives", 16, 15),
    "D5A": (range(1147, 1161), "Loading gauge", 2, None),
    "D5B": (range(1161, 1173), "Locomotive gauge", 16, 15),
}


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def heading(value: str | None) -> str:
    lines = [line.strip() for line in (value or "").splitlines()]
    value = " ".join(line for line in lines if line and not re.fullmatch(r"o+|0+", line)).replace("W9 Plus", "W9Plus")
    return value.replace("720/ 1 & /5", "720/1 & 720/5")


def mileage(row: list[str | None], first_class: int) -> str | None:
    if first_class >= 15:
        values = ["".join(clean(row[index]) for index in range(start, min(start + 3, len(row)))) for start in range(3, 15, 3)]
    else:
        values = [clean(row[index]) for index in range(3, min(7, len(row)))]
    values = [value for value in values if value]
    if len(values) >= 4:
        return f"{values[0]}m {values[1]}ch to {values[2]}m {values[3]}ch"
    return None


def status(value: str | None) -> dict | None:
    raw = clean(value)
    if not raw:
        return None
    codes = re.findall(r"[RS]\d+", raw)
    primary = next((token for token in re.findall(r"EH|Y|N|E|H|B|T|R\d+|S\d+", raw) if not token.startswith(("R", "S"))), None)
    if primary is None and codes:
        primary = codes[0]
    if primary is None:
        return None
    return {"status": primary, "restrictions": codes, "raw": raw}


def note_map(notes: str) -> dict[str, str]:
    found = list(re.finditer(r"\b([RS]\d+)\b", notes))
    return {
        match.group(1): clean(notes[match.end():found[index + 1].start() if index + 1 < len(found) else len(notes)])
        for index, match in enumerate(found)
    }


def route_availability(value: str | None, restrictions: dict[str, str]) -> tuple[str | None, list[dict[str, str]]]:
    """Accept only a numeric RA cell; table extraction can spill Notes here."""
    raw = clean(value)
    match = re.fullmatch(r"(10|[1-9])(?:\s+(R\d+(?:\s+R\d+)*))?", raw)
    if not match:
        return None, []
    codes = re.findall(r"R\d+", match.group(2) or "")
    return match.group(1), [{"code": code, "note": restrictions.get(code, "")} for code in codes]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf")
    parser.add_argument("--output", default="src/route-clearance/scotland.js")
    args = parser.parse_args()
    output = ROOT / args.output
    clearance = defaultdict(list)
    with pdfplumber.open(args.pdf) as pdf:
        for table_id, (pages, label, first_class, ra_index) in TABLES.items():
            previous_headers = None
            for page_number in pages:
                tables = pdf.pages[page_number - 1].extract_tables()
                if not tables:
                    continue
                table = tables[0]
                if len(table) < 2:
                    continue
                has_header = clean(table[0][0]).lower().startswith("line of")
                if has_header:
                    previous_headers = [heading(cell) for cell in table[0]]
                    data_rows = table[1:]
                    # D5A has a two-line header: "Gauge" spans the W6–W12
                    # columns on the first row, with the actual gauge names
                    # on the following row. That second row is not route data.
                    if label == "Loading gauge" and data_rows and not clean(data_rows[0][0]):
                        previous_headers = [heading(cell) or previous_headers[index] for index, cell in enumerate(data_rows[0])]
                        data_rows = data_rows[1:]
                else:
                    data_rows = table
                if previous_headers is None:
                    continue
                headers = previous_headers
                classes = headers[first_class:-1]
                for row in data_rows:
                    if not row or not re.fullmatch(r"(?:SC\d{3}|GW\d{3,4})", clean(row[0])):
                        continue
                    notes = clean(row[-1])
                    restrictions = note_map(notes)
                    values = []
                    for name, cell in zip(classes, row[first_class:-1]):
                        parsed = status(cell)
                        if name and parsed:
                            restriction_notes = {code: restrictions.get(code, "") for code in parsed["restrictions"]}
                            if len(parsed["restrictions"]) == 1 and notes and not next(iter(restriction_notes.values())):
                                restriction_notes[parsed["restrictions"][0]] = notes
                            values.append({"type": name, **parsed, "restrictionNotes": restriction_notes})
                    ra, ra_restrictions = route_availability(row[ra_index] if ra_index is not None and len(row) > ra_index else None, restrictions)
                    clearance[clean(row[0])].append({
                        "table": table_id,
                        "category": label,
                        "pdfPage": page_number,
                        "scope": clean(row[1] if label == "Loading gauge" else row[2]),
                        # Scope text is reliable; some continuation pages split
                        # mileage digits across drawing cells, so do not publish
                        # a reconstructed mileage unless it has been manually
                        # verified against the source image.
                        "mileage": None,
                        "routeAvailability": ra,
                        "routeAvailabilityRestrictions": ra_restrictions,
                        "clearances": values,
                        "notes": notes or None,
                    })
    payload = {lor: segments for lor, segments in sorted(clearance.items())}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("// Generated from Scotland Route Clearance tables D1-D5.\nexport default " + json.dumps(payload, indent=2) + ";\n")
    print(json.dumps({"lors": len(payload), "segments": sum(len(value) for value in payload.values()), "output": str(output.relative_to(ROOT))}))


if __name__ == "__main__":
    main()
