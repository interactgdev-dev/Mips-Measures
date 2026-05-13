const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const { getProcedureTokens, getNumericAge, normalizeCode } = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 430 (2026): PONV — combination antiemetic therapy (denominator proxy).
 * Age ≥ 18 + anesthesia CPT list aligned with legacy processing / 2026 value set.
 * 4554F / 4556F (inhalational agent, ≥3 PONV risk factors) omitted on flat rows; E430 when both present on row.
 */
const anesthesiaCptList = require(path.join(__dirname, "data", "measure430AnesthesiaCpt.json"));
const anesthesiaCptSet = new Set(anesthesiaCptList.map((c) => normalizeCode(c)).filter(Boolean));

const measure430PonvCombinationTherapy = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const procedureTokens = getProcedureTokens(record);
    const hasAnesthesiaCpt = procedureTokens.some((c) => anesthesiaCptSet.has(c));
    const has4554F = procedureTokens.includes(normalizeCode("4554F"));
    const has4556F = procedureTokens.includes(normalizeCode("4556F"));

    const cpt430Line = ageOk && hasAnesthesiaCpt;
    const inDenominator = cpt430Line;

    const e430 = cpt430Line && has4554F && has4556F ? 1 : 0;

    return {
      CPT430: cpt430Line ? 1 : 0,
      M430: inDenominator ? 1 : 0,
      E430: e430,
      N430_MET: 0,
      N430_EXCEPTION: 0,
      N430_NOT_MET: 0,
      QDC430: "",
    };
  });

  return {
    message: "Measure 430 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure430PonvCombinationTherapy,
  measure430: measure430PonvCombinationTherapy,
};
