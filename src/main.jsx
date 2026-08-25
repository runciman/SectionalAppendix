import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { appendixPages } from "./pages";
import "./styles.css";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
);

const pagePath = (page) => `/scotland/${page.lOR}/${page.sequence}`;
const lorPath = (lOR) => `/scotland/${lOR}`;
const scotlandPath = "/scotland";
const connectionReference = /\b(SC\d{3})\s*,?\s*(?:sequence|seq\.?)\s*(\d{1,3})\b/gi;
const regions = [
  { id: "scotland", name: "Scotland", status: "Available now", path: scotlandPath, mapClass: "map-scotland" },
  { id: "lnw-north", name: "London North Western (North)", status: "Coming soon", mapClass: "map-lnw-north" },
  { id: "lne", name: "London North Eastern (NCS)", status: "Coming soon", mapClass: "map-lne" },
  { id: "lnw-south", name: "London North Western (South)", status: "Coming soon", mapClass: "map-lnw-south" },
  { id: "anglia", name: "Anglia", status: "Coming soon", mapClass: "map-anglia" },
  { id: "western-wales", name: "Western & Wales", status: "Coming soon", mapClass: "map-western-wales" },
  { id: "ksw", name: "Kent, Sussex & Wessex", status: "Coming soon", mapClass: "map-ksw" },
];

function readRoute() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== "scotland") return {};
  return { scotland: true, lOR: parts[1]?.toUpperCase(), sequence: parts[2] };
}

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState(readRoute);
  const queryTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hasSearch = queryTerms.length > 0;
  const results = useMemo(() => appendixPages.filter((page) => {
    const searchable = Object.values(page).flat().join(" ").toLowerCase();
    return queryTerms.every((term) => searchable.includes(term));
  }), [queryTerms.join("|")]);
  const sequenceGroups = useMemo(() => appendixPages.reduce((groups, page) => {
    const pages = groups.get(page.lOR) || [];
    pages.push(page);
    pages.sort((left, right) => Number(left.sequence) - Number(right.sequence));
    groups.set(page.lOR, pages);
    return groups;
  }, new Map()), []);
  const connectionTargets = useMemo(() => new Map(
    appendixPages.map((page) => [`${page.lOR}:${page.sequence}`, page])
  ), []);
  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const routePages = route.lOR ? sequenceGroups.get(route.lOR) : undefined;
  const selectedPage = routePages?.find((page) => page.sequence === route.sequence);
  const showLOR = route.lOR && !route.sequence && routePages;
  const lorIndex = useMemo(() => [...sequenceGroups.entries()]
    .map(([lOR, pages]) => ({ lOR, pages, name: pages[0].title }))
    .sort((left, right) => left.lOR.localeCompare(right.lOR)), [sequenceGroups]);
  return (
    <main>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Great Britain Railway Network</p>
          <h1><a className="home-link" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>Sectional Appendix</a></h1>
          <p className="intro">Searchable operational reference for indexed Sectional Appendix pages.</p>
          <label className="search" htmlFor="appendix-search">
            <SearchIcon />
            <input
              id="appendix-search"
              type="search"
              aria-label="Search the sectional appendix"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search locations, routes, signalling, speeds…"
              autoComplete="off"
            />
            {query && <button type="button" onClick={() => setQuery("")}>Clear</button>}
          </label>
          <a className="region-link" href={scotlandPath} onClick={(event) => { event.preventDefault(); navigate(scotlandPath); }}>Browse Scotland’s indexed LORs <span aria-hidden="true">→</span></a>
        </div>
      </section>

      {!route.scotland && !hasSearch && <RegionIndex />}

      {route.scotland && !route.lOR && !hasSearch && <section className="content container">
        <div className="region-heading">
          <p className="eyebrow">Scotland</p>
          <h2>Indexed LORs</h2>
          <p>Browse the available line-of-route collections and their sequence entries.</p>
        </div>
        <div className="lor-index">{lorIndex.map(({ lOR, pages, name }) => <a
          key={lOR}
          href={lorPath(lOR)}
          onClick={(event) => { event.preventDefault(); navigate(lorPath(lOR)); }}
        >
          <span className="lor-code">{lOR}</span>
          <strong>{name}</strong>
          <small>{pages.length} indexed {pages.length === 1 ? "entry" : "entries"} <span aria-hidden="true">→</span></small>
        </a>)}</div>
      </section>}

      {selectedPage && !hasSearch && <section className="content container">
        <PageDetail
          page={selectedPage}
          previous={routePages[routePages.findIndex((page) => page.pdfPage === selectedPage.pdfPage) - 1]}
          next={routePages[routePages.findIndex((page) => page.pdfPage === selectedPage.pdfPage) + 1]}
          connectionTargets={connectionTargets}
        />
      </section>}

      {showLOR && !hasSearch && <section className="content container">
        <div className="result-summary">
          <p>{route.lOR} sequence entries</p>
          <span>{routePages.length} indexed {routePages.length === 1 ? "page" : "pages"}</span>
        </div>
        <div className="page-results">{routePages.map((page, index) => <PageDetail
          key={page.pdfPage}
          page={page}
          previous={routePages[index - 1]}
          next={routePages[index + 1]}
          connectionTargets={connectionTargets}
          inCollection
        />)}</div>
      </section>}

      {hasSearch && <section className="content container" aria-live="polite">
        <div className="result-summary">
          <p>{results.length} {results.length === 1 ? "page" : "pages"} found</p>
          <span>{appendixPages.length} indexed PDF pages</span>
        </div>

        {results.length ? <div className="page-results">{results.map((page) => {
          const sequence = sequenceGroups.get(page.lOR);
          const index = sequence.findIndex((item) => item.pdfPage === page.pdfPage);
          return <PageDetail
            key={page.pdfPage}
            page={page}
            previous={sequence[index - 1]}
            next={sequence[index + 1]}
            connectionTargets={connectionTargets}
          />;
        })}</div> : <EmptyState query={query} />}
      </section>}

      <footer className="site-footer">
        <div className="container">All data provided by <a href="https://www.networkrail.co.uk/industry-and-commercial/information-for-operators/national-electronic-sectional-appendix/" target="_blank" rel="noreferrer">Network Rail's Sectional Appendix</a>.</div>
      </footer>
    </main>
  );
}

function RegionIndex() {
  return <section className="region-index container" aria-label="Sectional Appendix regions">
    <div className="region-index-layout">
      <svg className="region-map" viewBox="0 0 500 720" role="img" aria-labelledby="region-map-title region-map-description">
        <title id="region-map-title">Great Britain Sectional Appendix regions</title>
        <desc id="region-map-description">A schematic map showing the seven planned Sectional Appendix regions. Scotland is available now; the other regions are coming soon.</desc>
        {/* Simplified from Natural Earth 1:50m public-domain Great Britain coastline data. */}
        <path className="map-outline" d="M214 566 L187 582 L176 580 L162 568 L147 570 L153 563 L140 558 L131 558 L118 566 L108 560 L103 548 L110 540 L140 526 L153 512 L158 501 L153 497 L152 475 L127 483 L145 459 L165 447 L181 444 L196 450 L193 441 L197 438 L203 447 L211 447 L201 441 L197 432 L203 416 L198 408 L206 384 L193 387 L174 355 L188 329 L198 326 L176 326 L159 339 L146 334 L135 340 L122 334 L118 346 L106 329 L128 285 L118 269 L119 256 L122 251 L132 251 L121 242 L122 234 L104 255 L104 241 L114 228 L96 247 L98 260 L90 293 L86 298 L81 295 L84 275 L92 262 L87 261 L91 227 L106 187 L86 205 L77 203 L72 193 L65 191 L82 180 L77 175 L82 172 L90 150 L79 134 L89 125 L83 121 L84 106 L88 98 L107 98 L96 83 L98 71 L113 67 L111 46 L117 40 L126 47 L134 42 L138 46 L198 36 L191 62 L157 92 L155 100 L163 103 L151 122 L183 112 L240 112 L249 120 L252 131 L217 203 L187 218 L205 216 L215 222 L214 227 L201 231 L188 243 L166 239 L174 245 L198 250 L207 244 L217 244 L237 254 L258 279 L276 345 L300 359 L325 388 L320 395 L334 425 L317 416 L301 417 L316 419 L341 445 L344 457 L331 476 L341 483 L353 471 L384 474 L403 492 L398 531 L386 543 L382 542 L384 550 L380 553 L361 558 L368 561 L367 569 L347 577 L352 575 L367 584 L390 584 L388 598 L374 606 L370 614 L362 613 L338 625 L320 621 L295 625 L268 616 L272 621 L264 626 L242 627 L245 634 L241 636 L224 636 L200 628 L182 634 L171 660 L148 650 L122 659 L109 674 L95 669 L87 673 L89 663 L99 660 L118 640 L132 624 L134 610 L144 607 L150 595 L194 595 L224 558 L214 566Z" />
        <clipPath id="great-britain-shape"><path d="M214 566 L187 582 L176 580 L162 568 L147 570 L153 563 L140 558 L131 558 L118 566 L108 560 L103 548 L110 540 L140 526 L153 512 L158 501 L153 497 L152 475 L127 483 L145 459 L165 447 L181 444 L196 450 L193 441 L197 438 L203 447 L211 447 L201 441 L197 432 L203 416 L198 408 L206 384 L193 387 L174 355 L188 329 L198 326 L176 326 L159 339 L146 334 L135 340 L122 334 L118 346 L106 329 L128 285 L118 269 L119 256 L122 251 L132 251 L121 242 L122 234 L104 255 L104 241 L114 228 L96 247 L98 260 L90 293 L86 298 L81 295 L84 275 L92 262 L87 261 L91 227 L106 187 L86 205 L77 203 L72 193 L65 191 L82 180 L77 175 L82 172 L90 150 L79 134 L89 125 L83 121 L84 106 L88 98 L107 98 L96 83 L98 71 L113 67 L111 46 L117 40 L126 47 L134 42 L138 46 L198 36 L191 62 L157 92 L155 100 L163 103 L151 122 L183 112 L240 112 L249 120 L252 131 L217 203 L187 218 L205 216 L215 222 L214 227 L201 231 L188 243 L166 239 L174 245 L198 250 L207 244 L217 244 L237 254 L258 279 L276 345 L300 359 L325 388 L320 395 L334 425 L317 416 L301 417 L316 419 L341 445 L344 457 L331 476 L341 483 L353 471 L384 474 L403 492 L398 531 L386 543 L382 542 L384 550 L380 553 L361 558 L368 561 L367 569 L347 577 L352 575 L367 584 L390 584 L388 598 L374 606 L370 614 L362 613 L338 625 L320 621 L295 625 L268 616 L272 621 L264 626 L242 627 L245 634 L241 636 L224 636 L200 628 L182 634 L171 660 L148 650 L122 659 L109 674 L95 669 L87 673 L89 663 L99 660 L118 640 L132 624 L134 610 L144 607 L150 595 L194 595 L224 558 L214 566Z" /></clipPath>
        <g clipPath="url(#great-britain-shape)">
        <a href={scotlandPath} onClick={(event) => { event.preventDefault(); navigate(scotlandPath); }} aria-label="Scotland: available now">
          <path className="region-shape available map-scotland" d="M50 20 H280 V254 L225 275 175 245 120 260 50 220Z" />
          <text x="176" y="158">Scotland</text>
        </a>
        <a href="#region-lnw-north"><path className="region-shape map-lnw-north" d="M40 240 175 245 225 275 236 365 135 390 45 340Z" /><text x="190" y="311">LNW North</text></a>
        <a href="#region-lne"><path className="region-shape map-lne" d="M225 240 420 240 V420 L270 425 236 365Z" /><text x="303" y="328">LNE</text></a>
        <a href="#region-lnw-south"><path className="region-shape map-lnw-south" d="M45 340 135 390 236 365 270 425 208 462 112 438Z" /><text x="166" y="406">LNW South</text></a>
        <a href="#region-anglia"><path className="region-shape map-anglia" d="M270 425 420 400 V555 L300 515 208 462Z" /><text x="305" y="470">Anglia</text></a>
        <a href="#region-western-wales"><path className="region-shape map-western-wales" d="M35 400 112 438 208 462 300 515 230 575 110 550Z" /><text x="230" y="498">Western</text><text x="230" y="516">&amp; Wales</text></a>
        <a href="#region-ksw"><path className="region-shape map-ksw" d="M208 462 300 515 420 530 V700 H160 V570Z" /><text x="302" y="567">Kent, Sussex</text><text x="302" y="585">&amp; Wessex</text></a>
        </g>
        <path className="map-border" d="M214 566 L187 582 L176 580 L162 568 L147 570 L153 563 L140 558 L131 558 L118 566 L108 560 L103 548 L110 540 L140 526 L153 512 L158 501 L153 497 L152 475 L127 483 L145 459 L165 447 L181 444 L196 450 L193 441 L197 438 L203 447 L211 447 L201 441 L197 432 L203 416 L198 408 L206 384 L193 387 L174 355 L188 329 L198 326 L176 326 L159 339 L146 334 L135 340 L122 334 L118 346 L106 329 L128 285 L118 269 L119 256 L122 251 L132 251 L121 242 L122 234 L104 255 L104 241 L114 228 L96 247 L98 260 L90 293 L86 298 L81 295 L84 275 L92 262 L87 261 L91 227 L106 187 L86 205 L77 203 L72 193 L65 191 L82 180 L77 175 L82 172 L90 150 L79 134 L89 125 L83 121 L84 106 L88 98 L107 98 L96 83 L98 71 L113 67 L111 46 L117 40 L126 47 L134 42 L138 46 L198 36 L191 62 L157 92 L155 100 L163 103 L151 122 L183 112 L240 112 L249 120 L252 131 L217 203 L187 218 L205 216 L215 222 L214 227 L201 231 L188 243 L166 239 L174 245 L198 250 L207 244 L217 244 L237 254 L258 279 L276 345 L300 359 L325 388 L320 395 L334 425 L317 416 L301 417 L316 419 L341 445 L344 457 L331 476 L341 483 L353 471 L384 474 L403 492 L398 531 L386 543 L382 542 L384 550 L380 553 L361 558 L368 561 L367 569 L347 577 L352 575 L367 584 L390 584 L388 598 L374 606 L370 614 L362 613 L338 625 L320 621 L295 625 L268 616 L272 621 L264 626 L242 627 L245 634 L241 636 L224 636 L200 628 L182 634 L171 660 L148 650 L122 659 L109 674 L95 669 L87 673 L89 663 L99 660 L118 640 L132 624 L134 610 L144 607 L150 595 L194 595 L224 558 L214 566Z" />
      </svg>
      <div className="region-cards">{regions.map((region) => region.path ? <a key={region.id} className="region-card region-card-live" href={region.path} onClick={(event) => { event.preventDefault(); navigate(region.path); }}>
        <span>{region.status}</span><strong>{region.name}</strong><small>Browse indexed LORs <b aria-hidden="true">→</b></small>
      </a> : <article key={region.id} id={`region-${region.id}`} className="region-card">
        <span>{region.status}</span><strong>{region.name}</strong><small>Index planned for a future PDF release</small>
      </article>)}</div>
    </div>
  </section>;
}

function PageDetail({ page, previous, next, connectionTargets, inCollection = false }) {
  const sequenceHref = (target) => inCollection ? `#page-${target.pdfPage}` : pagePath(target);
  const followSequence = (event, target) => {
    if (!inCollection) return;
    event.preventDefault();
    document.getElementById(`page-${target.pdfPage}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState({}, "", `${lorPath(page.lOR)}#page-${target.pdfPage}`);
  };
  return <article className="page-detail" id={`page-${page.pdfPage}`}>
    <header className="page-header">
      <div>
        <p className="page-label">PDF page {page.pdfPage} · Module {page.module}</p>
        <h2><a className="page-title-link" href={pagePath(page)} onClick={(event) => { event.preventDefault(); navigate(pagePath(page)); }}>{page.title}</a></h2>
        <p className="page-subtitle">{page.location} · {page.mileage}</p>
      </div>
      <a className="route-badge" href={lorPath(page.lOR)} onClick={(event) => { event.preventDefault(); navigate(lorPath(page.lOR)); }}><span>LOR</span><strong>{page.lOR}</strong></a>
    </header>

    <dl className="facts">
      <div><dt>Sequence</dt><dd>{page.sequence}</dd></div>
      <div><dt>ELR</dt><dd>{page.elr}</dd></div>
      <div><dt>Route</dt><dd>{page.route}</dd></div>
      <div><dt>Last updated</dt><dd>{page.lastUpdated}</dd></div>
    </dl>

    <nav className="sequence-nav" aria-label={`${page.lOR} sequence navigation`}>
      {previous ? <a href={sequenceHref(previous)} onClick={(event) => { followSequence(event, previous); if (!inCollection) { event.preventDefault(); navigate(pagePath(previous)); } }}><span>Previous</span><strong>SEQ {previous.sequence} · PDF page {previous.pdfPage}</strong></a> : <span className="sequence-end">Start of {page.lOR}</span>}
      <p><span>{page.lOR}</span> SEQ {page.sequence}</p>
      {next ? <a href={sequenceHref(next)} onClick={(event) => { followSequence(event, next); if (!inCollection) { event.preventDefault(); navigate(pagePath(next)); } }} className="next-link"><span>Next</span><strong>SEQ {next.sequence} · PDF page {next.pdfPage}</strong></a> : <span className="sequence-end sequence-end-right">End of {page.lOR}</span>}
    </nav>

    <section className="schematic-section" aria-label={`PDF page ${page.pdfPage} image extract`}>
      <div className="schematic-heading">
        <div><p className="section-label">Page {page.pdfPage} extract</p><h3>Location, mileage & running lines</h3></div>
        <p>Direct image crop from the source PDF.</p>
      </div>
      <figure className="pdf-extract">
        <img src={page.imageSrc} alt={page.imageAlt} />
        <figcaption>Source: Network Rail Sectional Appendix, PDF page {page.pdfPage}.</figcaption>
      </figure>
    </section>

    <div className="detail-grid">
      {page.locations && <DetailList title="Locations & mileages" items={page.locations} />}
      <DetailList title="Connections" items={page.connections} connectionTargets={connectionTargets} />
      <DetailList title="Signalling & communications" items={page.signalling} />
      <DetailList title="Running lines & speed restrictions" items={page.speeds} />
      <section className="detail-card equipment"><h3>Equipment</h3><p>{page.equipment}</p></section>
    </div>

    <section className="transcription">
      <div><p className="section-label">Textual representation</p><h3>Page transcription</h3></div>
      <p>{page.transcription}</p>
    </section>
  </article>;
}

function DetailList({ title, items, connectionTargets }) {
  return <section className="detail-card"><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{title === "Connections" ? <ConnectionText text={item} targets={connectionTargets} /> : item}</li>)}</ul></section>;
}

function ConnectionText({ text, targets }) {
  const fragments = [];
  let end = 0;
  connectionReference.lastIndex = 0;
  for (const match of text.matchAll(connectionReference)) {
    const [reference, lOR, rawSequence] = match;
    const target = targets.get(`${lOR}:${rawSequence.padStart(3, "0")}`);
    fragments.push(text.slice(end, match.index));
    fragments.push(target ? <a
      key={`${match.index}-${reference}`}
      className="connection-link"
      href={pagePath(target)}
      onClick={(event) => { event.preventDefault(); navigate(pagePath(target)); }}
    >{reference}</a> : reference);
    end = match.index + reference.length;
  }
  fragments.push(text.slice(end));
  return fragments;
}

function EmptyState({ query }) {
  return <div className="empty-state"><p className="page-label">No match</p><h2>No indexed page contains “{query}”.</h2><p>Try a location, route code, signalling term, or speed.</p></div>;
}

createRoot(document.getElementById("root")).render(<App />);
