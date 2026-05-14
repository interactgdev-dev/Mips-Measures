/**
 * Extract icdCodesToCompare{217|218|219} from utils/processing.js into measure{N}LegacyIcd.json
 */
const fs = require("fs");
const path = require("path");

function extractMeasureIcd(processingPath, measureNum) {
  const text = fs.readFileSync(processingPath, "utf8");
  const key = `exports.measure${measureNum} = async`;
  const start = text.indexOf(key);
  if (start === -1) throw new Error(`measure${measureNum} block not found`);
  const rest = text.slice(start);
  const icdMarker = `const icdCodesToCompare${measureNum} = [`;
  const icdPos = rest.indexOf(icdMarker);
  if (icdPos === -1) throw new Error(`icdCodesToCompare${measureNum} not found`);
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
  if (end === -1) throw new Error(`could not close ICD array for ${measureNum}`);

  const arrLiteral = fromBracket.slice(0, end + 1);
  const codes = Function(`"use strict"; return ${arrLiteral}`)();

  const outPath = path.join(
    __dirname,
    "..",
    "utils",
    "measures",
    "data",
    `measure${measureNum}LegacyIcd.json`
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(codes));
  return { measureNum, count: codes.length, outPath };
}

const processingPath = path.join(__dirname, "..", "utils", "processing.js");
for (const n of [217, 218, 219]) {
  const r = extractMeasureIcd(processingPath, n);
  console.log("wrote", r.outPath, "count", r.count);
}
