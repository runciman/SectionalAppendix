const pageModules = import.meta.glob("./data/**/*.js");

export async function loadPage({ region, lOR, sequence }) {
  const module = pageModules[`./data/${region}/${lOR}/${sequence}.js`];
  return module ? { ...(await module()).default, region } : undefined;
}

import * as Swetrix from 'swetrix'

Swetrix.init('A22q3Hfb1XCa', {
  apiURL: 'https://stats.sectionalappendix.com/backend/v1/log',
})
Swetrix.trackViews()