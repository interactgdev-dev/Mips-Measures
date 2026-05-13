const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getIcdTokens,
  getProcedureTokens,
  getNumericAge,
  normalizeCode,
} = require("./helpers/clinicalTokens");

const ICD486_1 = ["L2082", "L2084", "L2089", "L209"];
const ICD486_2 = ["L240", "L241", "L242", "L243", "L244", "L245", "L246", "L247", "L2481", "L2489", "L249"];
const ICD486_3 = [
  "L230", "L231", "L232", "L233", "L234", "L235", "L236", "L237", "L2381", "L2389", "L239", "L250", "L251", "L252",
  "L253", "L254", "L255", "L258", "L259", "L560", "L561", "L562",
];
const ICD486_4 = ["L301", "L302", "L303", "L308", "L309"];
const ICD486_5 = ["L300"];

const ENCOUNTER_486 = [
  "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008", "98009", "98010", "98011", "98012",
  "98013", "98014", "98015", "98016", "99202", "99203", "99204", "99205", "99211", "99212", "99213", "99214", "99215",
  "99242", "99243", "99244", "99245",
];

function build486IcdSet() {
  const s = new Set();
  for (const arr of [ICD486_1, ICD486_2, ICD486_3, ICD486_4, ICD486_5]) {
    for (const c of arr) s.add(normalizeCode(c));
  }
  return s;
}

const icd486Set = build486IcdSet();
const encounter486Set = new Set(ENCOUNTER_486.map((c) => normalizeCode(c)));

/**
 * MIPS CQM 486 (2026): Inflammatory skin disorders — appropriate systemic therapy (denominator proxy).
 * Age ≥8, ICD from any stratum value set + encounter (aligned with legacy processing.js lists).
 */
const measure486InflammatorySkinAppropriateSystemicTherapy = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 8;

    const icdTokens = getIcdTokens(record);
    const proc = getProcedureTokens(record);

    const hasIcd = icdTokens.some((t) => icd486Set.has(t));
    const hasEnc = proc.some((t) => encounter486Set.has(t));

    const inDenominator = ageOk && hasIcd && hasEnc;

    return {
      ICD486: hasIcd ? 1 : 0,
      CPT486: hasEnc ? 1 : 0,
      M486: inDenominator ? 1 : 0,
      N486_MET: 0,
      N486_EXCEPTION: 0,
      N486_NOT_MET: 0,
      QDC486: "",
    };
  });

  return {
    message: "Measure 486 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure486InflammatorySkinAppropriateSystemicTherapy,
  measure486: measure486InflammatorySkinAppropriateSystemicTherapy,
};
