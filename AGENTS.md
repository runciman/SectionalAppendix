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

### Header-field completeness gate

Every indexed record must transcribe the complete source-table header before it
is eligible for commit: LOR, sequence, Line of Route Description/title, ELR,
route, and **Last Updated**. Store the visible date in `lastUpdated` using the
source's `DD/MM/YYYY` form when a four-digit year is printed; preserve a
legacy two-digit year exactly when that is what the source header shows. It is
not optional when printed, even if it is missing from older record templates or
does not affect search.

Before committing a batch, visually compare each new record's header fields
against its published source crop. A missing or empty `lastUpdated` field is a
validation failure unless the source crop itself genuinely has no Last Updated
value; in that exceptional case, record the physical PDF page in the batch's
uncertainty log rather than silently omitting the field. Do not infer a date
from adjacent pages, publication metadata, or OCR alone.

## Connection capture and backfill gate

Every visible inter-page reference is required structured data. Capture both
directions and continuations, including labels such as `To/from`, `To`, `From`,
`Continued on`, `Continued from`, and branch connections. Store each reference
in `connections` using its exact LOR and zero-padded sequence where legible;
for example, `To/from Rugby — MD101, sequence 026`.

### First-pass connection checklist

Treat connection capture as a source-image task, not an OCR extraction task.
For every retained table, inspect the complete diagram (including arrowheads,
footnotes and the margins of the running-lines column) before writing its
record. Transcribe every actual map-entry reference at that point; do not leave
an empty `connections` array to be filled in later.

- Preserve the exact code and every sequence digit from the source. Do not
  silently normalise a questionable reference from OCR: common failures include
  `I` for `M`/`E`, `O` for `0`, dropped leading zeroes, and merged four-digit
  LORs such as `SC1150` or `GW9001`.
- Record links to another live region and to an as-yet-unindexed region just as
  faithfully as same-region links. An unavailable destination may remain plain
  text, but its LOR and sequence must still be searchable structured data.
- Capture repeated arrows only once per target, but retain distinct targets
  even when they share a junction or location name.
- Do not turn operational references into page connections. Parenthesised
  lockout/protection identifiers, equipment labels, general-instruction
  citations, Table A legend citations, mileages and signalling codes are not
  connections unless the source explicitly presents them as a map-entry
  continuation or `To`/`From` destination.
- Where a reference is partly obscured, compare the counterpart diagram and
  the destination record before deciding; if still uncertain, record the
  physical PDF page for review rather than inventing a sequence.

Before committing, visually cross-check the final `connections` array against
the crop a second time. The audit may expose candidates, but it must never add
or rewrite a reference automatically: only source-confirmed references may be
written to data modules.

Before committing a batch, run a connection-reference audit over the source
crops/OCR. It must identify LOR-and-sequence patterns and flag any record whose
source contains a candidate reference missing from `connections`. OCR is a
triage aid only: visually confirm every flagged reference against the source
crop before adding it. A deliberately empty `connections` array is permitted
only after this audit reports no visible inter-page reference.

When repairing an earlier region, inventory all records with empty
`connections` arrays first, then backfill them in bounded physical-page
batches. Treat the repair as incomplete until every record is either updated
with all verified references or explicitly recorded as having no visible
inter-page connection.

## Route-clearance workflow (all regions)

Sectional Appendix source PDFs can contain Route Clearance tables D1-D5. These
are supplementary route data, not replacements for the indexed map-table
records. Keep each region's generated dataset in
`src/route-clearance/<region>.js`; the Scotland builder is the shared parsing
base and can be run with:

```bash
python3 scripts/build_scotland_route_clearance.py \
  "/path/to/Scotland Sectional Appendix September 2026.pdf"
```

Identify tables from the PDF's own contents and headers rather than assuming
their D5 letter is universal. In Scotland, D5A is Loading Gauge and D5B is
Locomotive Gauge; in Western & Wales, Loading Gauge is D5B and Locomotive
Gauge is D5C. Record the confirmed physical page ranges in the region-specific
builder before parsing.

Use the source table meanings exactly as printed. D1-D4 list cleared rolling
stock and TOPS classes; D4's `RA` is Route Availability and must never be
represented as a TOPS class. The Loading Gauge table must publish every
W6-W12 result, including `N` as invalid, and retain `R`/`S` notes and the
`Y *` W6A lower-gauge qualification. The locomotive-gauge source can confirm
RA, but do not display a standalone Locomotive Gauge section when the relevant
RA value is already shown in the page facts.

D5 Loading Gauge tables can have a two-line header (`Gauge` followed by its published gauge names,
such as W6/W6A through W12); skip the second header row as data and preserve
those names exactly. Before accepting
a regeneration, verify every operational Loading Gauge row has all eight columns. Rows
explicitly marked `Line Out of Use` are not clearance results and must not be
given inferred valid/invalid states.

Clearance applies to route spans, not just endpoint diagrams. For every source
row, resolve its first and last named boundaries against the ordered SEQ
records in the same LOR, then attach the information inclusively to all SEQ
pages between those two matches. Match against a record's `location`,
structured `locations`, and `connections`; normalise `Junction`/`Jn`, strip
parenthetical route qualifiers such as `(via Beattock)`, and retain
parenthetical place names such as `(Lesmahagow Jn)` as alternatives.

Boundary matching must cope with source/map naming variants without silently
over-applying clearance:

- retain the full source boundary plus a narrow place-name anchor with compass
  words (`East`, `West`, `North`, `South`) and site suffixes such as `Sidings`
  or `Portal` removed;
- allow a known, purely geographic prefix to be optional when the map omits it
  (for example, source `London Euston` versus map `Euston`), but verify the
  resulting endpoint visually so this does not turn into a broad fuzzy match;
- select the first matching page for the route's first boundary and the last
  matching page for its final boundary, because a junction or place can be
  depicted across adjacent SEQ pages;
- inspect any newly broadened span against the source table and at least its
  first, an intermediate, and final SEQ map; and
- if either boundary still cannot be resolved, do not infer an intervening
  range. Show it only on a positively matched endpoint and record the
  unresolved source row for review.

This prevents the failures where `Old Oak Common West` was labelled as `Old
Oak Common East Junction` on a map, and where `Royal Oak Sidings` appeared as
`Royal Oak Portal`: both cases had complete parsed data but were omitted from
the affected SEQ page by an overly literal matcher.

### Parser and regeneration validation

Do not accept a table merely because the first source page parsed. Inspect
continuation pages and compare their column layout with the first page. In the
Western & Wales D2A EMU table, the first page has a compact 16-cell layout
with classes beginning at `325`, while continuation rows can carry a longer
mileage grid before the same class cells. For tables of this kind, identify
the class header once, then right-align each data row's class values relative
to its Notes column. Do not hard-code one absolute cell offset for every page.

After generation, audit every configured source table range before changing
the UI or committing:

1. count source operational rows and generated rows by table and category;
2. flag every generated row with an empty `clearances` array, every missing
   expected category, and every row with a partial class/gauge column set;
3. visually compare a sample from the first, middle, and last physical source
   page, plus every flagged row, to the rendered PDF; and
4. specifically check the page that motivated the work in the local site.

For example, an initial D2A extraction produced only four populated EMU rows
out of 251 because continuation rows had been treated as the first-page layout.
An empty category in the UI is a failed parse or failed span match until that
audit proves it is intentionally empty.

Derive every valid LOR prefix from the regional source before filtering rows.
For example, Kent/Sussex/Wessex clearance tables contain both `SO` and `SW`
records; accepting only one prefix silently drops an entire source section.
Likewise, find TOPS/coaching class columns from the source header rather than
a fixed cell index: a compact first table may begin its classes immediately
after four mileage cells, while continuation rows use a wider grid. For D4
and Locomotive Gauge data, locate the `RA` header first and treat the following
cells as the class/gauge columns. Preserve an unexpected but legible published
Locomotive Gauge value verbatim for audit instead of discarding the source row;
the standalone category remains hidden in the UI.

Some PDFs split a single Loading Gauge table horizontally into several detected
tables (as in LNE D5A). Do not accept `extract_tables()[0]` in that case. Build
the rows from PDF word coordinates: derive the current page's gauge-column
positions from the visible header, pair each LOR row with the nearest gauge
cells and Notes column, and use midpoints between successive LOR rows so
wrapped descriptions remain with their own row. Coordinates can move between
physical pages, so calculate column boundaries relative to the visible Gauge
header on every page. Render and inspect the first, middle and final source
page before publication.

### Clearance presentation and UI verification

Display clearance only for the source route spans applicable to that SEQ map,
not all data in the LOR. Group data by route span, then by source category;
keep TOPS classes together regardless of traction type. Display both permitted
and not-cleared values, and show `R*`/`S*` Notes-column restrictions alongside
the class or gauge. Suppress the redundant phrase `Restricted; see notes` when
the referenced note is displayed immediately below.

Show Route Availability as a top-level page fact alongside Route and Last
Updated, preserving multiple applicable RA values. Do not represent RA as a
TOPS class. The clearance details header must simply read `Route clearance`,
with a show/hide state only: never expose a region name or numeric count of
tables, routes, or segments there.

Before handing off a clearance change, open a direct SEQ URL in the local site,
expand the clearance details, and verify class values, Loading Gauge values,
restriction text, RA, and the absence of inappropriate empty categories. Test
an endpoint and an intermediate SEQ for every modified source span.

For the matching LOR/SEQ page, derive the top-level Route Availability from
the applicable D4/D5B rows. If more than one source RA applies, retain each
value rather than silently choosing one. Test a known intermediate page as
well as both endpoints: for example, the SC001 Gretna Jn--Law Jn span must
apply from SEQ001 through SEQ015, including an intermediate page such as
SEQ008.

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

### Mandatory pre-final guard

Immediately before sending anything on the `final` channel, check the active
PDF's highest committed/accounted-for physical page against its final physical
page. If any physical page remains, sending `final` is forbidden. Do not use a
final response to recover from a timeout, token-pressure warning, completed
tool call, reviewer wait, commentary update, or batch commit: start, prepare,
review, validate, or commit the next bounded range instead. This guard is
mandatory even when the assistant has already reported progress several times.
Only the completed final range, a genuine documented blocker, or an explicit
user stop instruction can pass this guard.

### No-reviewer-wait termination rule

Receiving the last reviewer result for a batch is explicitly *not* a terminal
event. It creates an immediate obligation to write the batch plan and run its
record/crop creation command. Likewise, completing a record plan, audit, or
commit creates an immediate obligation to prepare or review the next range.
Before ending any assistant response, the parent must name the next concrete
tool action it has already performed in the same turn. If it has not performed
one, it must perform one in commentary instead of ending the response. This
rule applies even when the turn is short on tokens: concise tool inputs and
continuation take priority over a final message.

## Git hygiene

- Do not commit `tmp/`, Python `__pycache__/`, `node_modules/` or `dist/`.
- Stage only reviewed records, their matching crops, and intentional source or
  documentation changes.
- Run the production build before committing a substantive batch.
