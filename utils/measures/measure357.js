const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const denominatorCodes = require("./data/measure357DenominatorCpt.json");

/**
 * MIPS CQM 357 (2026): Surgical site infection (inverse). Denominator only.
 * Age 18+ and operative CPT from PDF (469 codes, extracted from specification).
 */
const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const denominatorNormalized = new Set(
  denominatorCodes.map((c) => normalizeCode(String(c)))
);

const measure357SurgicalSiteInfectionDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const procedureTokens = [
      ...splitCodes(record.CPT),
      ...splitCodes(record.HCPCS),
      ...splitCodes(record.CPT1),
    ].map((code) => normalizeCode(code));
    const hasProcedure = procedureTokens.some((code) => denominatorNormalized.has(code));

    const inDenominator = ageOk && hasProcedure;

    return {
      CPT357: inDenominator ? 1 : 0,
      M357: inDenominator ? 1 : 0,
      N357_MET: 0,
      N357_EXCEPTION: 0,
      N357_NOT_MET: 0,
      QDC357: "",
    };
  });

  return {
    message: "Measure 357 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure357SurgicalSiteInfectionDenominator,
  measure357: measure357SurgicalSiteInfectionDenominator,
};
