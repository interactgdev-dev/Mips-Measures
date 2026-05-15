const {
  baseEncounterCptCodes,
  diabetesIcd126,
  hasCode,
  runFootCareRowLegacy,
} = require("./helpers/footCareDenominator2026");

/** M126 — legacy row logic (processing - Copy.js): ICD + CPT same row, exact ICD list. */
const measure126DiabetesFootExam = async (collection, records) =>
  runFootCareRowLegacy(collection, records, {
    fieldPrefix: "126",
    encounterList: baseEncounterCptCodes,
    exclusionCode: "G2178",
    diabetesIcdSet: diabetesIcd126,
    getQdcStatus: (record) => {
      if (hasCode(record, "G8404")) return { qdc: "G8404", status: "met" };
      if (hasCode(record, "G2179")) return { qdc: "G2179", status: "exception" };
      if (hasCode(record, "G8405")) return { qdc: "G8405", status: "not_met" };
      return null;
    },
  });

module.exports = {
  measure126DiabetesFootExam,
  measure126: measure126DiabetesFootExam,
};
