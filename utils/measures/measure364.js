const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const { getProcedureTokens, getModTokens, normalizeCode, getNumericAge } = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 364 (2026): Follow-up CT for incidental pulmonary nodules (denominator only).
 * Flat-file proxy: age ≥ 35 + thoracic CT CPT (G9754 / incidental nodule QDC rarely on claims rows).
 * Still exclude M1018 when present (denominator exclusion).
 */
const denominatorProcedureCodes = [
  "70490", "70491", "70492", "75571", "75572", "75573", "75574", "70498", "71250", "71260", "71270",
  "71275", "72125", "72126", "72127", "72128", "72129", "72130", "74150", "74160", "74170", "74174",
  "74175", "74176", "74177", "74178",
];

const denominatorNormalized = new Set(
  denominatorProcedureCodes.map((c) => normalizeCode(c))
);

const EXCLUSION_M1018 = normalizeCode("M1018");

const measure364PulmonaryNoduleFollowUpDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 35;

    const procedureTokens = getProcedureTokens(record);
    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasProcedure = procedureTokens.some((code) => denominatorNormalized.has(code));
    const hasExclusion = codeTokens.includes(EXCLUSION_M1018);

    const inDenominator = ageOk && hasProcedure && !hasExclusion;

    return {
      CPT364: inDenominator ? 1 : 0,
      M364: inDenominator ? 1 : 0,
      N364_MET: 0,
      N364_EXCEPTION: 0,
      N364_NOT_MET: 0,
      QDC364: "",
    };
  });

  return {
    message: "Measure 364 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure364PulmonaryNoduleFollowUpDenominator,
  measure364: measure364PulmonaryNoduleFollowUpDenominator,
};
