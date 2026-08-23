#!/usr/bin/env python3
"""Verify that indexed source crops include the full PDF table and repair failures."""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

CODEX_PDFTOPPM = Path(
    "/Users/scotty/.cache/codex-runtimes/codex-primary-runtime/"
    "dependencies/bin/override/pdftoppm"
)


@dataclass
class Entry:
    pdf_page: int
    module: Path
    asset: Path


def executable() -> str:
    if path := shutil.which("pdftoppm"):
        return path
    if CODEX_PDFTOPPM.exists():
        return str(CODEX_PDFTOPPM)
    raise RuntimeError("pdftoppm was not found")


def entries(project: Path) -> list[Entry]:
    found: list[Entry] = []
    for module in sorted((project / "src/data").glob("**/*.js")):
        text = module.read_text(encoding="utf-8")
        page = re.search(r'"?pdfPage"?\s*:\s*(\d+)', text)
        asset = re.search(r'import\s+\w+\s+from\s+"([^"]+\.png)"', text)
        if not page or not asset:
            raise RuntimeError(f"Could not read page or asset import from {module}")
        found.append(Entry(int(page.group(1)), module, (module.parent / asset.group(1)).resolve()))
    return found


def parse_pages(spec: str | None) -> set[int] | None:
    if not spec:
        return None
    selected: set[int] = set()
    for segment in spec.split(","):
        values = segment.strip().split("-", maxsplit=1)
        try:
            start, end = int(values[0]), int(values[-1])
        except ValueError as error:
            raise RuntimeError(f"Invalid page range: {segment!r}") from error
        selected.update(range(min(start, end), max(start, end) + 1))
    return selected


def render(renderer: str, pdf: Path, page: int, dpi: int, directory: Path) -> Path:
    prefix = directory / f"page-{page:04d}"
    subprocess.run(
        [renderer, "-f", str(page), "-l", str(page), "-r", str(dpi), "-png", str(pdf), str(prefix)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    rendered = sorted(directory.glob(f"page-{page:04d}-*.png"))
    if len(rendered) != 1:
        raise RuntimeError(f"Expected one render for PDF page {page}; found {rendered}")
    return rendered[0]


def table_box(image: Image.Image) -> tuple[int, int, int, int]:
    """Find the outer map-entry table using its long horizontal rules."""
    grey = np.asarray(image.convert("L"))
    # PDFKit/Poppler anti-aliases some otherwise solid table rules as dark grey.
    dark = grey < 180
    height, width = dark.shape
    rows = np.flatnonzero(dark.sum(axis=1) >= width * 0.50)
    if len(rows) < 2:
        raise RuntimeError("Could not locate long table rules")
    top, bottom = int(rows.min()), int(rows.max())
    points = np.flatnonzero(dark[rows].any(axis=0))
    if not len(points):
        raise RuntimeError("Could not locate table bounds")
    left, right = int(points.min()), int(points.max())
    if right - left < width * 0.5 or bottom - top < height * 0.4:
        raise RuntimeError("Detected table bounds are implausibly small")
    return left, top, right + 1, bottom + 1


def needs_replacement(asset: Path, expected_box: tuple[int, int, int, int]) -> bool:
    """Detect a crop that is materially narrower or taller than the source table."""
    expected_left, expected_top, expected_right, expected_bottom = expected_box
    expected_ratio = (expected_right - expected_left) / (expected_bottom - expected_top)
    with Image.open(asset) as image:
        actual_ratio = image.width / image.height
    return abs(actual_ratio / expected_ratio - 1) > 0.10


def replace_crop(rendered: Path, asset: Path) -> None:
    with Image.open(rendered) as image:
        left, top, right, bottom = table_box(image)
        margin = 3
        crop = image.crop((max(0, left - margin), max(0, top - margin), min(image.width, right + margin), min(image.height, bottom + margin)))
        crop.save(asset)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path, help="Original Sectional Appendix PDF")
    parser.add_argument("--project", type=Path, default=Path.cwd(), help="Repository root")
    parser.add_argument("--work-dir", type=Path, default=Path("tmp/crop-audit"), help="Temporary renders")
    parser.add_argument("--dpi", type=int, default=220, help="Render resolution")
    parser.add_argument("--pages", help="Indexed physical pages, for example 169-225,262-303")
    parser.add_argument("--fix", action="store_true", help="Replace crops that fail the outer-border audit")
    args = parser.parse_args()
    if not args.pdf.is_file():
        parser.error(f"PDF not found: {args.pdf}")

    project = args.project.resolve()
    work_dir = (project / args.work_dir).resolve()
    work_dir.mkdir(parents=True, exist_ok=True)
    renderer = executable()
    selected_pages = parse_pages(args.pages)
    all_entries = [entry for entry in entries(project) if selected_pages is None or entry.pdf_page in selected_pages]
    if not all_entries:
        parser.error("No indexed entries match --pages")
    failures: list[tuple[Entry, Path]] = []
    for entry in all_entries:
        if not entry.asset.is_file():
            raise RuntimeError(f"Missing crop: {entry.asset}")
        rendered = render(renderer, args.pdf, entry.pdf_page, args.dpi, work_dir)
        with Image.open(rendered) as image:
            expected_box = table_box(image)
        if needs_replacement(entry.asset, expected_box):
            failures.append((entry, rendered))

    print(f"Audited {len(all_entries)} indexed crops; {len(failures)} need replacement.")
    if not args.fix:
        for entry, _ in failures:
            print(f"PDF page {entry.pdf_page}: {entry.asset.relative_to(project)}")
        return 0

    for entry, rendered in failures:
        replace_crop(rendered, entry.asset)
        with Image.open(rendered) as image:
            if needs_replacement(entry.asset, table_box(image)):
                raise RuntimeError(f"Replacement crop failed aspect audit: {entry.asset}")
        print(f"Fixed PDF page {entry.pdf_page}: {entry.asset.relative_to(project)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
