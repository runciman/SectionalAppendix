#!/usr/bin/env python3
"""Audit source-crop OCR for LOR/sequence references missing from record data."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path


REFERENCE = re.compile(r"\b([A-Z]{2,4}\s*\d{3,4})\s*(?:,?\s*(?:SEQ(?:UENCE)?\.?\s*)?)(\d{1,3})\b", re.I)
FIELD = re.compile(r"\b(?:lOR|sequence)\s*:\s*[\"']([^\"']+)[\"']", re.I)


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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", required=True)
    parser.add_argument("--only-empty", action="store_true")
    parser.add_argument("--output", type=Path, default=Path("tmp/connection-audit.json"))
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    data_root = root / "src" / "data" / args.region
    assets_root = root / "src" / "assets" / args.region
    findings = []
    for record in sorted(data_root.glob("*/*.js")):
        source = record.read_text(encoding="utf-8")
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
        if candidates:
            findings.append({
                "record": str(record.relative_to(root)),
                "pdfPage": int(re.search(r"pdfPage\s*:\s*(\d+)", source).group(1)),
                "lOR": lor,
                "sequence": sequence,
                "candidates": candidates,
            })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(findings, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"recordsWithCandidates": len(findings), "output": str(args.output)}))


if __name__ == "__main__":
    main()
