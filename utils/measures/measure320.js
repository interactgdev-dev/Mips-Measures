const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure320FollowupIntervalNormalColonoscopy = async (collection, records) => {
  // CT1 - Colon cancer screening diagnosis.
  const ct1DiagnosisCodes = ["Z12.11"];
  // CT2 - Qualifying screening colonoscopy procedures.
  const ct2ProcedureCodes = ["44388", "45378", "G0121"];
  // CT3 - Exclusion modifiers for incomplete/discontinued procedure.
  const ct3ExcludedModifiers = ["52", "53", "73", "74"];

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedDiagnosisCodes = ct1DiagnosisCodes.map((code) => normalizeCode(code));
  const normalizedProcedureCodes = ct2ProcedureCodes.map((code) => normalizeCode(code));
  const normalizedExcludedModifiers = ct3ExcludedModifiers.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageEligible = Number.isFinite(age) && age >= 45 && age <= 75;

    const diagnosisTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const procedureTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));
    const modifierTokens = [
      ...splitCodes(record.MOD),
      ...splitCodes(record.MOD1),
      ...splitCodes(record.MODIFIER),
      ...splitCodes(record.MODIFIERS),
    ].map((code) => normalizeCode(code));

    const hasScreeningDx = diagnosisTokens.some((code) => normalizedDiagnosisCodes.includes(code));
    const hasProcedure = procedureTokens.some((code) => normalizedProcedureCodes.includes(code));
    const hasExcludedModifier = modifierTokens.some((code) => normalizedExcludedModifiers.includes(code));

    // Denominator-only eligibility.
    const denominatorMet = ageEligible && hasScreeningDx && hasProcedure && !hasExcludedModifier;

    return {
      ICD320: hasScreeningDx ? 1 : 0,
      CPT320: hasProcedure ? 1 : 0,
      M320: denominatorMet ? 1 : 0,
      N320_MET: 0,
      N320_EXCEPTION: 0,
      N320_NOT_MET: 0,
      QDC320: "",
    };
  });

  return {
    message: "Measure 320 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure320FollowupIntervalNormalColonoscopy,
  measure320: measure320FollowupIntervalNormalColonoscopy,
};
