const fs = require("fs");
const path = require("path");

const normalize = (code) =>
  String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const pdf286Icd = `A52.17, A81.00, A81.01, A81.89, F01.50, F01.511, F01.518, F01.52,
F01.53, F01.54, F01.A0, F01.A11, F01.A18, F01.A2, F01.A3, F01.A4, F01.B0, F01.B11, F01.B18, F01.B2,
F01.B3, F01.B4, F01.C0, F01.C11, F01.C18, F01.C2, F01.C3, F01.C4, F02.80, F02.811, F02.818, F02.82,
F02.83, F02.84, F02.A0, F02.A11, F02.A18, F02.A2, F02.A3, F02.A4, F02.B0, F02.B11, F02.B18, F02.B2,
F02.B3, F02.B4, F02.C0, F02.C11, F02.C18, F02.C2, F02.C3, F02.C4, F03.90, F03.911, F03.918, F03.92,
F03.93, F03.94, F03.A0, F03.A11, F03.A18, F03.A2, F03.A3, F03.A4, F03.B0, F03.B11, F03.B18, F03.B2,
F03.B3, F03.B4, F03.C0, F03.C11, F03.C18, F03.C2, F03.C3, F03.C4, F10.27, G30.0, G30.1, G30.8, G30.9,
G31.01, G31.09, G31.83, G31.85, G31.89, G94`;

const pdf286Cpt = `78811, 78814, 90791, 90792, 90832,
90834, 90837, 92507, 92508, 92523, 92526, 92610, 92611, 92612, 92616, 96105, 96112, 96116, 96125, 96130,
96132, 96136, 96138, 96146, 96156, 96158, 96164, 96167, 96170, 97129, 97161, 97162, 97163, 97164, 97165,
97166, 97167, 97168, 98000, 98001, 98002, 98003, 98004, 98005, 98006, 98007, 98008, 98009, 98010, 98011,
98012, 98013, 98014, 98015, 99202, 99203, 99204, 99205, 99211, 99212, 99213, 99214, 99215, 99221, 99222,
99223, 99231, 99232, 99233, 99238, 99239, 99242, 99243, 99244, 99245, 99252, 99253, 99254, 99255,
99281, 99282, 99283, 99284, 99285, 99304, 99305, 99306, 99307, 99308, 99309, 99310, 99341, 99342, 99344,
99345, 99347, 99348, 99349, 99350, 99424, 99426, 99487, 99490, 99491, 99497, A9586, A9601, Q9982, Q9983`;

const pdf288Icd = pdf286Icd;

const pdf288Cpt = `78811, 78814, 90791, 90792, 90832,
90834, 90837, 92507, 92508, 92526, 96116, 96130, 96132, 96136, 96138, 96146, 96156, 96158, 96164, 96167,
96170, 97129, 97161, 97162, 97163, 97164, 97165, 97166, 97167, 97168, 97550, 97552, 98000, 98001, 98002,
98003, 98004, 98005, 98006, 98007, 98008, 98009, 98010, 98011, 98012, 98013, 98014, 98015, 99202, 99203,
99204, 99205, 99211, 99212, 99213, 99214, 99215, 99242, 99243, 99244, 99245, 99304, 99305, 99306,
99307, 99308, 99309, 99310, 99341, 99342, 99344, 99345, 99347, 99348, 99349, 99350, 99424, 99426, 99487,
99490, 99491, 99497, A9586, A9601, Q9982, Q9983`;

function parsePdfSet(raw) {
  return new Set(raw.split(/,\s*/).map((c) => normalize(c.trim())).filter(Boolean));
}

function getImplSets(filePath, icdVar, cptVar) {
  const src = fs.readFileSync(filePath, "utf8");
  const icdBlock = src.match(new RegExp(`const ${icdVar} = \\[([\\s\\S]*?)\\];`));
  const cptBlock = src.match(new RegExp(`const ${cptVar} = \\[([\\s\\S]*?)\\];`));
  const parseArr = (block) =>
    new Set([...block[1].matchAll(/"([^"]+)"/g)].map((m) => normalize(m[1])));
  return { icd: parseArr(icdBlock), cpt: parseArr(cptBlock) };
}

function diff(label, pdfIcd, pdfCpt, implPath, icdVar, cptVar) {
  const impl = getImplSets(implPath, icdVar, cptVar);
  const missI = [...pdfIcd].filter((c) => !impl.icd.has(c)).sort();
  const extraI = [...impl.icd].filter((c) => !pdfIcd.has(c)).sort();
  const missC = [...pdfCpt].filter((c) => !impl.cpt.has(c)).sort();
  const extraC = [...impl.cpt].filter((c) => !pdfCpt.has(c)).sort();
  console.log(`\n=== ${label} ===`);
  console.log("ICD pdf", pdfIcd.size, "impl", impl.icd.size, "missing", missI.length, missI);
  console.log("ICD extra", extraI.length, extraI);
  console.log("CPT pdf", pdfCpt.size, "impl", impl.cpt.size, "missing", missC.length, missC);
  console.log("CPT extra", extraC.length, extraC);
}

const root = path.join(__dirname, "..", "utils", "measures");
diff(
  "M286",
  parsePdfSet(pdf286Icd),
  parsePdfSet(pdf286Cpt),
  path.join(root, "measure286.js"),
  "ct1DementiaIcdCodes",
  "ct2EncounterCodes"
);
diff(
  "M288",
  parsePdfSet(pdf288Icd),
  parsePdfSet(pdf288Cpt),
  path.join(root, "measure288.js"),
  "ct1DementiaIcdCodes",
  "ct2EncounterCodes"
);
