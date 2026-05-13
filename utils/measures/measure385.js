const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const { getProcedureTokens, getModTokens, getNumericAge, normalizeCode } = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 385 (2026): Primary rhegmatogenous RD surgery — visual acuity improvement within 90 days (denominator only).
 * Age ≥ 18; CPT 67107, 67108, 67110; exclude M1453 (pre-op VA better than 20/40) or G9757 (silicone oil).
 */
const denominatorProcedureCodes = ["67107", "67108", "67110"];

const denominatorNormalized = new Set(
  denominatorProcedureCodes.map((c) => normalizeCode(c))
);

const EXCLUSION_M1453 = normalizeCode("M1453");
const EXCLUSION_G9757 = normalizeCode("G9757");

const measure385RetinalDetachmentVaImprovementDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const procedureTokens = getProcedureTokens(record);

    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasProcedure = procedureTokens.some((code) => denominatorNormalized.has(code));
    const hasExclusion =
      codeTokens.includes(EXCLUSION_M1453) || codeTokens.includes(EXCLUSION_G9757);

    const inDenominator = ageOk && hasProcedure && !hasExclusion;

    return {
      CPT385: inDenominator ? 1 : 0,
      M385: inDenominator ? 1 : 0,
      N385_MET: 0,
      N385_EXCEPTION: 0,
      N385_NOT_MET: 0,
      QDC385: "",
    };
  });

  return {
    message: "Measure 385 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure385RetinalDetachmentVaImprovementDenominator,
  measure385: measure385RetinalDetachmentVaImprovementDenominator,
};
