const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const hfIcdCodes = new Set([
  "I110", "I130", "I132", "I501", "I5020", "I5021", "I5022", "I5023", "I5030",
  "I5031", "I5032", "I5033", "I5040", "I5041", "I5042", "I5043", "I50814", "I5082",
  "I5083", "I5084", "I5089", "I509",
]);

const outpatientEncounterCodes = new Set([
  "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
  "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
  "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
  "99242", "99243", "99244", "99245", "99304", "99305", "99306", "99307", "99308",
  "99309", "99310", "99315", "99316", "99341", "99342", "99344", "99345", "99347",
  "99348", "99349", "99350", "99424", "99426",
]);

const dischargeEncounterCodes = new Set(["99238", "99239"]);

/**
 * Row-level logic aligned with legacy `processing - Copy.js` measure8 (Counts tab M008).
 * Denominator on a row: HF ICD + two outpatient CPT codes on the same row.
 * G8923 is used for E008 only, not required for M008 (same as Copy).
 */
const measure008HfBetaBlockerLvsd = async (collection, records) => {
  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  await bulkUpdateRecords(collection, records, (record) => {
    const icdCodes = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const cptCodes = splitCodes(record.CPT).map((code) => normalizeCode(code));
    const age = Number(record.AGE);
    const inAgeRange = Number.isFinite(age) && age >= 18;

    const icdMatched = icdCodes.filter((code) => hfIcdCodes.has(code) && inAgeRange);
    const cpt1Matched = cptCodes.filter((code) => outpatientEncounterCodes.has(code) && inAgeRange);
    const cpt2Matched = cptCodes.filter((code) => outpatientEncounterCodes.has(code) && inAgeRange);
    const cptDischargeMatched = cptCodes.filter((code) => dischargeEncounterCodes.has(code) && inAgeRange);
    const hasG8923 = inAgeRange && cptCodes.includes("G8923");

    const path1Eligible =
      icdMatched.length > 0 && cpt1Matched.length > 0 && cpt2Matched.length > 0;

    const e008Eligible = path1Eligible && hasG8923;

    return {
      ICD8C1: icdMatched.length > 0 ? 1 : 0,
      CPT8C1: cpt1Matched.length > 0 && cpt2Matched.length > 0 ? 1 : 0,
      ICD8C2: 0,
      CPT8C2: cptDischargeMatched.length > 0 ? 1 : 0,
      E008: e008Eligible ? 1 : 0,
      N008_MET: 0,
      N008_EXCEPTION: 0,
      N008_NOT_MET: 0,
      QDC008: "",
      M008: path1Eligible ? 1 : 0,
    };
  });

  return {
    message: "Measure 8 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure008HfBetaBlockerLvsd,
  measure008: measure008HfBetaBlockerLvsd,
  measure8: measure008HfBetaBlockerLvsd,
};
