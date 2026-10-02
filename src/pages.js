const pageModules = import.meta.glob("./data/**/*.js");
const lorPagesCache = new Map();

const normaliseLocation = (value) => value
  .toLowerCase()
  .replace(/\bjunction\b/g, "jn")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function clearanceBoundaryGroups(scope) {
  return scope
    .replace(/\broute boundary\b/gi, "")
    .replace(/\([A-Z]{1,4}\d{1,4}\)/g, "")
    .split("–")
    .map((boundary) => [
      boundary,
      boundary.replace(/\([^)]*\)/g, ""),
      // Table boundaries can name the opposite side of the same named place
      // as the map entry (for example Old Oak Common West / East Junction).
      // Keep the place-name anchor as a final, deliberately narrow fallback.
      boundary.replace(/\b(?:east|west|north|south)\b/gi, ""),
      // Tables may delimit by a platform range while the map uses only the
      // station name (for example Victoria platforms 1-8 / Victoria).
      boundary.replace(/\bplatforms?\s+\d+(?:\s*-\s*\d+)?\b/gi, ""),
      // Tables occasionally qualify a central-London station while its map
      // entry uses the station name alone (London Euston / Euston).
      boundary.replace(/\blondon\b/gi, ""),
      // Clearance tables may use a named siding while the map records the
      // associated portal or junction.  The place name remains specific.
      boundary.replace(/\b(?:sidings?|portal)\b/gi, ""),
      ...[...boundary.matchAll(/\(([^)]+)\)/g)].map((match) => match[1]),
    ]
      .map(normaliseLocation)
      .filter((name) => name.length >= 4));
}

function depictedText(page) {
  return [page.location, ...(page.locations || []), ...(page.connections || [])]
    .filter(Boolean)
    .map(normaliseLocation)
    .join(" | ");
}

function matchesBoundary(page, alternatives) {
  const text = depictedText(page);
  return alternatives.some((boundary) => text.includes(boundary));
}

function firstBoundaryPage(pages, alternatives) {
  return pages.findIndex((candidate) => matchesBoundary(candidate, alternatives));
}

function lastBoundaryPage(pages, alternatives) {
  for (let index = pages.length - 1; index >= 0; index -= 1) {
    if (matchesBoundary(pages[index], alternatives)) return index;
  }
  return -1;
}

async function lorPages(region, lOR) {
  const cacheKey = `${region}/${lOR}`;
  if (!lorPagesCache.has(cacheKey)) {
    const prefix = `./data/${region}/${lOR}/`;
    const records = Object.entries(pageModules)
      .filter(([path]) => path.startsWith(prefix))
      .map(async ([, load]) => (await load()).default);
    lorPagesCache.set(cacheKey, Promise.all(records).then((pages) => pages.sort((a, b) => Number(a.sequence) - Number(b.sequence))));
  }
  return lorPagesCache.get(cacheKey);
}

function clearanceForPage(segments, page, pages) {
  const sequenceIndex = pages.findIndex((candidate) => candidate.sequence === page.sequence);
  return segments.filter((segment) => {
    const boundaries = clearanceBoundaryGroups(segment.scope);
    if (boundaries.length < 2 || sequenceIndex < 0) return boundaries.flat().some((boundary) => depictedText(page).includes(boundary));
    const first = firstBoundaryPage(pages, boundaries[0]);
    // A named boundary can be present at the end of one diagram and the
    // beginning of the next; include the whole stated route extent.
    const last = lastBoundaryPage(pages, boundaries.at(-1));
    if (first < 0 || last < 0) return boundaries.flat().some((boundary) => depictedText(page).includes(boundary));
    return sequenceIndex >= Math.min(first, last) && sequenceIndex <= Math.max(first, last);
  });
}

export async function loadPage({ region, lOR, sequence }) {
  const module = pageModules[`./data/${region}/${lOR}/${sequence}.js`];
  if (!module) return undefined;
  const page = (await module()).default;
  const pages = await lorPages(region, lOR);
  const allRouteClearance = region === "scotland"
    ? ((await import("./route-clearance/scotland")).default[lOR] || [])
    : region === "western-wales"
      ? ((await import("./route-clearance/western-wales")).default[lOR] || [])
      : region === "ksw"
        ? ((await import("./route-clearance/ksw")).default[lOR] || [])
        : region === "lnw-north"
          ? ((await import("./route-clearance/lnw-north")).default[lOR] || [])
          : region === "lnw-south"
            ? ((await import("./route-clearance/lnw-south")).default[lOR] || [])
            : region === "lne"
              ? ((await import("./route-clearance/lne")).default[lOR] || [])
      : [];
  const routeClearance = clearanceForPage(allRouteClearance, page, pages);
  return {
    ...page,
    region,
    routeClearance,
    routeAvailability: [...new Set(routeClearance.map((segment) => segment.routeAvailability).filter(Boolean))],
  };
}
