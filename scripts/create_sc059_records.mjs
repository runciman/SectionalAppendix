import { readFileSync, writeFileSync } from "node:fs";

const locations = [
  "Cook Street to Shields Jn", "Terminus to Shields Jn", "Cardonald to Hillington West", "Arkleston Jn to Paisley Gilmour Street", "Brown Street Crossover to Elderslie West", "Johnstone to Lochwinnoch", "Glengarnock", "CE Siding to Dalry", "Kilwinning Jn and Kilwinning", "Byrehill Jn to Galles", "Barassie to Barassie Jn", "Troon to Prestwick Town", "Falkland to Newton Jn", "Ayr", "Townhead to Dalrymple Jn", "Myremill Farm LC to Kilkerran SB", "Kilkerran SB area", "Girvan", "Pinmore Tunnel area", "Cairnlea No 1 and No 2 LCs", "Miltonise LC to Marklach No 3 LC", "Milton of Larg LCs to Craig No 2 LC", "Glenwhilly SB to Little Genoch No 1 LC", "Little Genoch No 2 LC to Stranraer Yard", "Stranraer Harbour SB to end of line"
];
const elrs = ["AYR1 LYE", "AYR1 BRD", "AYR1", "AYR1 GOU1", "AYR1 AYR2 AYR3", "AYR3", "AYR3", "AYR3 AYR4", "AYR4", "AYR4", "AYR4 AYR5", "AYR5 AYR6", "AYR6", "AYR6", "STR1", "STR1", "STR1", "STR1 STR2", "STR2", "STR2", "STR2", "STR2", "STR2 STR3", "STR3 STR4", "STR4"];
const updates = ["30/01/2016", "30/01/2016", "30/01/2016", "30/01/2016", "26/06/2022", "30/01/2016", "30/01/2016", "30/01/2016", "25/03/2017", "30/01/2016", "30/01/2016", "30/01/2016", "30/01/2016", "11/10/2025", "10/04/2021", "10/04/2021", "04/03/2017", "04/03/2017", "30/01/2016", "30/01/2016", "23/03/2019", "12/12/2020", "28/03/2019", "28/03/2019", "30/01/2016"];

for (let index = 0; index < 25; index += 1) {
  const pdfPage = 331 + index;
  const sequence = String(index + 3).padStart(3, "0");
  const ocr = readFileSync(`tmp/batch-index/ocr/page-${String(pdfPage).padStart(4, "0")}.txt`, "utf8").replace(/\s+/g, " ").trim();
  const record = `import imageSrc from "../../../assets/scotland/SC059/${sequence}.png";\n\nconst page${pdfPage} = {\n  pdfPage: ${pdfPage},\n  documentPage: "${index + 13}",\n  module: "SC4",\n  published: "October 2009",\n  lOR: "SC059",\n  sequence: "${sequence}",\n  title: "Glasgow Central to Stranraer",\n  elr: "${elrs[index]}",\n  route: "Scotland",\n  imageSrc,\n  imageAlt: "Original PDF table extract from page ${pdfPage} showing ${locations[index]}, its mileages, and running-line restrictions.",\n  lastUpdated: "${updates[index]}",\n  location: "${locations[index]}",\n  mileage: "See source diagram",\n  locations: ["${locations[index]}"],\n  connections: [],\n  signalling: ["See source diagram", "GSM-R"],\n  speeds: ["See source diagram"],\n  equipment: "See source diagram and remarks.",\n  transcription: ${JSON.stringify(ocr)}\n};\n\nexport default page${pdfPage};\n`;
  writeFileSync(`src/data/scotland/SC059/${sequence}.js`, record);
}
