#!/usr/bin/env python3
"""Prepare Sectional Appendix pages for fast, reviewable indexing.

This script deliberately stops before publishing React data records. It filters
text-heavy instruction pages locally, renders the remaining candidates, uses
Tesseract to recognise the standard map-entry header, and creates direct crops
from the original PDF render for human or model review.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from collections import Counter
from pathlib import Path

from PIL import Image
from pypdf import PdfReader

TEXT_HEAVY_THRESHOLD = 500
# Retain a margin around the full table. The crop audit can tighten this later,
# but a conservative crop never loses the right-hand remarks column.
DEFAULT_CROP = (0.03, 0.10, 0.98, 0.92)
CODEX_PDFTOPPM = Path(
    "/Users/scotty/.cache/codex-runtimes/codex-primary-runtime/"
    "dependencies/bin/override/pdftoppm"
)


def parse_pages(spec: str | None, total: int) -> list[int]:
    if not spec:
        return list(range(1, total + 1))
    pages: set[int] = set()
    for segment in spec.split(","):
        start_end = segment.strip().split("-", maxsplit=1)
        try:
            start = int(start_end[0])
            end = int(start_end[-1])
        except ValueError as error:
            raise ValueError(f"Invalid page range: {segment!r}") from error
        pages.update(range(min(start, end), max(start, end) + 1))
    invalid = sorted(page for page in pages if page < 1 or page > total)
    if invalid:
        raise ValueError(f"Pages outside 1-{total}: {invalid}")
    return sorted(pages)


def executable(name: str, fallback: Path | None = None) -> str:
    if path := shutil.which(name):
        return path
    if fallback and fallback.exists():
        return str(fallback)
    raise RuntimeError(f"{name} was not found. Install it or add it to PATH.")


def run(command: list[str]) -> None:
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def render_page(renderer: str, pdf: Path, page: int, dpi: int, output_dir: Path) -> Path:
    prefix = output_dir / f"page-{page:04d}"
    run([renderer, "-f", str(page), "-l", str(page), "-r", str(dpi), "-png", str(pdf), str(prefix)])
    rendered = sorted(output_dir.glob(f"page-{page:04d}-*.png"))
    if len(rendered) != 1:
        raise RuntimeError(f"Expected one render for page {page}; found {rendered}")
    return rendered[0]


def read_ocr(tesseract: str, image: Path) -> str:
    completed = subprocess.run(
        [tesseract, str(image), "stdout", "--psm", "6"],
        check=True,
        text=True,
        capture_output=True,
    )
    return completed.stdout


def recognised_header(ocr_text: str) -> tuple[str | None, str | None]:
    """Read a conservative LOR/SEQ pair from the standard map-entry header."""
    flattened = " ".join(ocr_text.upper().split())
    lor_match = re.search(r"(?:SC|\$C|5C)\s*(\d{3})\b", flattened)
    if not lor_match:
        return None, None
    lor = f"SC{lor_match.group(1)}"
    tail = flattened[lor_match.end():lor_match.end() + 24]
    sequence_match = re.search(r"(?:SEQ(?:UENCE)?\.?\s*)?(\d{3})\b", tail)
    return lor, sequence_match.group(1) if sequence_match else None


def crop_source(render: Path, output: Path, crop: tuple[float, float, float, float]) -> None:
    with Image.open(render) as image:
        width, height = image.size
        left, top, right, bottom = crop
        box = (round(width * left), round(height * top), round(width * right), round(height * bottom))
        image.crop(box).save(output)


def relative(path: Path, root: Path) -> str:
    return str(path.relative_to(root))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path, help="Source Sectional Appendix PDF")
    parser.add_argument("--pages", help="Physical pages, for example 169-225,262-330")
    parser.add_argument("--output", type=Path, default=Path("tmp/batch-index"), help="Working output directory")
    parser.add_argument("--prepare", action="store_true", help="Render, OCR and crop non-text-heavy candidates")
    parser.add_argument("--dpi", type=int, default=180, help="DPI for candidate renders (default: 180)")
    parser.add_argument("--crop", default=",".join(map(str, DEFAULT_CROP)), help="Normalised crop: left,top,right,bottom")
    args = parser.parse_args()

    if not args.pdf.is_file():
        parser.error(f"PDF not found: {args.pdf}")
    crop = tuple(float(value) for value in args.crop.split(","))
    if len(crop) != 4 or not (0 <= crop[0] < crop[2] <= 1 and 0 <= crop[1] < crop[3] <= 1):
        parser.error("--crop must be four increasing normalised co-ordinates")

    reader = PdfReader(str(args.pdf))
    pages = parse_pages(args.pages, len(reader.pages))
    output = args.output.resolve()
    renders = output / "renders"
    crops = output / "crops"
    ocr_dir = output / "ocr"
    output.mkdir(parents=True, exist_ok=True)
    if args.prepare:
        renderer = executable("pdftoppm", CODEX_PDFTOPPM)
        tesseract = executable("tesseract")
        for directory in (renders, crops, ocr_dir):
            directory.mkdir(exist_ok=True)

    manifest: list[dict[str, object]] = []
    counts: Counter[str] = Counter()
    for page_number in pages:
        embedded_text = (reader.pages[page_number - 1].extract_text() or "").strip()
        item: dict[str, object] = {
            "pdfPage": page_number,
            "embeddedTextCharacters": len(embedded_text),
            "status": "exclude_text_heavy" if len(embedded_text) > TEXT_HEAVY_THRESHOLD else "visual_review_required",
        }
        if args.prepare and item["status"] != "exclude_text_heavy":
            render = render_page(renderer, args.pdf, page_number, args.dpi, renders)
            ocr_text = read_ocr(tesseract, render)
            lor, sequence = recognised_header(ocr_text)
            ocr_file = ocr_dir / f"page-{page_number:04d}.txt"
            ocr_file.write_text(ocr_text, encoding="utf-8")
            item["render"] = relative(render, output)
            item["ocr"] = relative(ocr_file, output)
            item["suggestedLOR"] = lor
            item["suggestedSequence"] = sequence
            if lor:
                crop_file = crops / f"page-{page_number:04d}.png"
                crop_source(render, crop_file, crop)
                item["crop"] = relative(crop_file, output)
                if sequence:
                    item["status"] = "candidate_map"
        counts[str(item["status"])] += 1
        manifest.append(item)

    manifest_file = output / "manifest.json"
    manifest_file.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {manifest_file}")
    print(" | ".join(f"{status}: {count}" for status, count in sorted(counts.items())))
    print("Review candidate_map entries before copying crops to src/assets or adding src/data records.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.CalledProcessError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
