const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/**
 * MIPS CQM 457 / QID 457 (2026 MIPS CQM): cancer death — hospice stay under 3 days (inverse).
 * Denominator-only (legacy app pattern per measures ≤418): cancer ICD proxy (C* / D37–D49), ≥2 encounters, G9858, G9859.
 * N457_* stay 0; numerator QDC (G9860/G9861) from raw row data outside this processor.
 */
const measure457HospiceLessThanThreeDays = async (collection, records) => {
  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeIcd = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const normalizeToken = (value) => {
    const cleaned = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (/^\d+$/.test(cleaned)) return cleaned.replace(/^0+(?=\d)/, "");
    return cleaned;
  };

  const isCancerDxToken = (code) => {
    if (code.startsWith("C")) return true;
    if (/^D(3[7-9]|4[0-9])/.test(code)) return true;
    return false;
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

  const encounterList = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008", "98009", "98010", "98011",
    "98012", "98013", "98014", "98015", "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
  ];
  const encounterSet = new Set(encounterList.map((c) => normalizeToken(c)));

  await bulkUpdateRecords(collection, records, (record) => {
    const icdTokens = splitCodes(record.ICD || record.icd).map((c) => normalizeIcd(c));
    const codeTokens = collectCodeTokens(record);

    const hasCancerDx = icdTokens.some(isCancerDxToken);
    const encounterHits = codeTokens.filter((t) => encounterSet.has(t)).length;
    const hasTwoEncounters = encounterHits >= 2;
    const hospiceEnrolled = codeTokens.includes("G9858");
    const diedFromCancer = codeTokens.includes("G9859");

    const denominatorMet = hasCancerDx && hasTwoEncounters && hospiceEnrolled && diedFromCancer;

    return {
      ICD457: hasCancerDx ? 1 : 0,
      CPT457: hasTwoEncounters ? 1 : 0,
      E457: denominatorMet ? 0 : 1,
      N457_MET: 0,
      N457_NOT_MET: 0,
      N457_EXCEPTION: 0,
      QDC457: "",
      M457: denominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 457 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure457HospiceLessThanThreeDays,
  measure457: measure457HospiceLessThanThreeDays,
};
