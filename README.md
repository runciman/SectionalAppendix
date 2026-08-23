# Scotland Sectional Appendix

A searchable React/Vite reference for indexed pages of the Scotland Sectional Appendix.

## Run locally

Install a current LTS release of [Node.js](https://nodejs.org/), then from the project directory run:

```bash
npm install
npm run dev
```

Vite will print the local address, normally `http://127.0.0.1:5173/`.

## Production build

Create an optimised production build with:

```bash
npm run build
```

Preview that build locally with:

```bash
npm run preview
```

## URLs

- `/` — search page
- `/scotland` — indexed Scotland LOR collections
- `/scotland/SC001` — all indexed sequences for an LOR
- `/scotland/SC001/001` — one sequence entry

When deploying to a static host, configure an SPA fallback so these paths serve `index.html`.

## Batch-indexing workflow

Use the preparation script before adding a large run of PDF pages. It screens
instruction-heavy pages using the embedded text layer, then optionally renders,
OCRs and crops only the remaining candidates. It never publishes page records
automatically: every candidate remains subject to review.

```bash
python3 scripts/prepare_index_batch.py \
  "/path/to/Scotland Sectional Appendix June 2026.pdf" \
  --pages 331-450 \
  --prepare
```

Results are written to `tmp/batch-index/manifest.json`, with direct source
renders, OCR drafts and candidate crops alongside it. Review only entries whose
status is `candidate_map`; treat `visual_review_required` as ambiguous and
ignore `exclude_text_heavy` entries unless there is a reason to override the
filter.

The script requires Python packages `pypdf` and `Pillow`, plus `pdftoppm` and
Tesseract. The Codex workspace already provides these dependencies; on another
machine install them with your usual package manager, for example:

```bash
python3 -m pip install pypdf Pillow
# macOS with Homebrew
brew install poppler tesseract
```
