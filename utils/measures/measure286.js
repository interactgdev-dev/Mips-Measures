const path = require("path");
const legacy = require(path.join(__dirname, "data", "measure282286Legacy.json"));
const { runLegacyDementiaDenominator } = require("./helpers/dementiaDenominatorLegacy");

/** Legacy-aligned: utils/processing.js measure286 (per-row ICD + CPT on same line). */
const measure286DementiaSafetyScreeningFollowup = async (collection, records) =>
  runLegacyDementiaDenominator(collection, records, {
    icdCodes: legacy.icd286,
    cptCodes: legacy.cpt286,
    fieldPrefix: "286",
  });

module.exports = {
  measure286DementiaSafetyScreeningFollowup,
  measure286: measure286DementiaSafetyScreeningFollowup,
};
