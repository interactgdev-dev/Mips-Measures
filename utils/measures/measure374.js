const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const encounterCodes = require("./data/measure374DenominatorEncounter.json");
const { getProcedureTokens } = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 374 (2026): Closing the referral loop — specialist report (denominator only).
 * Flat-file proxy: qualifying encounter CPT/HCPCS only (G9968 rarely appears on claim lines).
 */
const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const encounterNormalized = new Set(encounterCodes.map((c) => normalizeCode(String(c))));

const measure374ReferralLoopDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const procedureTokens = getProcedureTokens(record);

    const hasEncounter = procedureTokens.some((code) => encounterNormalized.has(code));

    const inDenominator = hasEncounter;

    return {
      CPT374: inDenominator ? 1 : 0,
      M374: inDenominator ? 1 : 0,
      N374_MET: 0,
      N374_EXCEPTION: 0,
      N374_NOT_MET: 0,
      QDC374: "",
    };
  });

  return {
    message: "Measure 374 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure374ReferralLoopDenominator,
  measure374: measure374ReferralLoopDenominator,
};
