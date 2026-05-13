const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/** 2026 MIPS CQM 470 — primary total knee replacement CPT (PDF denominator). */
const MEASURE470_TKR_CPTS = ["27445", "27446", "27447"];

/**
 * MIPS CQM 470 / QID 470 (2026): Functional status after primary total knee replacement (PRO).
 * Denominator: age ≥18, CPT 27445/27446/27447 during performance period (PDF).
 * N470_* stay 0; numerator (M1045/M1046/M1141) from raw row / registry outside this processor.
 */
const measure470FunctionalStatusAfterPrimaryTkr = async (collection, records) => {
  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeToken = (value) => {
    const cleaned = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (/^\d+$/.test(cleaned)) return cleaned.replace(/^0+(?=\d)/, "");
    return cleaned;
  };

  const collectCodeTokens = (record) =>
    [
      ...splitCodes(record.CPT || record.cpt),
      ...splitCodes(record.HCPCS || record.hcpcs),
      ...splitCodes(record.CPT1 || record.cpt1),
      ...splitCodes(record.CPT2 || record.cpt2),
      ...splitCodes(record.QDC || record.qdc),
      ...splitCodes(record.MOD || record.mod),
      ...splitCodes(record.MOD1 || record.mod1),
      ...splitCodes(record.MODIFIER || record.modifier),
      ...splitCodes(record.MODIFIERS || record.modifiers),
    ].map((code) => normalizeToken(code));

  const tkrSet = new Set(MEASURE470_TKR_CPTS.map((c) => normalizeToken(c)));

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageOk = Number.isFinite(age) && age >= 18;
    const codeTokens = collectCodeTokens(record);

    const hasTkrCpt = codeTokens.some((t) => tkrSet.has(t));
    const denominatorMet = ageOk && hasTkrCpt;

    return {
      CPT470: hasTkrCpt ? 1 : 0,
      E470: denominatorMet ? 0 : 1,
      N470_MET: 0,
      N470_EXCEPTION: 0,
      N470_NOT_MET: 0,
      QDC470: "",
      M470: denominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 470 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure470FunctionalStatusAfterPrimaryTkr,
  measure470: measure470FunctionalStatusAfterPrimaryTkr,
};
