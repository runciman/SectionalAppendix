import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { appendixPages } from "./pages";
import "./styles.css";

const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>;
const regionPath = (region) => `/${region}`;
const lorPath = (region, lOR) => `${regionPath(region)}/${lOR}`;
const pagePath = (page) => `${lorPath(page.region, page.lOR)}/${page.sequence}`;
const collectionKey = (region, lOR) => `${region}:${lOR}`;
const pageKey = (page) => `${collectionKey(page.region, page.lOR)}:${page.sequence}`;
const pageAnchor = (page) => `page-${page.region}-${page.lOR}-${page.sequence}`;
const connectionReference = /\b([A-Z]{2,4}\d{3,4})\s*,?\s*(?:sequence|seq\.?)\s*(\d{1,3})\b/gi;
const regionDefinitions = [
  ["scotland", "Scotland"], ["lnw-north", "London North Western (North)"],
  ["lne", "London North Eastern (NCS)"], ["lnw-south", "London North Western (South)"],
  ["anglia", "Anglia"], ["western-wales", "Western & Wales"], ["ksw", "Kent, Sussex & Wessex"],
].map(([id, name]) => ({ id, name }));
const regionNames = new Map(regionDefinitions.map(({ id, name }) => [id, name]));

function readRoute() {
  const [region, rawLOR, rawSequence, ...extra] = window.location.pathname.split("/").filter(Boolean);
  if (!region || extra.length) return {};
  return { region, lOR: rawLOR?.toUpperCase(), sequence: rawSequence?.padStart(3, "0") };
}

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0 });
}

function App() {
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState(readRoute);
  const queryTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hasSearch = queryTerms.length > 0;
  const liveRegions = useMemo(() => new Set(appendixPages.map((page) => page.region)), []);
  const results = useMemo(() => appendixPages.filter((page) => {
    const searchable = Object.values(page).flat().join(" ").toLowerCase();
    return queryTerms.every((term) => searchable.includes(term));
  }), [queryTerms.join("|")]);
  const sequenceGroups = useMemo(() => appendixPages.reduce((groups, page) => {
    const key = collectionKey(page.region, page.lOR);
    const pages = groups.get(key) || [];
    pages.push(page);
    pages.sort((left, right) => Number(left.sequence) - Number(right.sequence));
    groups.set(key, pages);
    return groups;
  }, new Map()), []);
  const connectionTargets = useMemo(() => new Map(appendixPages.map((page) => [pageKey(page), page])), []);

  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const routeIsLive = liveRegions.has(route.region);
  const routePages = route.lOR ? sequenceGroups.get(collectionKey(route.region, route.lOR)) : undefined;
  const selectedPage = routePages?.find((page) => page.sequence === route.sequence);
  const showLOR = routeIsLive && route.lOR && !route.sequence && routePages;
  const regionPages = routeIsLive ? appendixPages.filter((page) => page.region === route.region) : [];
  const lorIndex = [...new Set(regionPages.map((page) => page.lOR))].map((lOR) => {
    const pages = sequenceGroups.get(collectionKey(route.region, lOR));
    return { lOR, pages, name: pages[0].title };
  }).sort((left, right) => left.lOR.localeCompare(right.lOR));

  return <main>
    <section className="hero"><div className="container">
      <p className="eyebrow">Great Britain Railway Network</p>
      <h1><a className="home-link" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>Sectional Appendix</a></h1>
      <p className="intro">Searchable operational reference for indexed Sectional Appendix pages.</p>
      <label className="search" htmlFor="appendix-search"><SearchIcon /><input id="appendix-search" type="search" aria-label="Search the sectional appendix" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search locations, routes, signalling, speeds…" autoComplete="off" />{query && <button type="button" onClick={() => setQuery("")}>Clear</button>}</label>
    </div></section>

    {!routeIsLive && !hasSearch && <RegionIndex liveRegions={liveRegions} />}
    {routeIsLive && !route.lOR && !hasSearch && <section className="content container">
      <div className="region-heading"><p className="eyebrow">{regionNames.get(route.region) || route.region}</p><h2>Indexed LORs</h2><p>Browse the available line-of-route collections and their sequence entries.</p></div>
      <div className="lor-index">{lorIndex.map(({ lOR, pages, name }) => <a key={lOR} href={lorPath(route.region, lOR)} onClick={(event) => { event.preventDefault(); navigate(lorPath(route.region, lOR)); }}><span className="lor-code">{lOR}</span><strong>{name}</strong><small>{pages.length} indexed {pages.length === 1 ? "entry" : "entries"} <span aria-hidden="true">→</span></small></a>)}</div>
    </section>}
    {selectedPage && !hasSearch && <section className="content container"><PageDetail page={selectedPage} previous={routePages[routePages.indexOf(selectedPage) - 1]} next={routePages[routePages.indexOf(selectedPage) + 1]} connectionTargets={connectionTargets} /></section>}
    {showLOR && !hasSearch && <section className="content container">
      <div className="result-summary"><p>{route.lOR} sequence entries</p><span>{routePages.length} indexed {routePages.length === 1 ? "page" : "pages"}</span></div>
      <div className="page-results">{routePages.map((page, index) => <PageDetail key={pageKey(page)} page={page} previous={routePages[index - 1]} next={routePages[index + 1]} connectionTargets={connectionTargets} inCollection />)}</div>
    </section>}
    {hasSearch && <section className="content container" aria-live="polite">
      <div className="result-summary"><p>{results.length} {results.length === 1 ? "page" : "pages"} found</p><span>{appendixPages.length} indexed PDF pages</span></div>
      {results.length ? <div className="page-results">{results.map((page) => {
        const sequence = sequenceGroups.get(collectionKey(page.region, page.lOR));
        const index = sequence.indexOf(page);
        return <PageDetail key={pageKey(page)} page={page} previous={sequence[index - 1]} next={sequence[index + 1]} connectionTargets={connectionTargets} />;
      })}</div> : <EmptyState query={query} />}
    </section>}
    <footer className="site-footer"><div className="container">All data provided by <a href="https://www.networkrail.co.uk/industry-and-commercial/information-for-operators/national-electronic-sectional-appendix/" target="_blank" rel="noreferrer">Network Rail's Sectional Appendix</a>.</div></footer>
  </main>;
}

function RegionIndex({ liveRegions }) {
  return <section className="region-index container" aria-label="Sectional Appendix regions"><div className="region-cards">{regionDefinitions.map((region) => liveRegions.has(region.id) ? <a key={region.id} className="region-card region-card-live" href={regionPath(region.id)} onClick={(event) => { event.preventDefault(); navigate(regionPath(region.id)); }}><span>Available now</span><strong>{region.name}</strong><small>Browse indexed LORs <b aria-hidden="true">→</b></small></a> : <article key={region.id} className="region-card"><span>Coming soon</span><strong>{region.name}</strong><small>Index planned for a future PDF release</small></article>)}</div></section>;
}

function PageDetail({ page, previous, next, connectionTargets, inCollection = false }) {
  const sequenceHref = (target) => inCollection ? `#${pageAnchor(target)}` : pagePath(target);
  const followSequence = (event, target) => {
    if (!inCollection) return;
    event.preventDefault();
    document.getElementById(pageAnchor(target))?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState({}, "", `${lorPath(page.region, page.lOR)}#${pageAnchor(target)}`);
  };
  return <article className="page-detail" id={pageAnchor(page)}>
    <header className="page-header"><div><p className="page-label">PDF page {page.pdfPage} · Module {page.module}</p><h2><a className="page-title-link" href={pagePath(page)} onClick={(event) => { event.preventDefault(); navigate(pagePath(page)); }}>{page.title}</a></h2><p className="page-subtitle">{page.location} · {page.mileage}</p></div><a className="route-badge" href={lorPath(page.region, page.lOR)} onClick={(event) => { event.preventDefault(); navigate(lorPath(page.region, page.lOR)); }}><span>LOR</span><strong>{page.lOR}</strong></a></header>
    <dl className="facts"><div><dt>Sequence</dt><dd>{page.sequence}</dd></div><div><dt>ELR</dt><dd>{page.elr}</dd></div><div><dt>Route</dt><dd>{page.route}</dd></div><div><dt>Last updated</dt><dd>{page.lastUpdated}</dd></div></dl>
    <nav className="sequence-nav" aria-label={`${page.lOR} sequence navigation`}>
      {previous ? <a href={sequenceHref(previous)} onClick={(event) => { followSequence(event, previous); if (!inCollection) { event.preventDefault(); navigate(pagePath(previous)); } }}><span>Previous</span><strong>SEQ {previous.sequence} · PDF page {previous.pdfPage}</strong></a> : <span className="sequence-end">Start of {page.lOR}</span>}
      <p><span>{page.lOR}</span> SEQ {page.sequence}</p>
      {next ? <a href={sequenceHref(next)} onClick={(event) => { followSequence(event, next); if (!inCollection) { event.preventDefault(); navigate(pagePath(next)); } }} className="next-link"><span>Next</span><strong>SEQ {next.sequence} · PDF page {next.pdfPage}</strong></a> : <span className="sequence-end sequence-end-right">End of {page.lOR}</span>}
    </nav>
    <section className="schematic-section" aria-label={`PDF page ${page.pdfPage} image extract`}><div className="schematic-heading"><div><p className="section-label">Page {page.pdfPage} extract</p><h3>Location, mileage & running lines</h3></div><p>Direct image crop from the source PDF.</p></div><figure className="pdf-extract"><img src={page.imageSrc} alt={page.imageAlt} /><figcaption>Source: Network Rail Sectional Appendix, PDF page {page.pdfPage}.</figcaption></figure></section>
    <div className="detail-grid">{page.locations && <DetailList title="Locations & mileages" items={page.locations} />}<DetailList title="Connections" items={page.connections} connectionTargets={connectionTargets} region={page.region} /><DetailList title="Signalling & communications" items={page.signalling} /><DetailList title="Running lines & speed restrictions" items={page.speeds} /><section className="detail-card equipment"><h3>Equipment</h3><p>{page.equipment}</p></section></div>
    <section className="transcription"><div><p className="section-label">Textual representation</p><h3>Page transcription</h3></div><p>{page.transcription}</p></section>
  </article>;
}

function DetailList({ title, items = [], connectionTargets, region }) {
  return <section className="detail-card"><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{title === "Connections" ? <ConnectionText text={item} targets={connectionTargets} region={region} /> : item}</li>)}</ul></section>;
}

function ConnectionText({ text, targets, region }) {
  const fragments = [];
  let end = 0;
  connectionReference.lastIndex = 0;
  for (const match of text.matchAll(connectionReference)) {
    const [reference, lOR, rawSequence] = match;
    const target = targets.get(`${collectionKey(region, lOR)}:${rawSequence.padStart(3, "0")}`);
    fragments.push(text.slice(end, match.index));
    fragments.push(target ? <a key={`${match.index}-${reference}`} className="connection-link" href={pagePath(target)} onClick={(event) => { event.preventDefault(); navigate(pagePath(target)); }}>{reference}</a> : reference);
    end = match.index + reference.length;
  }
  fragments.push(text.slice(end));
  return fragments;
}

function EmptyState({ query }) {
  return <div className="empty-state"><p className="page-label">No match</p><h2>No indexed page contains “{query}”.</h2><p>Try a location, route code, signalling term, or speed.</p></div>;
}

createRoot(document.getElementById("root")).render(<App />);
