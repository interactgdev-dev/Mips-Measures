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
 * MIPS CQM 396 (2026): Lung cancer reporting — resection specimens (denominator only).
 * Flat-file: age ≥ 18; lung ICD list or C34*; CPT 88309; exclude G9424 when present.
 */
const lungResectionIcdNormalized = [
  "C3400", "C3401", "C3402", "C3410", "C3411", "C3412", "C342", "C3430", "C3431", "C3432",
  "C3480", "C3481", "C3482", "C3490", "C3491", "C3492",
];

const denominatorProcedureCodes = ["88309"];

const lungCaSet = new Set(lungResectionIcdNormalized);
const procedureSet = new Set(denominatorProcedureCodes.map((c) => normalizeCode(c)));
const EXCLUSION_G9424 = normalizeCode("G9424");

const measure396LungResectionReportingDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const icdTokens = getIcdTokens(record);
    const hasLungCa = icdMatchesSetOrPrefix(icdTokens, lungCaSet, ["C34"]);

    const procedureTokens = getProcedureTokens(record);

    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasProcedure = procedureTokens.some((c) => procedureSet.has(c));
    const hasExclusion = codeTokens.includes(EXCLUSION_G9424);

    const inDenominator = ageOk && hasLungCa && hasProcedure && !hasExclusion;

    return {
      CPT396: inDenominator ? 1 : 0,
      M396: inDenominator ? 1 : 0,
      N396_MET: 0,
      N396_EXCEPTION: 0,
      N396_NOT_MET: 0,
      QDC396: "",
    };
  });

  return {
    message: "Measure 396 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure396LungResectionReportingDenominator,
  measure396: measure396LungResectionReportingDenominator,
};
