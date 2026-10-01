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
    .map((boundary) => [boundary, boundary.replace(/\([^)]*\)/g, ""), ...[...boundary.matchAll(/\(([^)]+)\)/g)].map((match) => match[1])]
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
    const first = pages.findIndex((candidate) => matchesBoundary(candidate, boundaries[0]));
    const last = pages.findIndex((candidate) => matchesBoundary(candidate, boundaries.at(-1)));
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
    : [];
  const routeClearance = clearanceForPage(allRouteClearance, page, pages);
  return {
    ...page,
    region,
    routeClearance,
    routeAvailability: [...new Set(routeClearance.map((segment) => segment.routeAvailability).filter(Boolean))],
  };
}
