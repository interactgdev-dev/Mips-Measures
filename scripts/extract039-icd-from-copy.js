/**
 * Extract icdCodesToCompare39 from utils/processing - Copy.js → measure039LegacyIcd.json
 */
const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "..", "utils", "processing - Copy.js");
const text = fs.readFileSync(srcPath, "utf8");
const key = "exports.measure39 = async";
const start = text.indexOf(key);
if (start === -1) throw new Error("measure39 block not found");
const rest = text.slice(start);
const icdMarker = "const icdCodesToCompare39 = [";
const icdPos = rest.indexOf(icdMarker);
if (icdPos === -1) throw new Error("icdCodesToCompare39 not found");
const bracketStart = icdPos + icdMarker.length - 1;
const fromBracket = rest.slice(bracketStart);

let depth = 0;
let end = -1;
for (let i = 0; i < fromBracket.length; i++) {
  const c = fromBracket[i];
  if (c === "[") depth++;
  else if (c === "]") {
    depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
}
if (end === -1) throw new Error("could not close ICD array");

const arrLiteral = fromBracket.slice(0, end + 1);
const codes = Function(`"use strict"; return ${arrLiteral}`)();

const outPath = path.join(__dirname, "..", "utils", "measures", "data", "measure039LegacyIcd.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(codes));
console.log("wrote", outPath, "count", codes.length);
