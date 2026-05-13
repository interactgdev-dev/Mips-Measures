const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getProcedureTokens,
  getModTokens,
  getNumericAge,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/** Qualifying visit CPT/HCPCS (composite criterion 1 proxy: ≥6 months with a visit during the period). */
const ENCOUNTER_CODES = [
  "97802", "97803", "97804", "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008", "98009",
  "98010", "98011", "98012", "98013", "98014", "98015", "98016", "99202", "99203", "99204", "99205", "99212", "99213",
  "99214", "99215", "99242", "99243", "99244", "99245", "99341", "99342", "99344", "99345", "99347", "99348", "99349",
  "99350", "99385", "99386", "99387", "99395", "99396", "99397", "99401", "99402", "99403", "99404", "99429", "G0270",
  "G0271", "G0402", "G0438", "G0439",
];

const ENCOUNTER_SET = new Set(ENCOUNTER_CODES.map((c) => normalizeCode(c)));

/**
 * MIPS CQM 497 (2026): Preventive Care and Wellness (Composite) — denominator-only row proxy.
 * Eligible when age ≥ 6 months (numeric AGE in years), a qualifying outpatient/preventive-style encounter code
 * is present, and the row is not flagged as telehealth-only (M1426 or POS 02/10).
 * Component-level numerators are not evaluated on a single flat row.
 */
const measure497PreventiveCareWellnessDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 0.5;

    const proc = getProcedureTokens(record);
    const mods = getModTokens(record);
    const allProc = [...proc, ...mods];

    const hasEncounter = proc.some((t) => ENCOUNTER_SET.has(t));
    const telehealthRow =
      allProc.includes(normalizeCode("M1426")) ||
      mods.includes(normalizeCode("GQ")) ||
      mods.includes(normalizeCode("GT"));
    const pos = String(record.POS ?? "").trim();
    const telehealthPos = pos === "2" || pos === "10";

    const denominatorMet = ageOk && hasEncounter && !telehealthRow && !telehealthPos;

    return {
      ICD497: ageOk ? 1 : 0,
      CPT497: hasEncounter ? 1 : 0,
      E497: denominatorMet ? 0 : 1,
      N497_MET: 0,
      N497_NOT_MET: 0,
      QDC497: "",
      M497: denominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 497 denominator processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure497PreventiveCareWellnessDenominator,
  measure497: measure497PreventiveCareWellnessDenominator,
};
