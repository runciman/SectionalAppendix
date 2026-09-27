#!/usr/bin/env python3
"""Audit source-crop OCR for LOR/sequence references missing from record data."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path


# Operational LOR identifiers comprise a two-letter prefix and a three- or
# four-digit number.  Restricting the OCR triage expression to that shape
# prevents prose such as "SEQ002" and "ANY207" becoming fake connections.
REFERENCE = re.compile(
    r"\b([A-Z]{2}\s*\d{3,4})\s*,?\s*SEQ(?:UENCE)?\.?\s*(\d{1,3})\b",
    re.I,
)
FIELD = re.compile(r"\b[\"']?(?:lOR|sequence)[\"']?\s*:\s*[\"']([^\"']+)[\"']", re.I)
PDF_PAGE = re.compile(r"\b[\"']?pdfPage[\"']?\s*:\s*(\d+)", re.I)
CONNECTIONS = re.compile(r"\b[\"']?connections[\"']?\s*:\s*\[(.*?)\]", re.I | re.S)


def fields(record: Path) -> tuple[str, str]:
    values = FIELD.findall(record.read_text(encoding="utf-8"))
    if len(values) < 2:
        raise ValueError(f"Cannot read LOR/sequence from {record}")
    return values[0].upper(), values[1].zfill(3)


def references(text: str, own_lor: str, own_sequence: str) -> list[dict[str, str]]:
    found: dict[tuple[str, str], dict[str, str]] = {}
    for match in REFERENCE.finditer(text):
        lor = re.sub(r"\s+", "", match.group(1)).upper()
        sequence = match.group(2).zfill(3)
        if (lor, sequence) == (own_lor, own_sequence):
            continue
        start = max(0, match.start() - 56)
        end = min(len(text), match.end() + 56)
        found[(lor, sequence)] = {
            "lOR": lor,
            "sequence": sequence,
            "ocrContext": " ".join(text[start:end].split()),
        }
    return list(found.values())


def existing_references(source: str, own_lor: str, own_sequence: str) -> list[dict[str, str]]:
    """Extract references from the structured connections field only.

    The record transcription repeats connection prose, so searching the entire
    module would falsely classify an unstructured reference as captured data.
    """
    match = CONNECTIONS.search(source)
    return references(match.group(1), own_lor, own_sequence) if match else []


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", required=True)
    parser.add_argument("--only-empty", action="store_true")
    parser.add_argument("--pages", help="Physical PDF page range, e.g. 283-307")
    parser.add_argument("--output", type=Path, default=Path("tmp/connection-audit.json"))
    args = parser.parse_args()

    page_start = page_end = None
    if args.pages:
        try:
            page_start, page_end = (int(value) for value in args.pages.split("-", 1))
        except ValueError as exc:
            raise SystemExit("--pages must be START-END") from exc

    root = Path(__file__).resolve().parents[1]
    data_root = root / "src" / "data" / args.region
    assets_root = root / "src" / "assets" / args.region
    findings = []
    for record in sorted(data_root.glob("*/*.js")):
        source = record.read_text(encoding="utf-8")
        page_match = PDF_PAGE.search(source)
        if not page_match:
            raise ValueError(f"Cannot read pdfPage from {record}")
        pdf_page = int(page_match.group(1))
        if page_start is not None and not page_start <= pdf_page <= page_end:
            continue
        if args.only_empty and not re.search(r"connections\s*:\s*\[\s*\]", source):
            continue
        lor, sequence = fields(record)
        asset = assets_root / lor / f"{sequence}.png"
        if not asset.exists():
            raise FileNotFoundError(asset)
        ocr = subprocess.run(
            ["tesseract", str(asset), "stdout", "--psm", "11"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout
        candidates = references(ocr, lor, sequence)
        existing = existing_references(source, lor, sequence)
        existing_keys = {(item["lOR"], item["sequence"]) for item in existing}
        missing = [item for item in candidates if (item["lOR"], item["sequence"]) not in existing_keys]
        findings.append({
            "record": str(record.relative_to(root)),
            "pdfPage": pdf_page,
            "lOR": lor,
            "sequence": sequence,
            "existing": existing,
            "candidates": candidates,
            "missing": missing,
        })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(findings, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "recordsAudited": len(findings),
        "recordsWithCandidates": sum(bool(item["candidates"]) for item in findings),
        "recordsWithMissingCandidates": sum(bool(item["missing"]) for item in findings),
        "output": str(args.output),
    }))


if __name__ == "__main__":
    main()
