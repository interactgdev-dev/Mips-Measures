const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getIcdTokens,
  getProcedureTokens,
  getModTokens,
  getNumericAge,
  normalizeCode,
  icdMatchesSetOrPrefix,
} = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 395 (2026): Lung cancer reporting on biopsy/cytology (denominator only).
 * Flat-file: age ≥ 18; lung ICD list or C34* prefix; pathology CPT; exclude G9420 when present.
 */
const lungCancerIcdNormalized = [
  "C3400", "C3401", "C3402", "C3410", "C3411", "C3412", "C342", "C3430", "C3431", "C3432",
  "C3480", "C3481", "C3482", "C3490", "C3491", "C3492",
];

const denominatorProcedureCodes = ["88104", "88108", "88112", "88173", "88305"];

const lungCancerSet = new Set(lungCancerIcdNormalized);
const procedureSet = new Set(denominatorProcedureCodes.map((c) => normalizeCode(c)));
const EXCLUSION_G9420 = normalizeCode("G9420");

const measure395LungCancerReportingDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const icdTokens = getIcdTokens(record);
    const hasLungCa = icdMatchesSetOrPrefix(icdTokens, lungCancerSet, ["C34"]);

    const procedureTokens = getProcedureTokens(record);

    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasProcedure = procedureTokens.some((c) => procedureSet.has(c));
    const hasExclusion = codeTokens.includes(EXCLUSION_G9420);

    const inDenominator = ageOk && hasLungCa && hasProcedure && !hasExclusion;

    return {
      CPT395: inDenominator ? 1 : 0,
      M395: inDenominator ? 1 : 0,
      N395_MET: 0,
      N395_EXCEPTION: 0,
      N395_NOT_MET: 0,
      QDC395: "",
    };
  });

  return {
    message: "Measure 395 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure395LungCancerReportingDenominator,
  measure395: measure395LungCancerReportingDenominator,
};
