const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getIcdTokens,
  getProcedureTokens,
  getNumericAge,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/** Atopic dermatitis ICD-10-CM (legacy processing.js). */
const ATOPIC_ICD = ["L400", "L401", "L402", "L403", "L404", "L408", "L409"];

const ENCOUNTER_485 = [
  "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008", "98009", "98010", "98011", "98012",
  "98013", "98014", "98015", "98016", "99202", "99203", "99204", "99205", "99211", "99212", "99213", "99214", "99215",
  "99242", "99243", "99244", "99245",
];

const icd485Set = new Set(ATOPIC_ICD.map((c) => normalizeCode(c)));
const encounter485Set = new Set(ENCOUNTER_485.map((c) => normalizeCode(c)));

/**
 * MIPS CQM 485 (2026): Atopic dermatitis — appropriate therapy (denominator proxy).
 * Age ≥8, qualifying ICD + encounter codes on row (flat file; full episode rules not applied).
 */
const measure485AtopicDermatitisAppropriateTherapy = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 8;

    const icdTokens = getIcdTokens(record);
    const proc = getProcedureTokens(record);

    const hasIcd = icdTokens.some((t) => icd485Set.has(t));
    const hasEnc = proc.some((t) => encounter485Set.has(t));

    const inDenominator = ageOk && hasIcd && hasEnc;

    return {
      ICD485: hasIcd ? 1 : 0,
      CPT485: hasEnc ? 1 : 0,
      M485: inDenominator ? 1 : 0,
      N485_MET: 0,
      N485_EXCEPTION: 0,
      N485_NOT_MET: 0,
      QDC485: "",
    };
  });

  return {
    message: "Measure 485 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure485AtopicDermatitisAppropriateTherapy,
  measure485: measure485AtopicDermatitisAppropriateTherapy,
};
