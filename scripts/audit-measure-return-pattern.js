/**
 * One-off audit: compare measure*.js row-update payloads to measure001-style fields.
 * Run: node scripts/audit-measure-return-pattern.js
 */
const fs = require("fs");
const path = require("path");

const MEASURES_DIR = path.join(__dirname, "..", "utils", "measures");
const SKIP = new Set(["measure491.js", "measure497.js", "measure499.js", "measure999.js"]);

/** Row payload keys: scan whole file (handles measure047-style WeakMap bodies). */
function scanPayloadKeySignals(text) {
  return {
    hasM: /\bM\d+\s*:/.test(text),
    hasE: /\bE\d+\s*:/.test(text),
    hasIcd: /\bICD\d+\s*:/.test(text),
    hasCpt: /\bCPT\d+\s*:/.test(text),
    hasMet: /\bN\d+_MET\s*:/.test(text),
    hasNotMet: /\bN\d+_NOT_MET\s*:/.test(text),
    hasExc: /\bN\d+_EXCEPTION\s*:/.test(text),
    hasQdc: /\bQDC\d+\s*:/.test(text),
  };
}

function main() {
  const files = fs
    .readdirSync(MEASURES_DIR)
    .filter((f) => /^measure\d+\.js$/i.test(f) && !SKIP.has(f))
    .sort((a, b) => {
      const na = +a.match(/\d+/)[0];
      const nb = +b.match(/\d+/)[0];
      return na - nb;
    });

  const strict001 = []; // has E*, ICD*, CPT*, N*_MET, N*_NOT_MET, QDC*, M*
  const missingE = [];
  const missingIcdCptPair = [];
  const missingNotMet = [];
  const hasExceptionNoNotMet = [];
  const noBulk = [];
  const noM = [];

  for (const f of files) {
    const text = fs.readFileSync(path.join(MEASURES_DIR, f), "utf8");
    if (!text.includes("bulkUpdateRecords")) {
      noBulk.push(f);
      continue;
    }
    const k = scanPayloadKeySignals(text);
    if (!k.hasM) noM.push(f);

    if (!k.hasE) missingE.push(f);
    if (!(k.hasIcd && k.hasCpt)) missingIcdCptPair.push(f);
    if (!k.hasNotMet) missingNotMet.push(f);
    if (k.hasExc && !k.hasNotMet) hasExceptionNoNotMet.push(f);

    if (k.hasE && k.hasIcd && k.hasCpt && k.hasMet && k.hasNotMet && k.hasQdc && k.hasM) strict001.push(f);
  }

  console.log("Total measure*.js (excl 491,497,499,999):", files.length);
  console.log("\n=== Strict measure001 row keys (E + ICD + CPT + N_MET + N_NOT_MET + QDC + M) ===");
  console.log("Count:", strict001.length);
  console.log(strict001.join(", ") || "(none)");
  console.log("\n=== Missing E* (vs measure001) ===\n", missingE.join(", ") || "(none)");
  console.log("\n=== Missing ICD* or CPT* pair ===\n", missingIcdCptPair.join(", ") || "(none)");
  console.log("\n=== Missing N*_NOT_MET ===\n", missingNotMet.join(", ") || "(none)");
  console.log("\n=== N*_EXCEPTION but no N*_NOT_MET ===\n", hasExceptionNoNotMet.join(", ") || "(none)");
  console.log("\n=== No bulkUpdateRecords ===\n", noBulk.join(", ") || "(none)");
  console.log("\n=== bulkUpdateRecords but no M* key ===\n", noM.join(", ") || "(none)");
}

main();
