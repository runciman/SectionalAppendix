const pageModules = import.meta.glob("./data/**/*.js", {
  eager: true,
  import: "default"
});

const regionFromModulePath = (path) => path.split("/")[2];

export const appendixPages = Object.entries(pageModules)
  .map(([path, page]) => ({ ...page, region: regionFromModulePath(path) }))
  .sort((left, right) => left.region.localeCompare(right.region)
    || left.pdfPage - right.pdfPage);
