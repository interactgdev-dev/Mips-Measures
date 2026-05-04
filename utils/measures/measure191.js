const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure191CataractsVisualAcuity = async (collection, records) => {
  // CT1 - Cataract procedure codes
  const ct1ProcedureCodes = ["66840", "66850", "66852", "66920", "66930", "66940", "66982", "66983", "66984"];

  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };
  await bulkUpdateRecords(collection, records, (record) => {
    const ct1AgeOnProcedureDate = Number(record.AGE);
    const ct1CptCodes = splitCodes(record.CPT).map((code) => normalizeCode(code));
    const ct1HasProcedure = ct1CptCodes.some((code) => ct1ProcedureCodes.includes(code));

    // CT2 - Exclusions: modifier 55/56 and significant ocular condition indicator M1439
    const ct2Modifiers = splitCodes(record.MOD).map((mod) => normalizeCode(mod));
    const ct2HasExcludedModifier = ct2Modifiers.includes("55") || ct2Modifiers.includes("56");
    const ct2HasOcularExclusion = hasCode(record, "M1439");

    const ct1DenominatorMet =
      ct1AgeOnProcedureDate >= 18 &&
      ct1HasProcedure &&
      !ct2HasExcludedModifier &&
      !ct2HasOcularExclusion;

    return {
      ICD191: ct2HasOcularExclusion ? 1 : 0,
      CPT191: ct1HasProcedure ? 1 : 0,
      M191: ct1DenominatorMet ? 1 : 0,
      N191_MET: 0,
      N191_EXCEPTION: 0,
      N191_NOT_MET: 0,
      QDC191: "",
    };
  });

  return {
    message: "Measure 191 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure191CataractsVisualAcuity,
  measure191: measure191CataractsVisualAcuity,
};
