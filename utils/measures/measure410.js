const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getIcdTokens,
  getProcedureTokens,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 410 (2026): Psoriasis — clinical response to systemic medications (denominator only).
 * Flat-file proxy: psoriasis vulgaris L40.0 (L400) + encounter CPT/HCPCS from 2026 PDF.
 * G9764 (systemic treatment QDC) omitted — rarely on claim lines; align with other relaxed denominators.
 */
const encounterCodes = [
  "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008", "98009", "98010", "98011",
  "98012", "98013", "98014", "98015", "98016", "99202", "99203", "99204", "99205", "99212", "99213", "99214",
  "99215", "99242", "99243", "99244", "99245", "99341", "99342", "99344", "99345", "99347", "99348", "99349",
  "99350", "99424", "99426", "G0438", "G0439",
];

const PSORIASIS_VULGARIS = normalizeCode("L400");
const encounterSet = new Set(encounterCodes.map((c) => normalizeCode(c)));

const measure410PsoriasisSystemicDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const icdTokens = getIcdTokens(record);
    const hasL400 = icdTokens.includes(PSORIASIS_VULGARIS);

    const procedureTokens = getProcedureTokens(record);

    const hasEncounter = procedureTokens.some((c) => encounterSet.has(c));

    const inDenominator = hasL400 && hasEncounter;

    return {
      CPT410: inDenominator ? 1 : 0,
      M410: inDenominator ? 1 : 0,
      N410_MET: 0,
      N410_EXCEPTION: 0,
      N410_NOT_MET: 0,
      QDC410: "",
    };
  });

  return {
    message: "Measure 410 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure410PsoriasisSystemicDenominator,
  measure410: measure410PsoriasisSystemicDenominator,
};
