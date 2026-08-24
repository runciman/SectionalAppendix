#!/usr/bin/env python3
"""Validate that an appendix PDF batch is fully accounted for before commit."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def parse_pages(value: str) -> set[int]:
    pages: set[int] = set()
    if not value:
        return pages
    for part in value.split(","):
        bounds = [int(item) for item in part.strip().split("-", 1)]
        start, end = (bounds[0], bounds[-1])
        pages.update(range(min(start, end), max(start, end) + 1))
    return pages


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pages", required=True, help="Physical pages, e.g. 455-479")
    parser.add_argument("--skips", default="", help="Explicitly excluded physical pages")
    parser.add_argument("--project", type=Path, default=Path("."))
    args = parser.parse_args()
    expected, skips = parse_pages(args.pages), parse_pages(args.skips)
    if not skips <= expected:
        parser.error("--skips contains pages outside --pages")

    records: dict[int, Path] = {}
    errors: list[str] = []
    for record in (args.project / "src/data").glob("**/[0-9][0-9][0-9].js"):
        source = record.read_text(encoding="utf-8")
        match = re.search(r"\bpdfPage:\s*(\d+)", source)
        if not match:
            continue
        page = int(match.group(1))
        if page not in expected:
            continue
        if page in records:
            errors.append(f"PDF page {page} appears in both {records[page]} and {record}")
            continue
        records[page] = record
        image = re.search(r"import\s+imageSrc\s+from\s+[\"']([^\"']+)[\"']", source)
        if not image:
            errors.append(f"PDF page {page}: no imageSrc import in {record}")
        elif not (record.parent / image.group(1)).resolve().is_file():
            errors.append(f"PDF page {page}: missing crop {(record.parent / image.group(1)).resolve()}")
        if not re.search(r"\btranscription:\s*[\"']", source):
            errors.append(f"PDF page {page}: missing OCR-backed transcription")

    overlap = sorted(set(records) & skips)
    if overlap:
        errors.append(f"Pages cannot be both indexed and skipped: {overlap}")
    missing = sorted(expected - set(records) - skips)
    if missing:
        errors.append(f"Pages not accounted for: {missing}")
    if errors:
        print("Batch validation failed:", *errors, sep="\n- ", file=sys.stderr)
        return 1
    print(f"Batch validation passed: {len(records)} indexed, {len(skips)} skipped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
