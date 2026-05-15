const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const cadIcdCodes = new Set([
  "I200", "I201", "I202", "I2081", "I2089", "I209", "I240", "I2489", "I249", "I2510",
  "I25110", "I25111", "I25112", "I25118", "I25119", "I255", "I256", "I25700", "I25701",
  "I25702", "I25708", "I25709", "I25710", "I25711", "I25712", "I25718", "I25719", "I25720",
  "I25721", "I25722", "I25728", "I25729", "I25730", "I25731", "I25732", "I25738", "I25739",
  "I25750", "I25751", "I25752", "I25758", "I25759", "I25760", "I25761", "I25762", "I25768",
  "I25769", "I25790", "I25791", "I25792", "I25798", "I25799", "I25810", "I25811", "I25812",
  "I2582", "I2583", "I2584", "I2589", "I259", "Z951", "Z955", "Z9861",
]);

const cardiacSurgeryCodes = new Set([
  "33140", "33510", "33511", "33512", "33513", "33514", "33516", "33533", "33534",
  "33535", "33536", "92920", "92924", "92928", "92930", "92933", "92937", "92941", "92943", "92945",
]);

const encounterCodes = new Set([
  "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008", "98009",
  "98010", "98011", "98012", "98013", "98014", "98015", "98016", "99202", "99203", "99204",
  "99205", "99212", "99213", "99214", "99215", "99242", "99243", "99244", "99245", "99304",
  "99305", "99306", "99307", "99308", "99309", "99310", "99315", "99316", "99341", "99342",
  "99344", "99345", "99347", "99348", "99349", "99350", "99424", "99426",
]);

const priorMiIcdCodes = new Set([
  "I2101", "I2102", "I2109", "I2111", "I2119", "I2121", "I2129", "I213", "I214", "I219", "I21A9", "I21B",
]);

/**
 * Legacy-aligned with `utils/processing.js` measure7 (row-level; M007 for Counts tab).
 * Not the strict 2026 draft that required G8694 + two encounter CPTs on one line (that yielded zero counts).
 */
const measure007CadBetaBlockerTherapy = async (collection, records) => {
  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  await bulkUpdateRecords(collection, records, (record) => {
    const icdCodes = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const cptCodes = splitCodes(record.CPT).map((code) => normalizeCode(code));
    const age = Number(record.AGE);
    const inAgeRange = Number.isFinite(age) && age >= 18;

    const hasCad = icdCodes.some((code) => cadIcdCodes.has(code));
    const hasCardiacSurgeryProxy = cptCodes.some((code) => cardiacSurgeryCodes.has(code));
    const hasCadOrProxy = inAgeRange && (hasCad || hasCardiacSurgeryProxy);
    const hasEncounter = inAgeRange && cptCodes.some((code) => encounterCodes.has(code));
    const hasPriorMi = icdCodes.some((code) => priorMiIcdCodes.has(code));
    const hasG8694 = cptCodes.includes("G8694");

    const criteria1Eligible = hasCadOrProxy && hasEncounter;
    const criteria2Eligible = hasCadOrProxy && hasEncounter && hasPriorMi;
    const measureEligible = criteria1Eligible || criteria2Eligible;

    return {
      ICD7C1: hasCadOrProxy ? 1 : 0,
      CPT7C11: hasCadOrProxy ? 1 : 0,
      CPT7C12: hasEncounter ? 1 : 0,
      CPT7C13: hasEncounter ? 1 : 0,
      CPT7C14: hasG8694 ? 1 : 0,
      ICD7C21: hasCadOrProxy ? 1 : 0,
      ICD7C22: hasPriorMi ? 1 : 0,
      CPT7C21: hasCadOrProxy ? 1 : 0,
      CPT7C22: hasEncounter ? 1 : 0,
      CPT7C23: hasEncounter ? 1 : 0,
      E007: measureEligible ? 0 : 1,
      N007_MET: 0,
      N007_EXCEPTION: 0,
      N007_NOT_MET: 0,
      QDC007: "",
      M007: measureEligible ? 1 : 0,
    };
  });

  return {
    message: "Measure 7 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure007CadBetaBlockerTherapy,
  measure007: measure007CadBetaBlockerTherapy,
  measure7: measure007CadBetaBlockerTherapy,
};
