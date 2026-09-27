const pageModules = import.meta.glob("./data/**/*.js");

export async function loadPage({ region, lOR, sequence }) {
  const module = pageModules[`./data/${region}/${lOR}/${sequence}.js`];
  return module ? { ...(await module()).default, region } : undefined;
}
