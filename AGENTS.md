# Scotland Sectional Appendix website

This repository is a Vite + React local website that indexes selected pages of a
Scotland Route Sectional Appendix PDF. Preserve existing indexed pages when
adding new ones.

## Adding a PDF page

For a batch of pages, first run `scripts/prepare_index_batch.py` to generate a
manifest and local OCR/crop drafts. Work from `candidate_map` entries only;
review `visual_review_required` entries manually. Do not publish a generated
record without the visual inspection and quality checks below.

1. Work only on the requested physical PDF page. Render it at a legible
   resolution and visually inspect the result before transcribing it.
2. Create a concise, searchable text transcription of its route information:
   identifiers, locations, mileage, connections, signalling, speed
   restrictions, equipment, and relevant remarks. Do not infer information
   that is not shown on the page.
3. For the `Location`, `Mileage`, and `Running lines & speed restrictions`
   table area, create a direct crop from the rendered source-PDF page and save
   it in `src/assets/`. Do not redraw, approximate, or convert this diagram to
   SVG unless the user explicitly asks for a reconstruction.
4. Add a self-contained page object in `src/data/page-NNN.js`, including its
   PDF page number, image import, descriptive image alt text, structured
   searchable fields, and transcription. `src/pages.js` discovers these modules
   automatically. The crop must be displayed with the page record.
5. Keep search working across every indexed page and show all matching page
   records. Do not replace earlier page content when adding later pages.
6. Treat `SEQ` as a numeric sequential index within a shared `LOR`. Preserve
   the previous/next links generated from this ordering when adding an entry;
   only link to existing entries with the same `LOR`.

## Quality checks

- Build with `npm run build` after changes.
- Verify the local website has the new page, the source crop loads, and a
  distinctive term from the new page filters search results correctly.
- Keep the site runnable locally with `npm run dev`.
