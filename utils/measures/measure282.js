const path = require("path");
const legacy = require(path.join(__dirname, "data", "measure282286Legacy.json"));
const { runLegacyDementiaDenominator } = require("./helpers/dementiaDenominatorLegacy");

/** Legacy-aligned: utils/processing.js measure282 (per-row ICD + CPT on same line). */
const measure282DementiaFunctionalStatusAssessment = async (collection, records) =>
  runLegacyDementiaDenominator(collection, records, {
    icdCodes: legacy.icd282,
    cptCodes: legacy.cpt282,
    fieldPrefix: "282",
  });

module.exports = {
  measure282DementiaFunctionalStatusAssessment,
  measure282: measure282DementiaFunctionalStatusAssessment,
};
