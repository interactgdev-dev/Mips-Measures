const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure134DepressionScreening = async (collection, records) => {
  // Denominator encounters: 2026 MIPS CQM #134 (CPT or HCPCS), PDF pages 1–2.
  const denominatorEncounterCodes = new Set([
    "59400", "59425", "59426", "59510", "59610", "59618", "90791", "90792", "90832", "90834", "90837",
    "92622", "92625", "96105", "96110", "96112", "96116", "96125", "96136", "96138", "96156", "96158",
    "97161", "97162", "97163", "97164", "97165", "97166", "97167", "97802", "97803",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "98966", "98967", "98968", "99078", "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99304", "99305", "99306", "99307", "99308", "99309", "99310", "99315", "99316",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99401", "99402", "99403", "99424", "99483", "99484", "99491", "99492", "99493",
    "99384", "99385", "99386", "99387", "99394", "99395", "99396", "99397",
    "G0101", "G0270", "G0271", "G0402", "G0438", "G0439", "G0444",
  ]);
  // Bipolar exclusion (G9717 reference): 2026 F30–F31 list + legacy 296.xx from older `processing.js` extracts.
  const bipolarDiagnosisCodes = new Set([
    "F302", "F303", "F304", "F308", "F309", "F3010", "F3011", "F3012", "F3013",
    "F310", "F3110", "F3111", "F3112", "F3113", "F312", "F3130", "F3131", "F3132",
    "F314", "F315", "F3160", "F3161", "F3162", "F3163", "F3164", "F3170", "F3171",
    "F3172", "F3173", "F3174", "F3175", "F3176", "F3177", "F3178", "F3181", "F3189", "F319",
    "29600", "29601", "29602", "29603", "29604", "29605", "29606", "29610", "29611",
    "29612", "29613", "29614", "29615", "29616", "29640", "29641", "29642", "29643",
    "29644", "29645", "29646", "29650", "29651", "29652", "29653", "29654", "29655",
    "29656", "29660", "29661", "29662", "29663", "29664", "29665", "29666", "2967",
    "29680", "29681", "29682", "29689",
  ]);

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageOk = Number.isFinite(age) && age >= 12;

    // Legacy `processing.js`: CPT134 used CPT column only (not HCPCS).
    const cptTokens = splitCodes(record.CPT).map((c) => normalizeCode(c));
    const cptMatched = ageOk && cptTokens.some((code) => denominatorEncounterCodes.has(code));

    // Full line denominator (legacy): same CPT-only encounter list + age, no G9717 on CPT, no bipolar ICD on row.
    const cptRaw = splitCodes(record.CPT);
    const hasG9717OnCpt = cptRaw.some((c) => normalizeCode(c) === "G9717");
    const icdTokens = splitCodes(record.ICD).map((c) => normalizeCode(c));
    const bipolarOnRow = icdTokens.some((code) => bipolarDiagnosisCodes.has(code));
    const mEligible = cptMatched && !hasG9717OnCpt && !bipolarOnRow;

    return {
      CPT134: cptMatched ? 1 : 0,
      M134: mEligible ? 1 : 0,
      N134_MET: 0,
      N134_EXCEPTION: 0,
      N134_NOT_MET: 0,
      QDC134: "",
    };
  });

  return {
    message: "Measure 134 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure134DepressionScreening,
  measure134: measure134DepressionScreening,
};
