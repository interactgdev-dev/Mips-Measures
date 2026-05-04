const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure250RadicalProstatectomyPathologyReporting = async (collection, records) => {
  // CT1 - Prostate cancer diagnosis value set.
  const ct1ProstateCancerIcdCodes = ["C61"];
  // CT2 - Qualifying radical prostatectomy pathology procedure.
  const ct2ProcedureCodes = ["88309"];
  // CT3 - Exclusion when specimen site is not prostate.
  const ct3ExclusionCode = "G8798";

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };

  const normalizedIcdCodes = ct1ProstateCancerIcdCodes.map((code) => normalizeCode(code));
  const normalizedProcedureCodes = ct2ProcedureCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    // CT1 - Evaluate diagnosis criteria.
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    // CT2 - Evaluate procedure criteria.
    const procedureTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));

    const ct1HasProstateCancerDiagnosis = icdTokens.some((code) => normalizedIcdCodes.includes(code));
    const ct2HasProcedure = procedureTokens.some((code) => normalizedProcedureCodes.includes(code));
    // CT3 - Evaluate denominator exclusion.
    const ct3HasExclusion = hasCode(record, ct3ExclusionCode);

    // Denominator-only eligibility.
    const ct1DenominatorMet = ct1HasProstateCancerDiagnosis && ct2HasProcedure && !ct3HasExclusion;

    return {
      ICD250: ct1HasProstateCancerDiagnosis ? 1 : 0,
      CPT250: ct2HasProcedure ? 1 : 0,
      M250: ct1DenominatorMet ? 1 : 0,
      N250_MET: 0,
      N250_EXCEPTION: 0,
      N250_NOT_MET: 0,
      QDC250: "",
    };
  });

  return {
    message: "Measure 250 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure250RadicalProstatectomyPathologyReporting,
  measure250: measure250RadicalProstatectomyPathologyReporting,
};
