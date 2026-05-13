const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getProcedureTokens,
  getIcdTokens,
  getNumericAge,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 438 (2026): Statin therapy for prevention/treatment of CVD — denominator proxy (flat row).
 * Encounter + (ASCVD G9662 | LDL/familial G9663/G9782 age 20–75 | diabetes age 40–75 | risk M1364 age 40–75),
 * excluding G9779 (breastfeeding) and G9780 (rhabdo) when present on row.
 */
const encounterCodes = [
  "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008", "98009", "98010", "98011", "98012",
  "98013", "98014", "98015", "98016", "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215", "99242",
  "99243", "99244", "99245", "99385", "99386", "99387", "99395", "99396", "99397", "99401", "99402", "99403", "99404",
  "99429", "G0438", "G0439",
];

const diabetesPrefixes = ["E10", "E11", "E13", "O24"];

const encounterSet = new Set(encounterCodes.map((c) => normalizeCode(c)));

const measure438StatinTherapyPreventionTreatmentCardiovascularDisease = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const procedureTokens = getProcedureTokens(record);
    const icdTokens = getIcdTokens(record);

    const hasEncounter = procedureTokens.some((code) => encounterSet.has(code));

    const hasAscvdFlag = procedureTokens.includes(normalizeCode("G9662"));
    const hasLdlOrFamilialFlag =
      procedureTokens.includes(normalizeCode("G9663")) || procedureTokens.includes(normalizeCode("G9782"));
    const hasDiabetesDx = icdTokens.some((code) => diabetesPrefixes.some((p) => code.startsWith(normalizeCode(p))));
    const hasRiskScoreFlag = procedureTokens.includes(normalizeCode("M1364"));

    const criteria1 = hasAscvdFlag;
    const criteria2 = !Number.isNaN(age) && age >= 20 && age <= 75 && hasLdlOrFamilialFlag;
    const criteria3 = !Number.isNaN(age) && age >= 40 && age <= 75 && hasDiabetesDx;
    const criteria4 = !Number.isNaN(age) && age >= 40 && age <= 75 && hasRiskScoreFlag;

    const hasBreastfeedingExclusion = procedureTokens.includes(normalizeCode("G9779"));
    const hasRhabdoExclusion = procedureTokens.includes(normalizeCode("G9780"));

    const denominatorMet =
      hasEncounter &&
      (criteria1 || criteria2 || criteria3 || criteria4) &&
      !hasBreastfeedingExclusion &&
      !hasRhabdoExclusion;

    return {
      CPT438: hasEncounter ? 1 : 0,
      ICD438: criteria3 ? 1 : 0,
      M438: denominatorMet ? 1 : 0,
      N438_MET: 0,
      N438_EXCEPTION: 0,
      N438_NOT_MET: 0,
      QDC438: "",
    };
  });

  return {
    message: "Measure 438 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure438StatinTherapyPreventionTreatmentCardiovascularDisease,
  measure438: measure438StatinTherapyPreventionTreatmentCardiovascularDisease,
};
