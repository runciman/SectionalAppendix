#!/usr/bin/env python3
"""Create route-aligned Table A record drafts from a source-verified TSV plan.

The plan is deliberately supplied by a reviewer. This tool only performs the
mechanical crop copy and module writing; it does not decide whether a page
qualifies for indexing.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("plan", type=Path)
    parser.add_argument("--crop-directory", type=Path, required=True)
    parser.add_argument("--region", required=True)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    for raw_line in args.plan.read_text().splitlines():
        if not raw_line.strip() or raw_line.startswith("#"):
            continue
        page, lor, sequence, title, location, route = raw_line.split("\t")
        source = args.crop_directory / f"page-{int(page):04d}.png"
        if not source.exists():
            raise FileNotFoundError(source)
        asset = root / "src" / "assets" / args.region / lor / f"{sequence}.png"
        data = root / "src" / "data" / args.region / lor / f"{sequence}.js"
        asset.parent.mkdir(parents=True, exist_ok=True)
        data.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, asset)
        payload = {
            "pdfPage": int(page), "lOR": lor, "sequence": sequence,
            "title": title, "route": route,
            "imageSrc": "__IMAGE_SRC__",
            "imageAlt": f"Original source-PDF Table A extract for {lor} sequence {sequence}.",
            "location": location, "mileage": "Mileage is shown on the source diagram",
            "locations": [part.strip() for part in location.split(" to ")],
            "connections": [],
            "signalling": ["Signalling details are shown on the source diagram"],
            "speeds": ["Running-line speed restrictions are shown on the source diagram"],
            "transcription": (
                f"{lor} sequence {sequence}, {title}, physical PDF page {page}. "
                f"{location}. Mileages, signalling and speed restrictions are shown in the source table."
            ),
        }
        fields = []
        for key, value in payload.items():
            rendered = "imageSrc" if value == "__IMAGE_SRC__" else json.dumps(value, ensure_ascii=False)
            fields.append(f"  {key}: {rendered}")
        module = (
            f'import imageSrc from "../../../assets/{args.region}/{lor}/{sequence}.png";\n\n'
            f"const page{page} = {{\n{',\n'.join(fields)}\n}};\n\n"
            f"export default page{page};\n"
        )
        data.write_text(module)


if __name__ == "__main__":
    main()
