#!/usr/bin/env python3
"""Extract missing ELR header metadata from published source crops."""
from __future__ import annotations

import argparse
import re
import subprocess
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_field(text: str, field: str) -> str:
    match = re.search(rf'{field}:\s*"([^"]+)"', text)
    return match.group(1) if match else ""


def candidate(path: Path) -> tuple[str, str]:
    text = path.read_text()
    region, lor, seq = path.parts[-3], path.parts[-2], path.stem
    asset = ROOT / "src" / "assets" / region / lor / f"{seq}.png"
    route = read_field(text, "route")
    aliases = {
        "lne": ["London North Eastern"],
        "lnw-north": ["North West", "London North Western"],
        "lnw-south": ["West Coast South", "London North Western", "Central"],
        "ksw": ["Kent / Sussex", "Kent / Sussex & Wessex"],
        "scotland": ["Scotland"],
    }
    routes = [route, *aliases.get(region, [])]
    if not asset.exists() or not route:
        return str(path), ""
    result = subprocess.run(
        ["tesseract", str(asset), "stdout", "--psm", "3"],
        capture_output=True, text=True, check=False,
    ).stdout.replace("\n", " ")
    # Header line precedes the date. Capture uppercase ELR tokens immediately
    # before the known route label. This deliberately leaves uncertain OCR blank.
    indices = [result.find(value) for value in routes if value]
    indices = [index for index in indices if index >= 0]
    if not indices:
        result = subprocess.run(
            ["tesseract", str(asset), "stdout", "--psm", "11"],
            capture_output=True, text=True, check=False,
        ).stdout.replace("\n", " ")
        indices = [result.find(value) for value in routes if value]
        indices = [index for index in indices if index >= 0]
    if not indices:
        return str(path), ""
    # The route name can also occur in the line description (for example
    # Wembley Central), whereas the header route is the final occurrence.
    index = max(indices)
    before = result[:index].rstrip(" |)]}")
    match = re.search(r"((?:[A-Z0-9]{2,5}(?:\s*[/;]\s*|\s+)?)+)$", before)
    return str(path), match.group(1).strip(" /;") if match else ""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--offset", type=int, default=0)
    args = parser.parse_args()
    paths = [p for p in ROOT.glob("src/data/**/*.js") if "elr:" not in p.read_text()]
    paths = paths[args.offset:]
    if args.limit:
        paths = paths[:args.limit]
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        rows = list(pool.map(candidate, paths))
    unresolved = []
    changed = 0
    for raw_path, elr in rows:
        path = Path(raw_path)
        if not elr:
            unresolved.append(raw_path)
            continue
        if args.apply:
            text = path.read_text()
            text = re.sub(r'(sequence:\s*"[^"]+",)', rf'\1\n  elr: "{elr}",', text, count=1)
            path.write_text(text)
            changed += 1
    print(f"missing={len(paths)} resolved={len(rows)-len(unresolved)} applied={changed} unresolved={len(unresolved)}")
    for path in unresolved:
        print(path)


if __name__ == "__main__":
    main()
