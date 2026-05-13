const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/**
 * MIPS CQM 351 (2026): Total Knee or Hip Replacement — VTE and cardiovascular risk evaluation.
 * Denominator only: all patients regardless of age with qualifying TKA/THA CPT during the period.
 * Spec: Patient procedure (CPT) 27438, 27442, 27446, 27447, 27130.
 */
const measure351TotalKneeHipReplacementDenominator = async (collection, records) => {
  const denominatorProcedureCodes = ["27438", "27442", "27446", "27447", "27130"];

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedDenominatorCodes = denominatorProcedureCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    const procedureTokens = [
      ...splitCodes(record.CPT),
      ...splitCodes(record.HCPCS),
      ...splitCodes(record.CPT1),
    ].map((code) => normalizeCode(code));
    const hasProcedure = procedureTokens.some((code) => normalizedDenominatorCodes.includes(code));

    return {
      CPT351: hasProcedure ? 1 : 0,
      M351: hasProcedure ? 1 : 0,
      N351_MET: 0,
      N351_EXCEPTION: 0,
      N351_NOT_MET: 0,
      QDC351: "",
    };
  });

  return {
    message: "Measure 351 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure351TotalKneeHipReplacementDenominator,
  measure351: measure351TotalKneeHipReplacementDenominator,
};
