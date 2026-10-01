const pageModules = import.meta.glob("./data/**/*.js");

const normaliseLocation = (value) => value
  .toLowerCase()
  .replace(/\bjunction\b/g, "jn")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function clearanceBoundaryNames(scope) {
  return scope
    .replace(/\broute boundary\b/gi, "")
    .replace(/\([A-Z]{1,4}\d{1,4}\)/g, "")
    .split("–")
    .flatMap((boundary) => [boundary, ...[...boundary.matchAll(/\(([^)]+)\)/g)].map((match) => match[1])])
    .map(normaliseLocation)
    .filter((name) => name.length >= 4);
}

function clearanceForPage(segments, page) {
  const depictedText = [page.location, ...(page.locations || []), ...(page.connections || [])]
    .filter(Boolean)
    .map(normaliseLocation)
    .join(" | ");
  return segments.filter((segment) => clearanceBoundaryNames(segment.scope)
    .some((boundary) => depictedText.includes(boundary)));
}

export async function loadPage({ region, lOR, sequence }) {
  const module = pageModules[`./data/${region}/${lOR}/${sequence}.js`];
  if (!module) return undefined;
  const page = (await module()).default;
  const allRouteClearance = region === "scotland"
    ? ((await import("./route-clearance/scotland")).default[lOR] || [])
    : [];
  const routeClearance = clearanceForPage(allRouteClearance, page);
  return {
    ...page,
    region,
    routeClearance,
    routeAvailability: [...new Set(routeClearance.map((segment) => segment.routeAvailability).filter(Boolean))],
  };
}
