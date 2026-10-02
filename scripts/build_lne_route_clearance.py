#!/usr/bin/env python3
"""Build London North Eastern route-clearance data from London and EM tables."""
from __future__ import annotations

import sys
import json
import re
from collections import defaultdict
from pathlib import Path

import build_scotland_route_clearance as builder
import pdfplumber

builder.TABLES = {
    "D1A-London": (range(1082, 1097), "Diesel multiple units", 15, None),
    "D1B-London": (range(1097, 1120), "Diesel multiple units", 15, None),
    "D1A-EM": (range(1120, 1124), "Diesel multiple units", 15, None),
    "D1B-EM": (range(1124, 1128), "Diesel multiple units", 15, None),
    "D2A-London": (range(1128, 1144), "Electric multiple units", 15, None),
    "D2B-London": (range(1144, 1161), "Electric multiple units", 15, None),
    "D2C-London": (range(1161, 1177), "Electric multiple units", 15, None),
    "D2D-London": (range(1177, 1193), "Electric multiple units", 15, None),
    "D2A-EM": (range(1193, 1199), "Electric multiple units", 15, None),
    "D3A-London": (range(1199, 1216), "Coaching stock", 15, None),
    "D3A-EM": (range(1216, 1221), "Coaching stock", 15, None),
    "D4A-London": (range(1221, 1238), "Locomotives", 16, 15),
    "D4B-London": (range(1238, 1254), "Locomotives", 16, 15),
    "D4C-London": (range(1254, 1272), "Locomotives", 16, 15),
    "D4D-London": (range(1272, 1291), "Locomotives", 16, 15),
    "D2B-EM": (range(1291, 1297), "Electric multiple units", 15, None),
    "D4A-EM": (range(1297, 1301), "Locomotives", 16, 15),
    "D4B-EM": (range(1301, 1304), "Locomotives", 16, 15),
    "D4C-EM": (range(1304, 1307), "Locomotives", 16, 15),
    "D4D-EM": (range(1307, 1311), "Locomotives", 16, 15),
    "D5A": (range(1311, 1338), "Loading gauge", 2, None),
    "D5B-London": (range(1338, 1356), "Locomotive gauge", 16, 15),
    "D5B-EM": (range(1356, 1360), "Locomotive gauge", 16, 15),
}


def loading_gauge_rows(pdf_path: str) -> list[tuple[str, dict]]:
    """Parse LNE D5A, whose source page splits gauge columns into mini-tables."""
    parsed: list[tuple[str, dict]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_number in range(1311, 1338):
            words = pdf.pages[page_number - 1].extract_words()
            by_top: dict[float, list[dict]] = defaultdict(list)
            for word in words:
                by_top[round(word["top"], 1)].append(word)
            lines = sorted((top, sorted(line, key=lambda word: word["x0"])) for top, line in by_top.items())
            # The column header occurs immediately above each body table.  It
            # is visually stable even though pdfplumber returns the columns as
            # several disconnected tables.
            headings = []
            for top, line in lines:
                for word in line:
                    if re.fullmatch(r"W(?:6|7|7a|8|8a|9|9a|10|12)", word["text"]):
                        name = word["text"]
                        if name == "W10":
                            next_line = by_top.get(round(top + 9.8, 1), [])
                            if any(candidate["text"].lower() == "a" and abs(candidate["x0"] - word["x0"]) < 12 for candidate in next_line):
                                name = "W10a"
                        headings.append((word["x0"], name))
            if len(headings) < 8:
                continue
            headings = sorted(dict(headings).items())
            lor_limit = headings[0][0] - 100
            starts = [(top, line) for top, line in lines if any(re.fullmatch(r"LN\d{3,4}", word["text"]) and word["x0"] < lor_limit for word in line)]
            for index, (top, line) in enumerate(starts):
                # Route-code glyphs and their adjacent description can differ
                # by a tenth of a point vertically. Midpoints keep both parts
                # of the current visual row together and exclude the next.
                # On the first row do not include the page's explanatory text
                # and column headings above the body table.
                start_top = (starts[index - 1][0] + top) / 2 if index else top - 5
                end_top = (top + starts[index + 1][0]) / 2 if index + 1 < len(starts) else float("inf")
                lor_word = next(word for word in line if re.fullmatch(r"LN\d{3,4}", word["text"]) and word["x0"] < lor_limit)
                lor = lor_word["text"]
                body_lines = [candidate for candidate in lines if start_top <= candidate[0] < end_top]
                scope_words = []
                note_words = []
                cells: dict[str, list[str]] = defaultdict(list)
                gauge_start = headings[0][0] - 5
                note_start = headings[-1][0] + 20
                for _, body_line in body_lines:
                    for word in body_line:
                        x = word["x0"]
                        if lor_word["x0"] + 15 <= x < gauge_start:
                            scope_words.append(word["text"])
                        elif gauge_start <= x < note_start:
                            x_header, name = min(headings, key=lambda heading: abs(heading[0] - x))
                            if abs(x_header - x) < 16:
                                cells[name].append(word["text"])
                        elif x >= note_start:
                            note_words.append(word["text"])
                notes = builder.clean(" ".join(note_words))
                restrictions = builder.note_map(notes)
                clearances = []
                for _, name in headings:
                    raw = builder.clean(" ".join(cells[name]))
                    value = builder.status(raw)
                    if value:
                        clearances.append({"type": name, **value, "restrictionNotes": {code: restrictions.get(code, "") for code in value["restrictions"]}})
                if clearances:
                    parsed.append((lor, {
                        "table": "D5A",
                        "category": "Loading gauge",
                        "pdfPage": page_number,
                        "scope": builder.clean(" ".join(scope_words)),
                        "mileage": None,
                        "routeAvailability": None,
                        "routeAvailabilityRestrictions": [],
                        "clearances": clearances,
                        "notes": notes or None,
                    }))
    return parsed

if __name__ == "__main__":
    output = Path("src/route-clearance/lne.js")
    if "--output" not in sys.argv:
        sys.argv.extend(["--output", str(output)])
    builder.main()
    payload = json.loads(re.sub(r"^.*?export default ", "", output.read_text(), flags=re.S).rstrip(";\n"))
    for lor in list(payload):
        payload[lor] = [row for row in payload[lor] if row["category"] != "Loading gauge"]
        if not payload[lor]:
            del payload[lor]
    for lor, row in loading_gauge_rows(sys.argv[1]):
        payload.setdefault(lor, []).append(row)
    output.write_text("// Generated from London North Eastern Route Clearance tables D1-D5.\nexport default " + json.dumps(dict(sorted(payload.items())), indent=2) + ";\n")
