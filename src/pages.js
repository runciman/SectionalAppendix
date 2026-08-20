import gretnaJunctionExtract from "./assets/gretna-junction-page-169.png";
import loopJunctionExtract from "./assets/loop-junction-page-170.png";

export const appendixPages = [
  {
    pdfPage: 169,
    documentPage: "7",
    module: "SC2",
    published: "October 2009",
    lOR: "SC001",
    sequence: "001",
    title: "Gretna Jn to Glasgow Central (via Beattock)",
    elr: "WCM1",
    route: "Scotland",
    imageSrc: gretnaJunctionExtract,
    imageAlt: "PDF page 169 table extract showing Gretna Junction, mileage 8 miles 57 chains, and the running lines and speed restrictions diagram.",
    lastUpdated: "19 November 2016",
    location: "Gretna Jn",
    mileage: "8 miles 57 chains",
    connections: [
      "To/from Carlisle — NW4001, sequence 023",
      "To Kilmarnock — SC031, sequence 001"
    ],
    signalling: [
      "Track Circuit Block (TCB)",
      "Carlisle SB (CE)",
      "AC: Cathcart ECR",
      "GSM-R"
    ],
    speeds: [
      "Up line: 100 mph (EPS 125)",
      "Down line: 105 mph (EPS 125)",
      "Gretna Junction turnouts and branches: 40–50 mph"
    ],
    equipment: "TASS fitted throughout on both the Up and Down lines.",
    transcription: `Gretna Jn to Glasgow Central (via Beattock). LOR SC001, sequence 001; ELR WCM1; Scotland route. Gretna Jn is at mileage 8 miles 57 chains. The route connects to and from Carlisle (NW4001, sequence 023) and to Kilmarnock (SC031, sequence 001). Signalling is Track Circuit Block, controlled by Carlisle SB (CE), with AC Cathcart ECR and GSM-R. The Up line is 100 mph, EPS 125; the Down line is 105 mph, EPS 125. Gretna Junction turnouts and branches are 40–50 mph. TASS is fitted throughout on both lines.`
  },
  {
    pdfPage: 170,
    documentPage: "8",
    module: "SC2",
    published: "October 2009",
    lOR: "SC001",
    sequence: "002",
    title: "Gretna Jn to Glasgow Central (via Beattock)",
    elr: "WCM1",
    route: "Scotland",
    imageSrc: loopJunctionExtract,
    imageAlt: "PDF page 170 table extract showing Loop Junction, Quintinshill, their mileages, and the running lines and speed restrictions diagram.",
    lastUpdated: "28 February 2026",
    location: "Loop Jn & Quintinshill",
    mileage: "9 miles 03 chains to 10 miles 37 chains",
    locations: [
      "Loop Jn — 9m 03ch, 9m 69ch, 9m 70ch and 9m 72ch",
      "Quintinshill — 10m 26ch",
      "Loop Jn — 10m 30ch",
      "Quintinshill GF — 10m 33ch",
      "10m 37ch"
    ],
    connections: [
      "Up Loop (UPL): 1,900 ft (579 m), 90 SLUs",
      "Down Loop (DPL): 1,857 ft (566 m), 88 SLUs"
    ],
    signalling: [
      "Track Circuit Block (TCB)",
      "Carlisle SB (CE)",
      "AC: Cathcart ECR",
      "GSM-R"
    ],
    speeds: [
      "Up Main: 100 mph (EPS 125), then 110 mph (EPS 120/125)",
      "Down Main: 105 mph (EPS 125), then 95 mph (EPS 110), then 110 mph (EPS 120)",
      "Up/Down loops: 40 mph; associated turnouts: 15–40 mph"
    ],
    equipment: "TASS fitted throughout on both the Up and Down lines.",
    transcription: `Gretna Jn to Glasgow Central (via Beattock). LOR SC001, sequence 002; ELR WCM1; Scotland route. The page covers Loop Junction and Quintinshill from 9 miles 03 chains to 10 miles 37 chains. Loop Junction is listed at 9m 03ch, 9m 69ch, 9m 70ch, 9m 72ch and 10m 30ch; Quintinshill at 10m 26ch; and Quintinshill GF at 10m 33ch. It shows the Up and Down Main lines, Up and Down Loops, their speed restrictions, and 15–40 mph turnouts. Signalling is Track Circuit Block, controlled by Carlisle SB (CE), with AC Cathcart ECR and GSM-R. The Up Loop is 1,900 ft (579 m), 90 SLUs; the Down Loop is 1,857 ft (566 m), 88 SLUs. TASS is fitted throughout on both lines.`
  }
];
