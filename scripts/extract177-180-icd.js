const fs = require("fs");
const path = require("path");
const t = fs.readFileSync(path.join(__dirname, "../utils/processing - Copy.js"), "utf8");

function extractMeasureIcd(exportName, constName) {
  const start = t.indexOf(`exports.${exportName} = async`);
  if (start < 0) throw new Error("start " + exportName);
  const block = t.slice(start, start + 80000);
  const re = new RegExp(`const ${constName} = \\[([\\s\\S]*?)\\];\\s*\\n\\s*const cpt`);
  const m = block.match(re);
  if (!m) throw new Error("no match " + constName);
  return m[1].match(/"[^"]+"/g).map((s) => JSON.parse(s));
}

const dataDir = path.join(__dirname, "../utils/measures/data");
fs.mkdirSync(dataDir, { recursive: true });

const icd177 = extractMeasureIcd("measure177", "icdCodesToCompare177");
fs.writeFileSync(path.join(dataDir, "measure177LegacyIcd.json"), JSON.stringify(icd177));
console.log("177 icd", icd177.length);

const icd180 = extractMeasureIcd("measure180", "icdCodesToCompare180");
fs.writeFileSync(path.join(dataDir, "measure180LegacyIcd.json"), JSON.stringify(icd180));
console.log("180 icd", icd180.length);
