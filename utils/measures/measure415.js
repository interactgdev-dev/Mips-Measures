const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const headTraumaIcd = require("./data/measure415HeadTraumaIcd.json");
const {
  getIcdTokens,
  getProcedureTokens,
  getModTokens,
  getNumericAge,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 415 (2026): ED CT for minor blunt head trauma — age 18+ (denominator only).
 * Flat-file proxy: trauma ICD list (2026 PDF) + ED E/M CPT 99281–99285, 99291.
 * G9530 (CT ordered QDC) omitted for claim extracts. Exclude G9531 when present; exclude M1426 (telehealth) when present.
 */
const edCpt = ["99281", "99282", "99283", "99284", "99285", "99291"];
const edSet = new Set(edCpt.map((c) => normalizeCode(c)));
const traumaIcdSet = new Set(headTraumaIcd.map((c) => normalizeCode(String(c))));
const EXCL_G9531 = normalizeCode("G9531");
const EXCL_M1426 = normalizeCode("M1426");

const measure415EdHeadCtMinorTraumaDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const icdTokens = getIcdTokens(record);
    const hasTraumaDx = icdTokens.some((t) => traumaIcdSet.has(t));

    const procedureTokens = getProcedureTokens(record);
    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasEdVisit = procedureTokens.some((c) => edSet.has(c));
    const hasExclusion = codeTokens.includes(EXCL_G9531) || codeTokens.includes(EXCL_M1426);

    const inDenominator = ageOk && hasTraumaDx && hasEdVisit && !hasExclusion;

    return {
      CPT415: inDenominator ? 1 : 0,
      M415: inDenominator ? 1 : 0,
      N415_MET: 0,
      N415_EXCEPTION: 0,
      N415_NOT_MET: 0,
      QDC415: "",
    };
  });

  return {
    message: "Measure 415 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure415EdHeadCtMinorTraumaDenominator,
  measure415: measure415EdHeadCtMinorTraumaDenominator,
};
