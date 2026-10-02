#!/usr/bin/env python3
"""Build Kent, Sussex & Wessex route-clearance data from its Appendix PDF."""

from __future__ import annotations

import sys

import build_scotland_route_clearance as builder


# Kent/Sussex tables occupy physical pages 895-1064; Wessex tables begin at
# 1067.  The D5A/D5B labels are confirmed from the source headers: D5A is
# Loading Gauge and D5B is Locomotive Gauge in both sections.
builder.TABLES = {
    "D1A-KS": (range(895, 908), "Diesel multiple units", 15, None),
    "D1B-KS": (range(908, 921), "Diesel multiple units", 15, None),
    "D2A-KS": (range(921, 935), "Electric multiple units", 15, None),
    "D2B-KS": (range(935, 949), "Electric multiple units", 15, None),
    "D2C-KS": (range(949, 963), "Electric multiple units", 15, None),
    "D3A-KS": (range(963, 977), "Coaching stock", 15, None),
    "D4A-KS": (range(977, 991), "Locomotives", 16, 15),
    "D4B-KS": (range(991, 1005), "Locomotives", 16, 15),
    "D4C-KS": (range(1005, 1018), "Locomotives", 16, 15),
    "D4D-KS": (range(1018, 1030), "Locomotives", 16, 15),
    "D5A-KS": (range(1030, 1051), "Loading gauge", 2, None),
    "D5B-KS": (range(1051, 1065), "Locomotive gauge", 16, 15),
    "D1A-WX": (range(1067, 1077), "Diesel multiple units", 15, None),
    "D1B-WX": (range(1077, 1085), "Diesel multiple units", 15, None),
    "D2A-WX": (range(1085, 1093), "Electric multiple units", 15, None),
    "D2B-WX": (range(1093, 1101), "Electric multiple units", 15, None),
    "D3-WX": (range(1101, 1109), "Coaching stock", 15, None),
    "D4A-WX": (range(1109, 1117), "Locomotives", 16, 15),
    "D4B-WX": (range(1117, 1125), "Locomotives", 16, 15),
    "D4C-WX": (range(1125, 1133), "Locomotives", 16, 15),
    "D4D-WX": (range(1133, 1139), "Locomotives", 16, 15),
    "D5A-WX": (range(1139, 1149), "Loading gauge", 2, None),
    "D5B-WX": (range(1149, 1158), "Locomotive gauge", 16, 15),
}


if __name__ == "__main__":
    if "--output" not in sys.argv:
        sys.argv.extend(["--output", "src/route-clearance/ksw.js"])
    builder.main()
