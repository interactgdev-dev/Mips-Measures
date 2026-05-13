const fs = require("fs");
const path = require("path");
const text = fs.readFileSync(path.join(__dirname, "../utils/processing.js"), "utf8");
const i = text.indexOf("exports.measure478 = async");
const block = text.slice(i, i + 15000);
const m = block.match(/const icdCodesToCompare478 = \[([\s\S]*?)\]\s*;\s*\n\s*const cptCodesToCompare478/);
if (!m) {
  console.error("extract478icd: no ICD array match");
  process.exit(1);
}
const arr = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
const outDir = path.join(__dirname, "../utils/measures/data");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "measure478Icd.json");
fs.writeFileSync(outPath, JSON.stringify(arr));
console.log("wrote", outPath, "count", arr.length);
