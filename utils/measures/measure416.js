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
 * MIPS CQM 416 (2026): ED head CT — minor blunt head trauma, ages 2–17 (inverse measure; denominator only).
 * Same trauma ICD list as M415 (2026 PDF). ED CPT 99281–99285, 99291. Excludes M1426 / telehealth POS 2,10; G9595 when present.
 * Flat-file proxy: G9594 (head CT ordered QDC) omitted on denominator row.
 */
const edCpt = ["99281", "99282", "99283", "99284", "99285", "99291"];
const edSet = new Set(edCpt.map((c) => normalizeCode(c)));
const traumaIcdSet = new Set(headTraumaIcd.map((c) => normalizeCode(String(c))));
const EXCL_G9595 = normalizeCode("G9595");
const EXCL_M1426 = normalizeCode("M1426");

const measure416EdHeadCtMinorTraumaPediatricDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 2 && age <= 17;

    const icdTokens = getIcdTokens(record);
    const hasTraumaDx = icdTokens.some((t) => traumaIcdSet.has(t));

    const procedureTokens = getProcedureTokens(record);
    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasEdVisit = procedureTokens.some((c) => edSet.has(c));
    const hasExclusion = codeTokens.includes(EXCL_G9595) || codeTokens.includes(EXCL_M1426);

    const pos = String(record.POS ?? "").trim();
    const telehealthPos = pos === "2" || pos === "10";

    const inDenominator = ageOk && hasTraumaDx && hasEdVisit && !hasExclusion && !telehealthPos;

    return {
      CPT416: inDenominator ? 1 : 0,
      M416: inDenominator ? 1 : 0,
      N416_MET: 0,
      N416_EXCEPTION: 0,
      N416_NOT_MET: 0,
      QDC416: "",
    };
  });

  return {
    message: "Measure 416 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure416EdHeadCtMinorTraumaPediatricDenominator,
  measure416: measure416EdHeadCtMinorTraumaPediatricDenominator,
};
