const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const denominatorCodes = require("./data/measure358DenominatorCpt.json");
const { getProcedureTokens, getModTokens, getNumericAge, normalizeCode } = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 358 (2026): Patient-centered surgical risk assessment and communication. Denominator only.
 * Age 18+, non-emergency surgery CPT from PDF, excluding emergency surgery (HCPCS G9752).
 * CPT list includes Category III (####T) codes per specification. Procedure tokens from CPT/HCPCS/CPT1/PROC*.
 */

const denominatorNormalized = new Set(
  denominatorCodes.map((c) => normalizeCode(String(c)))
);

const EMERGENCY_EXCLUSION_HCPCS = normalizeCode("G9752");

const measure358SurgicalRiskAssessmentDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const procedureTokens = getProcedureTokens(record);
    const exclusionTokens = [...procedureTokens, ...getModTokens(record)];

    const hasEmergencyExclusion = exclusionTokens.includes(EMERGENCY_EXCLUSION_HCPCS);
    const hasProcedure = procedureTokens.some((code) => denominatorNormalized.has(code));

    const inDenominator = ageOk && hasProcedure && !hasEmergencyExclusion;

    return {
      CPT358: inDenominator ? 1 : 0,
      M358: inDenominator ? 1 : 0,
      N358_MET: 0,
      N358_EXCEPTION: 0,
      N358_NOT_MET: 0,
      QDC358: "",
    };
  });

  return {
    message: "Measure 358 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure358SurgicalRiskAssessmentDenominator,
  measure358: measure358SurgicalRiskAssessmentDenominator,
};
