#!/usr/bin/env python3
"""Build Western & Wales route-clearance data from the source Appendix PDF."""

from __future__ import annotations

import sys
import os
import json
import re
from pathlib import Path

import build_scotland_route_clearance as builder


# Western tables (physical PDF pages 711-849), followed by the CVL tables
# (physical PDF pages 850-1083).  D5B is the loading-gauge table; D5C is
# retained only as a Route Availability source.
builder.TABLES = {
    "D1A-W": (range(712, 726), "Diesel multiple units", 15, None),
    "D1B-W": (range(726, 743), "Diesel multiple units", 15, None),
    "D2A-W": (range(743, 757), "Electric multiple units", 7, None),
    "D3-W": (range(757, 771), "Coaching stock", 15, None),
    "D4A-W": (range(771, 783), "Locomotives", 16, 15),
    "D4B-W": (range(783, 795), "Locomotives", 16, 15),
    "D4C-W": (range(795, 809), "Locomotives", 16, 15),
    "D5A-W": (range(809, 819), "Freight vehicles", 15, None),
    "D5B-W": (range(819, 837), "Loading gauge", 2, None),
    "D5C-W": (range(837, 850), "Locomotive gauge", 16, 15),
    "D1A-CVL": (range(851, 852), "Diesel multiple units", 15, None),
    "D1B-CVL": (range(852, 853), "Diesel multiple units", 15, None),
    "D2A-CVL": (range(853, 854), "Electric multiple units", 7, None),
    "D3-CVL": (range(854, 855), "Coaching stock", 15, None),
    "D4A-CVL": (range(855, 856), "Locomotives", 16, 15),
    "D4B-CVL": (range(856, 857), "Locomotives", 16, 15),
    "D4C-CVL": (range(857, 858), "Locomotives", 16, 15),
    "D5A-CVL": (range(858, 861), "Freight vehicles", 15, None),
    "D5B-CVL": (range(861, 862), "Loading gauge", 2, None),
    "D5C-CVL": (range(862, 1084), "Locomotive gauge", 16, 15),
}

if __name__ == "__main__":
    section = os.environ.get("CLEARANCE_SECTION", "all")
    if section == "western":
        builder.TABLES = {key: value for key, value in builder.TABLES.items() if not key.endswith("CVL")}
    elif section == "cvl":
        builder.TABLES = {key: value for key, value in builder.TABLES.items() if key.endswith("CVL")}
    if "--output" not in sys.argv:
        sys.argv.extend(["--output", "tmp/western-wales-cvl.js" if section == "cvl" else "src/route-clearance/western-wales.js"])
    builder.main()
    if section == "cvl":
        target = Path("src/route-clearance/western-wales.js")
        source = Path("tmp/western-wales-cvl.js")
        decode = lambda path: json.loads(re.sub(r"^.*?export default ", "", path.read_text(), flags=re.S).rstrip(";\n"))
        combined = decode(target)
        for lor, rows in decode(source).items():
            combined.setdefault(lor, []).extend(rows)
        target.write_text("// Generated from Western & Wales Route Clearance tables D1-D5.\nexport default " + json.dumps(dict(sorted(combined.items())), indent=2) + ";\n")
