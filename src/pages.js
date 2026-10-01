const pageModules = import.meta.glob("./data/**/*.js");

export async function loadPage({ region, lOR, sequence }) {
  const module = pageModules[`./data/${region}/${lOR}/${sequence}.js`];
  const routeClearance = region === "scotland"
    ? ((await import("./route-clearance/scotland")).default[lOR] || [])
    : [];
  return module ? {
    ...(await module()).default,
    region,
    routeClearance,
  } : undefined;
}
