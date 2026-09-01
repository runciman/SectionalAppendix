# Sectional Appendix indexing guide

This is a Vite + React site for searchable sectional-appendix map entries.
Preserve existing records, source crops, URLs and navigation when extending it.

## Architecture and URL contract

Entries are stored to match their public route:

```text
src/data/<region>/<LOR>/<SEQ>.js
src/assets/<region>/<LOR>/<SEQ>.png
```

For example, `/scotland/SC031/021` is backed by:

```text
src/data/scotland/SC031/021.js
src/assets/scotland/SC031/021.png
```

`src/pages.js` discovers all `src/data/**/*.js` records recursively. Do not add
central imports for a normal new record. A valid record exports one object with
at least `pdfPage`, `lOR`, `sequence`, `imageSrc`, `imageAlt`, `location`,
`mileage`, searchable structured fields and a concise `transcription`.

Public routes are:

- `/` — search home page.
- `/<region>` — region's LOR index.
- `/<region>/<LOR>` — every sequence entry for that LOR.
- `/<region>/<LOR>/<SEQ>` — one map entry.

Keep LOR and SEQ URL values uppercase and zero-padded. `SEQ` is a numeric
sequence within a shared LOR: previous/next links must only point to adjacent
existing entries in that LOR. Test direct URLs, not only in-page navigation.

## Multi-region expansion gate

Scotland is the first indexed region. Before adding any other regional PDF,
finish the multi-region routing refactor: the current UI still has Scotland
specific route parsing and path helpers. Do not add another region's records
until every record carries a region slug and the following use that slug rather
than a hard-coded `scotland` value:

- route parsing and direct URLs;
- search-result links;
- region and LOR collection pages; and
- individual page, connection, and previous/next links.

The root search must return results from every live region. A homepage region
card may link to a region only after its routes, collection page, direct record
URLs and cross-region search results have been verified.

## Homepage and typography

The homepage uses a simple regional card index: Scotland is live and the
remaining listed regions are marked as coming soon. Do not reintroduce a
decorative map without an approved geographic asset and a clear interaction
design.

Use Helvetica Neue (with Helvetica/Arial fallbacks) throughout the interface.
If Transport is later used for the main title, add a correctly licensed local
webfont file and a visible Open Government Licence attribution; do not rely on
a visitor having the font installed.

## What qualifies for indexing

Index only the established map-table format: a LOR and sequence header with
Location, Mileage, Running lines & speed restrictions, and related signalling
or remarks. Do not index blank pages, contents pages, module overview maps,
special-working pages, rule-book prose, or authority tables.

If a page is genuinely ambiguous, record its physical PDF page number for user
review rather than guessing. A page explicitly marked withdrawn can be indexed
if it has the standard map-entry table, but its record must clearly say that it
is withdrawn.

## Fast, low-token PDF workflow

Do not use one model turn per physical page or wait for periodic batches. Keep
the worker queue full and process candidates in bounded groups. The source PDF
often has a minimal embedded text layer on map pages and a long embedded text
layer on instruction pages, which supports this two-stage process:

1. Run the local pre-filter and OCR preparation script for a page range:

   ```bash
   python3 scripts/prepare_index_batch.py \
     "/path/to/Sectional Appendix.pdf" \
     --pages 331-450 \
     --prepare
   ```

2. Read `tmp/batch-index/manifest.json`.
   - `exclude_text_heavy`: normally an instruction page; do not render/review
     further unless there is a reason to override it.
   - `candidate_map`: local Tesseract found a plausible LOR/SEQ header; review
     this first.
   - `visual_review_required`: the text-layer filter was inconclusive; inspect
     a thumbnail or rendered page before deciding.

3. Review candidate pages in batches (for example, contact sheets or 10–25
   records per reviewer), then create only verified data modules. Local OCR is
   a draft, not authority: correct LOR, SEQ, title, mileage, signalling, speed
   and remarks against the source image.

   A source crop alone is never a completed entry. For every retained crop,
   create its matching `src/data/<region>/<LOR>/<SEQ>.js` record in the same
   batch, verify the record against the source page, and run the site checks
   before describing that page as indexed or ready to commit.

4. Use the original rendered PDF for every published crop. Do not redraw a
   map, approximate its linework, or publish a crop solely because OCR parsed
   a header.

The scripts require `pypdf`, `Pillow`, `pdftoppm` and Tesseract. Their working
outputs belong under `tmp/`, which is ignored by Git.

## Crops and visual QA

Each published PNG must be a direct crop of the complete outer table from the
original PDF page. It must include the full Location, Mileage, Running lines &
speed restrictions and Signalling & Remarks area; do not cut the right-hand
remarks column or GSM-R/equipment symbols. Keep a small margin around the
detected table border so anti-aliased rules are not clipped.

After any batch of new or edited crops, run:

```bash
python3 scripts/audit_table_crops.py \
  "/path/to/Sectional Appendix.pdf" \
  --fix
```

This compares every published crop with table bounds detected from the source
PDF and replaces only dimensionally mismatched images. For a large run, pass a
bounded range such as `--pages 331-450`. Visually inspect at least every
repaired crop and a representative sample of passing crops; automation catches
missing boundaries, not semantic transcription mistakes.

## Record-writing rules

1. Use the physical PDF page number, not the printed module page number, for
   `pdfPage`.
2. Keep transcription concise but searchable: include identifiers, locations,
   mileages, connections, signalling, speeds, equipment and relevant remarks.
3. Do not infer facts that are not visible in the source. When speed change
   points are unclear, use cautious wording rather than invented precision.
4. Import the matching route-aligned PNG from the data module. Use descriptive
   image alt text that states it is an original source-PDF table extract.
5. Preserve capitalization and official codes where legible. Use structured
   arrays (`locations`, `connections`, `signalling`, `speeds`) when information
   is present, so search covers it naturally.

## Required verification

Before handing off a batch:

```bash
npm run build
git diff --check
```

Also verify in the local site:

- the source crop loads for a newly added or repaired record;
- a distinctive source term finds the record through search;
- `/<region>/<LOR>/<SEQ>` loads directly;
- `/<region>/<LOR>` shows the expected collection; and
- previous/next links remain within the same LOR.

Static hosting must serve `index.html` as an SPA fallback for direct route URLs.

## Batch lifecycle and commit gate

Treat every 25 physical PDF pages as a parent-owned batch with these states:

1. `processing` — reviewers inspect their assigned pages.
2. `verification_pending` — the parent collects every result, including every
   confident skip and uncertainty.
3. `ready_to_commit` — every physical page is either an explicitly recorded
   skip/uncertainty or has a complete, source-verified record and crop.
4. `committed` — the parent stages only the verified records/crops and creates
   the batch commit.

Subagents must never commit a shared batch. The parent must not stop after
receiving subagent results: it must either complete the commit gate or report a
specific blocker. A progress report is not a handoff until it includes the
batch commit hash (or the documented blocker and next physical PDF page).

When the user has asked to process the remaining PDF, a successful batch commit
is a checkpoint, not a stopping condition. Immediately start the next
unprocessed physical 25-page range after committing. Continue until the final
PDF page, a genuine blocker, or the user's token limit is reached. In the last
two cases, report the next unprocessed physical PDF page so work can resume
without re-triage.

After each committed batch, send a concise progress report while immediately
continuing work. Include the completed physical page range, commit hash,
number indexed, number confidently skipped, any uncertain pages, and the next
physical page range in progress.

Before every batch commit, run:

```bash
python3 scripts/validate_index_batch.py --pages 455-479
npm run build
git diff --check
```

Pass `--skips` for confidently excluded physical pages, for example
`--skips 437-438`. The validator rejects any page not accounted for, duplicate
records for a PDF page, a missing crop import, or a record without OCR-backed
transcription. Do not commit if this gate fails.

## Autonomous continuation

When instructed to process the remaining PDF, continue autonomously through
every remaining physical 25-page batch. Do not treat a progress update, batch
commit, or completed checkpoint as a pause, handoff, or request for further
permission.

After each batch commit, immediately prepare and assign reviewers for the next
unprocessed range in the same active turn. Progress reports are informational
only and must not end the work. Stop only after the final physical PDF page is
committed, a genuine blocker is documented, or the user explicitly asks to
stop.

### Turn-continuation enforcement

For a remaining-PDF request, do not send a final response, yield control, or
otherwise end the active turn after a progress report, reviewer result, batch
gate, or batch commit. A final response is allowed only at the terminal
condition above. After every commentary update, immediately perform the next
useful task action (for example, collect reviewer results, validate, commit,
prepare, or assign the next batch). Do not wait for the user to nudge or
confirm continuation.

In this interface, sending a message on the `final` channel ends the parent
turn. Therefore, while a remaining-PDF request is incomplete, never use the
`final` channel for a progress report, acknowledgement, checkpoint, or
explanation. Use `commentary` only, then continue with a concrete task action.
Treat an incomplete PDF as an active background of every turn until its final
physical page has passed the commit gate.

## Git hygiene

- Do not commit `tmp/`, Python `__pycache__/`, `node_modules/` or `dist/`.
- Stage only reviewed records, their matching crops, and intentional source or
  documentation changes.
- Run the production build before committing a substantive batch.
