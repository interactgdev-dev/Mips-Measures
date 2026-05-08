const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure350SharedDecisionTrialConservativeTherapy = async (collection, records) => {
  // CT1 - Qualifying total knee/hip replacement procedure codes.
  const ct1ProcedureCodes = ["27438", "27442", "27446", "27447", "27130"];

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedProcedureCodes = ct1ProcedureCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    const procedureTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));
    const hasProcedure = procedureTokens.some((code) => normalizedProcedureCodes.includes(code));

    return {
      CPT350: hasProcedure ? 1 : 0,
      M350: hasProcedure ? 1 : 0,
      N350_MET: 0,
      N350_EXCEPTION: 0,
      N350_NOT_MET: 0,
      QDC350: "",
    };
  });

  return {
    message: "Measure 350 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure350SharedDecisionTrialConservativeTherapy,
  measure350: measure350SharedDecisionTrialConservativeTherapy,
};
