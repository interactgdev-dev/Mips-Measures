const path = require("path");
const legacy = require(path.join(__dirname, "data", "measure282286Legacy.json"));
const { runLegacyDementiaDenominator } = require("./helpers/dementiaDenominatorLegacy");

/** Legacy-aligned: utils/processing.js measure288 (per-row ICD + CPT on same line). */
const measure288DementiaCaregiverEducationSupport = async (collection, records) =>
  runLegacyDementiaDenominator(collection, records, {
    icdCodes: legacy.icd288,
    cptCodes: legacy.cpt288,
    fieldPrefix: "288",
  });

module.exports = {
  measure288DementiaCaregiverEducationSupport,
  measure288: measure288DementiaCaregiverEducationSupport,
};
