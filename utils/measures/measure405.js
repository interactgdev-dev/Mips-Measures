const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const { getProcedureTokens, getNumericAge, normalizeCode } = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 405 (2026): Appropriate follow-up imaging for incidental abdominal lesions (denominator only).
 * Flat-file: age ≥ 18 + qualifying CT/MRI CPT. G9547 omitted (incidental-finding QDC rarely on claim lines).
 */
const imagingCpt = [
  "71250", "71260", "71270", "71271", "71275", "71555", "72131", "72191", "72192", "72193", "72194", "72195", "72196",
  "72197", "72198", "74150", "74160", "74170", "74176", "74177", "74178", "74181", "74182", "74183",
];

const imagingSet = new Set(imagingCpt.map((c) => normalizeCode(c)));

const measure405IncidentalAbdominalDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const procedureTokens = getProcedureTokens(record);

    const hasImagingCpt = procedureTokens.some((c) => imagingSet.has(c));

    const inDenominator = ageOk && hasImagingCpt;

    return {
      CPT405: inDenominator ? 1 : 0,
      M405: inDenominator ? 1 : 0,
      N405_MET: 0,
      N405_EXCEPTION: 0,
      N405_NOT_MET: 0,
      QDC405: "",
    };
  });

  return {
    message: "Measure 405 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure405IncidentalAbdominalDenominator,
  measure405: measure405IncidentalAbdominalDenominator,
};
