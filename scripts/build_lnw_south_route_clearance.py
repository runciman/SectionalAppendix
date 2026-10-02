#!/usr/bin/env python3
"""Build London North Western (South) route-clearance data."""
from __future__ import annotations

import sys
from pathlib import Path

import build_scotland_route_clearance as builder

builder.TABLES = {
    "D1A": (range(594, 606), "Diesel multiple units", 15, None),
    "D1B": (range(606, 619), "Diesel multiple units", 15, None),
    "D2A": (range(619, 633), "Electric multiple units", 15, None),
    "D2B": (range(633, 643), "Electric multiple units", 15, None),
    "D2C": (range(643, 655), "Electric multiple units", 15, None),
    "D3": (range(655, 665), "Coaching stock", 15, None),
    "D4A": (range(665, 674), "Locomotives", 16, 15),
    "D4B": (range(674, 684), "Locomotives", 16, 15),
    "D4C": (range(684, 694), "Locomotives", 16, 15),
    "D4D": (range(694, 703), "Locomotives", 16, 15),
    "D5A": (range(703, 711), "Loading gauge", 2, None),
    "D5B": (range(711, 721), "Locomotive gauge", 16, 15),
}

if __name__ == "__main__":
    output = Path("src/route-clearance/lnw-south.js")
    if "--output" not in sys.argv:
        sys.argv.extend(["--output", str(output)])
    builder.main()
    output.write_text(output.read_text().replace("Generated from Scotland", "Generated from London North Western (South)"))
