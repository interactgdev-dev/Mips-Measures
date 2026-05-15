const {
  encounterCptCodes127,
  diabetesIcd127,
  hasCode,
  runFootCareRowLegacy,
} = require("./helpers/footCareDenominator2026");

/** M127 — legacy row logic (processing - Copy.js): ICD + CPT same row, exact ICD list, G0127. */
const measure127DiabetesFootwearEvaluation = async (collection, records) =>
  runFootCareRowLegacy(collection, records, {
    fieldPrefix: "127",
    encounterList: encounterCptCodes127,
    exclusionCode: "G2180",
    diabetesIcdSet: diabetesIcd127,
    getQdcStatus: (record) => {
      if (hasCode(record, "G8410")) return { qdc: "G8410", status: "met" };
      if (hasCode(record, "G8416")) return { qdc: "G8416", status: "exception" };
      if (hasCode(record, "G8415")) return { qdc: "G8415", status: "not_met" };
      return null;
    },
  });

module.exports = {
  measure127DiabetesFootwearEvaluation,
  measure127: measure127DiabetesFootwearEvaluation,
  measure127v2: measure127DiabetesFootwearEvaluation,
};
