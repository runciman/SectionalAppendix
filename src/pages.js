const pageModules = import.meta.glob("./data/**/*.js", {
  eager: true,
  import: "default"
});

export const appendixPages = Object.values(pageModules).sort(
  (left, right) => left.pdfPage - right.pdfPage
);
