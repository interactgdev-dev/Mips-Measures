const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getProcedureTokens,
  getModTokens,
  normalizeCode,
} = require("./helpers/clinicalTokens");

const STEROID_INJ = normalizeCode("M1324");
const TELEHEALTH = normalizeCode("M1426");
const HYPOTONY = normalizeCode("M1326");

const ENCOUNTER_CODES = [
  "92002", "92004", "92012", "92014", "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215", "99242",
  "99243", "99244", "99245",
];

const ENCOUNTER_SET = new Set(ENCOUNTER_CODES.map((c) => normalizeCode(c)));

/**
 * MIPS CQM 499 (2026): IOP after intravitreal/periocular steroid — denominator only.
 * Qualifying encounter + M1324 on row; excludes M1426 (telehealth), M1326 (hypotony), and telehealth POS 02/10.
 */
const measure499IopAfterSteroidDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const proc = getProcedureTokens(record);
    const mods = getModTokens(record);
    const allProc = [...proc, ...mods];

    const hasEncounter = proc.some((t) => ENCOUNTER_SET.has(t));
    const hasSteroidInj = allProc.includes(STEROID_INJ);
    const excludedTele = allProc.includes(TELEHEALTH) || mods.includes(normalizeCode("GQ")) || mods.includes(normalizeCode("GT"));
    const excludedHypotony = allProc.includes(HYPOTONY);
    const pos = String(record.POS ?? "").trim();
    const telehealthPos = pos === "2" || pos === "10";

    const excluded = excludedTele || excludedHypotony || telehealthPos;

    const denominatorMet = hasEncounter && hasSteroidInj && !excluded;

    return {
      ICD499: hasSteroidInj ? 1 : 0,
      CPT499: hasEncounter ? 1 : 0,
      E499: denominatorMet ? 0 : 1,
      N499_MET: 0,
      N499_NOT_MET: 0,
      QDC499: "",
      M499: denominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 499 denominator processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure499IopAfterSteroidDenominator,
  measure499: measure499IopAfterSteroidDenominator,
};
