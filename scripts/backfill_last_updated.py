#!/usr/bin/env python3
"""Extract and apply visible Table A header dates to records missing lastUpdated.

Uses the published source crop (itself an original PDF extract) as authority.
The script only applies an unambiguous DD/MM/YYYY value found in the header's
first OCR lines; unresolved or ambiguous records are emitted for visual review.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATE = re.compile(r"\b(0[1-9]|[12]\d|3[01])/(0[1-9]|1[0-2])/((?:19|20)\d{2})\b")
FIELD = re.compile(r"[\"']?lastUpdated[\"']?\s*:\s*(['\"])(.*?)\1")
PDF_PAGE = re.compile(r"\bpdfPage\s*:\s*(\d+)")


def candidate(record: Path) -> dict:
    source = record.read_text()
    field = FIELD.search(source)
    if field and field.group(2).strip():
        return {"record": str(record.relative_to(ROOT)), "status": "already_set"}
    rel = record.relative_to(ROOT / "src/data")
    region, lor, sequence = rel.parts[:3]
    crop = ROOT / "src/assets" / region / lor / f"{sequence[:-3] if sequence.endswith('.js') else sequence}.png"
    # sequence is the filename, e.g. 001.js.
    crop = ROOT / "src/assets" / region / lor / f"{record.stem}.png"
    pdf_page = PDF_PAGE.search(source)
    try:
        # Restrict OCR to the actual top header. Full table OCR is slow and can
        # find unrelated dates in remarks; ImageMagick's explicit +0+0 offset
        # avoids the centre-crop behaviour of platform image utilities.
        width = subprocess.run(
            ["magick", "identify", "-format", "%w", str(crop)],
            check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        ).stdout.strip()
        with tempfile.TemporaryDirectory(prefix="sectional-header-") as directory:
            header_crop = Path(directory) / "header.png"
            subprocess.run(
                ["magick", str(crop), "-crop", f"{width}x750+0+0", "+repage", str(header_crop)],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            ocr = subprocess.run(
                ["tesseract", str(header_crop), "stdout", "--psm", "6"],
                check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            ).stdout
    except subprocess.CalledProcessError:
        return {"record": str(record.relative_to(ROOT)), "pdfPage": int(pdf_page.group(1)) if pdf_page else None, "status": "ocr_failed"}
    header = " ".join(ocr.splitlines()[:3])
    dates = sorted({m.group(0) for m in DATE.finditer(header)})
    return {
        "record": str(record.relative_to(ROOT)),
        "pdfPage": int(pdf_page.group(1)) if pdf_page else None,
        "crop": str(crop.relative_to(ROOT)),
        "header": header,
        "dates": dates,
        "status": "candidate" if len(dates) == 1 else "review_required",
    }


def apply_date(finding: dict) -> None:
    path = ROOT / finding["record"]
    source = path.read_text()
    date = finding["dates"][0]
    replacement = f'lastUpdated: "{date}"'
    if FIELD.search(source):
        source = FIELD.sub(replacement, source, count=1)
    else:
        # Keep header metadata together, immediately after route when present.
        route = re.compile(r"([\"']?route[\"']?\s*:\s*(?:['\"]).*?(?:['\"]),)")
        if not route.search(source):
            raise ValueError(f"No route field in {path}")
        source = route.sub(rf"\1\n  {replacement},", source, count=1)
    path.write_text(source)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--output", default="tmp/last-updated-backfill.json")
    args = parser.parse_args()
    records = sorted((ROOT / "src/data").glob("**/*.js"))
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        findings = list(pool.map(candidate, records))
    candidates = [f for f in findings if f["status"] == "candidate"]
    if args.apply:
        for finding in candidates:
            apply_date(finding)
    output = ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(findings, indent=2) + "\n")
    counts = {status: sum(f["status"] == status for f in findings) for status in sorted({f["status"] for f in findings})}
    print(json.dumps({"counts": counts, "output": str(output.relative_to(ROOT))}))


if __name__ == "__main__":
    main()
