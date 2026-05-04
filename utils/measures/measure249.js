const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure249BarrettsEsophagus = async (collection, records) => {
  // CT1 - Barrett's esophagus diagnosis value set.
  const ct1BarrettsIcdCodes = ["K22.70", "K22.710", "K22.711", "K22.719"];
  // CT2 - Qualifying pathology procedure value set.
  const ct2ProcedureCodes = ["88305"];
  // CT3 - Denominator exclusion code.
  const ct3ExclusionCode = "G8797";

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [
      ...splitCodes(record.CPT),
      ...splitCodes(record.HCPCS),
      ...splitCodes(record.CPT1),
      ...splitCodes(record.ICD),
    ];
    return tokens.some((token) => normalizeCode(token) === target);
  };

  const normalizedBarrettsIcdCodes = ct1BarrettsIcdCodes.map((code) => normalizeCode(code));
  const normalizedProcedureCodes = ct2ProcedureCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    // CT1 - Evaluate qualifying diagnosis.
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    // CT2 - Evaluate qualifying pathology procedure from CPT/HCPCS/CPT1.
    const procedureTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));

    const ct1HasBarrettsDiagnosis = icdTokens.some((code) => normalizedBarrettsIcdCodes.includes(code));
    const ct2HasProcedure = procedureTokens.some((code) => normalizedProcedureCodes.includes(code));
    // CT3 - Exclude non-esophagus specimen site.
    const ct3HasExclusion = hasCode(record, ct3ExclusionCode);

    // Denominator-only eligibility.
    const ct1DenominatorMet = ct1HasBarrettsDiagnosis && ct2HasProcedure && !ct3HasExclusion;

    return {
      ICD249: ct1HasBarrettsDiagnosis ? 1 : 0,
      CPT249: ct2HasProcedure ? 1 : 0,
      M249: ct1DenominatorMet ? 1 : 0,
      N249_MET: 0,
      N249_EXCEPTION: 0,
      N249_NOT_MET: 0,
      QDC249: "",
    };
  });

  return {
    message: "Measure 249 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure249BarrettsEsophagus,
  measure249: measure249BarrettsEsophagus,
};
