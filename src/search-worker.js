let index = [];
const pageSize = 50;
function searchTerms(query) {
  return query
    .trim()
    .toLowerCase()
    .replace(/(\d)(mph|mps|kmh)\b/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean);
}
self.onmessage = async ({ data }) => {
  if (data.type === "initialise") { index = await fetch(data.url).then((response) => response.json()); self.postMessage({ type: "ready" }); return; }
  if (data.type !== "search") return;
  const terms = searchTerms(data.query);
  if (!terms.length) { self.postMessage({ type: "results", requestId: data.requestId, ids: [] }); return; }
  const matches = index.filter((entry) => terms.every((term) => entry.searchText.includes(term)));
  const page = Math.max(0, Number(data.page) || 0);
  const ids = matches.slice(page * pageSize, (page + 1) * pageSize).map((entry) => entry.id);
  self.postMessage({ type: "results", requestId: data.requestId, ids, total: matches.length, page });
};
