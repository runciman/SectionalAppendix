#!/usr/bin/env python3
"""Build London North Western (North) route-clearance data."""
from __future__ import annotations

import sys
from pathlib import Path

import build_scotland_route_clearance as builder

builder.TABLES = {
    "D1A": (range(914, 928), "Diesel multiple units", 15, None),
    "D1B": (range(928, 944), "Diesel multiple units", 15, None),
    "D2A": (range(944, 957), "Electric multiple units", 15, None),
    "D2B": (range(957, 974), "Electric multiple units", 15, None),
    "D3A": (range(974, 992), "Coaching stock", 15, None),
    "D4A": (range(992, 1007), "Locomotives", 16, 15),
    "D4B": (range(1007, 1023), "Locomotives", 16, 15),
    "D4C": (range(1023, 1038), "Locomotives", 16, 15),
    "D4D": (range(1038, 1052), "Locomotives", 16, 15),
    "D5A": (range(1052, 1072), "Loading gauge", 2, None),
    "D5B": (range(1072, 1087), "Locomotive gauge", 16, 15),
}

if __name__ == "__main__":
    output = Path("src/route-clearance/lnw-north.js")
    if "--output" not in sys.argv:
        sys.argv.extend(["--output", str(output)])
    builder.main()
    output.write_text(output.read_text().replace("Generated from Scotland", "Generated from London North Western (North)"))
