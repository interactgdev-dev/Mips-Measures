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
 * MIPS CQM 397 (2026): Melanoma reporting (denominator only).
 * Flat-file: age ≥ 18; melanoma ICD list or C43*; CPT 88305; exclude G9430 when present.
 */
const melanomaIcdNormalized = [
  "C430", "C4320", "C4321", "C4322", "C4330", "C4331", "C4339", "C434", "C4351", "C4352", "C4359",
  "C4360", "C4361", "C4362", "C4370", "C4371", "C4372", "C438", "C439",
];

const denominatorProcedureCodes = ["88305"];

const melanomaSet = new Set(melanomaIcdNormalized);
const procedureSet = new Set(denominatorProcedureCodes.map((c) => normalizeCode(c)));
const EXCLUSION_G9430 = normalizeCode("G9430");

const measure397MelanomaReportingDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const icdTokens = getIcdTokens(record);
    const hasMelanoma = icdMatchesSetOrPrefix(icdTokens, melanomaSet, ["C43"]);

    const procedureTokens = getProcedureTokens(record);

    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasProcedure = procedureTokens.some((c) => procedureSet.has(c));
    const hasExclusion = codeTokens.includes(EXCLUSION_G9430);

    const inDenominator = ageOk && hasMelanoma && hasProcedure && !hasExclusion;

    return {
      CPT397: inDenominator ? 1 : 0,
      M397: inDenominator ? 1 : 0,
      N397_MET: 0,
      N397_EXCEPTION: 0,
      N397_NOT_MET: 0,
      QDC397: "",
    };
  });

  return {
    message: "Measure 397 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure397MelanomaReportingDenominator,
  measure397: measure397MelanomaReportingDenominator,
};
