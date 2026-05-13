const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const { getProcedureTokens, getModTokens, getNumericAge, normalizeCode } = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 384 (2026): Primary rhegmatogenous RD surgery — no return to OR within 90 days (denominator only).
 * Age ≥ 18; CPT 67107, 67108, 67110; exclude silicone oil G9756.
 */
const denominatorProcedureCodes = ["67107", "67108", "67110"];

const denominatorNormalized = new Set(
  denominatorProcedureCodes.map((c) => normalizeCode(c))
);

const EXCLUSION_G9756 = normalizeCode("G9756");

const measure384RetinalDetachmentNoReoperationDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const procedureTokens = getProcedureTokens(record);

    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasProcedure = procedureTokens.some((code) => denominatorNormalized.has(code));
    const hasExclusion = codeTokens.includes(EXCLUSION_G9756);

    const inDenominator = ageOk && hasProcedure && !hasExclusion;

    return {
      CPT384: inDenominator ? 1 : 0,
      M384: inDenominator ? 1 : 0,
      N384_MET: 0,
      N384_EXCEPTION: 0,
      N384_NOT_MET: 0,
      QDC384: "",
    };
  });

  return {
    message: "Measure 384 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure384RetinalDetachmentNoReoperationDenominator,
  measure384: measure384RetinalDetachmentNoReoperationDenominator,
};
