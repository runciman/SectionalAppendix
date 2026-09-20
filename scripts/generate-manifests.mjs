import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const dataRoot = join(root, "src", "data");
const outputRoot = join(root, "public");
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : entry.name.endsWith(".js") ? [join(directory, entry.name)] : []))).flat();
}
function fieldName(name) { return `(?:${name}|["']${name}["'])`; }
function stringField(source, name) { return source.match(new RegExp(`${fieldName(name)}\\s*:\\s*["']([^"']*)["']`))?.[1] ?? ""; }
function numberField(source, name) { const match = source.match(new RegExp(`${fieldName(name)}\\s*:\\s*(\\d+)`)); return match ? Number(match[1]) : undefined; }
const records = await Promise.all((await files(dataRoot)).map(async (file) => {
  const source = await readFile(file, "utf8");
  const [region, lOR, filename] = relative(dataRoot, file).split(sep);
  const sequence = filename.replace(/\.js$/, "");
  const record = { id: `${region}:${lOR}:${sequence}`, region, lOR, sequence, pdfPage: numberField(source, "pdfPage"), title: stringField(source, "title"), location: stringField(source, "location"), mileage: stringField(source, "mileage"), route: stringField(source, "route"), elr: stringField(source, "elr"), lastUpdated: stringField(source, "lastUpdated") };
  return { ...record, searchText: `${record.id} ${source.replace(/[^a-z0-9]+/gi, " ")}`.toLowerCase() };
}));
records.sort((a, b) => a.region.localeCompare(b.region) || (a.pdfPage ?? 0) - (b.pdfPage ?? 0));
await mkdir(outputRoot, { recursive: true });
await writeFile(join(outputRoot, "pages-manifest.json"), JSON.stringify(records.map(({ searchText, ...record }) => record)));
await writeFile(join(outputRoot, "search-index.json"), JSON.stringify(records.map(({ id, searchText, title, location, lOR, sequence, region }) => ({ id, searchText, title, location, lOR, sequence, region }))));
