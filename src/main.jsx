import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { appendixPages } from "./pages";
import "./styles.css";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
);

function App() {
  const [query, setQuery] = useState("");
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
  return (
    <main>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Scotland Route</p>
          <h1>Sectional Appendix</h1>
          <p className="intro">Searchable operational reference for PDF pages 169–171.</p>
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
        </div>
      </section>

      {hasSearch && <section className="content container" aria-live="polite">
        <div className="result-summary">
          <p>{results.length} {results.length === 1 ? "page" : "pages"} found</p>
          <span>Source PDF pages 169–171</span>
        </div>

        {results.length ? <div className="page-results">{results.map((page) => {
          const sequence = sequenceGroups.get(page.lOR);
          const index = sequence.findIndex((item) => item.pdfPage === page.pdfPage);
          return <PageDetail
            key={page.pdfPage}
            page={page}
            previous={sequence[index - 1]}
            next={sequence[index + 1]}
            onNavigate={() => setQuery("")}
          />;
        })}</div> : <EmptyState query={query} />}
      </section>}
    </main>
  );
}

function PageDetail({ page, previous, next, onNavigate }) {
  return <article className="page-detail" id={`page-${page.pdfPage}`}>
    <header className="page-header">
      <div>
        <p className="page-label">PDF page {page.pdfPage} · Module {page.module}</p>
        <h2>{page.title}</h2>
        <p className="page-subtitle">{page.location} · {page.mileage}</p>
      </div>
      <div className="route-badge"><span>LOR</span><strong>{page.lOR}</strong></div>
    </header>

    <dl className="facts">
      <div><dt>Sequence</dt><dd>{page.sequence}</dd></div>
      <div><dt>ELR</dt><dd>{page.elr}</dd></div>
      <div><dt>Route</dt><dd>{page.route}</dd></div>
      <div><dt>Last updated</dt><dd>{page.lastUpdated}</dd></div>
    </dl>

    <nav className="sequence-nav" aria-label={`${page.lOR} sequence navigation`}>
      {previous ? <a href={`#page-${previous.pdfPage}`} onClick={onNavigate}><span>Previous</span><strong>SEQ {previous.sequence} · PDF page {previous.pdfPage}</strong></a> : <span className="sequence-end">Start of {page.lOR}</span>}
      <p><span>{page.lOR}</span> SEQ {page.sequence}</p>
      {next ? <a href={`#page-${next.pdfPage}`} onClick={onNavigate} className="next-link"><span>Next</span><strong>SEQ {next.sequence} · PDF page {next.pdfPage}</strong></a> : <span className="sequence-end sequence-end-right">End of {page.lOR}</span>}
    </nav>

    <section className="schematic-section" aria-label={`PDF page ${page.pdfPage} image extract`}>
      <div className="schematic-heading">
        <div><p className="section-label">Page {page.pdfPage} extract</p><h3>Location, mileage & running lines</h3></div>
        <p>Direct image crop from the source PDF.</p>
      </div>
      <figure className="pdf-extract">
        <img src={page.imageSrc} alt={page.imageAlt} />
        <figcaption>Source: Scotland Sectional Appendix, PDF page {page.pdfPage}.</figcaption>
      </figure>
    </section>

    <div className="detail-grid">
      {page.locations && <DetailList title="Locations & mileages" items={page.locations} />}
      <DetailList title="Connections" items={page.connections} />
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

function DetailList({ title, items }) {
  return <section className="detail-card"><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

function EmptyState({ query }) {
  return <div className="empty-state"><p className="page-label">No match</p><h2>No indexed page contains “{query}”.</h2><p>Try a location, route code, signalling term, or speed.</p></div>;
}

createRoot(document.getElementById("root")).render(<App />);
