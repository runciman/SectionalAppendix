#!/usr/bin/env python3
"""Create a manual-review list from connection-audit findings.

This deliberately never edits record modules. OCR identifies candidates; a
reviewer must compare each item against the source crop and make the resulting
connection edit manually. This preserves the source-verification gate in
AGENTS.md while avoiding repeated audit-file triage.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", required=True, help="Connection-audit JSON file, relative to the repository root or absolute")
    parser.add_argument("--pages", required=True, help="Inclusive PDF-page range, e.g. 151-175")
    parser.add_argument("--output", help="Optional JSON output path for the filtered review list")
    args = parser.parse_args()
    start, end = (int(value) for value in args.pages.split("-", 1))
    audit = Path(args.audit)
    if not audit.is_absolute():
        audit = ROOT / audit
    findings = json.loads(audit.read_text(encoding="utf-8"))
    known_lors = {path.parent.name for path in (ROOT / "src/data").glob("*/*/*.js")}
    review = []
    for finding in findings:
        if not start <= finding["pdfPage"] <= end:
            continue
        candidates = [
            item for item in finding.get("missing", [])
            if item.get("lOR") in known_lors and item.get("sequence")
        ]
        if candidates:
            review.append({
                "record": finding["record"],
                "pdfPage": finding["pdfPage"],
                "candidates": candidates,
                "instruction": "Visually verify every candidate against the source crop before manually editing connections.",
            })
    payload = {"recordsForReview": len(review), "findings": review}
    if args.output:
        output = Path(args.output)
        if not output.is_absolute():
            output = ROOT / output
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload))


if __name__ == "__main__":
    main()
