const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure277SleepApneaSeverityAssessmentInitialDiagnosis = async (collection, records) => {
  // CT1 - Sleep apnea diagnosis value set.
  const ct1SleepApneaIcdCodes = ["G47.30", "G47.33"];
  // CT2 - Qualifying encounter value set.
  const ct2EncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99211", "99212", "99213", "99214", "99215",
    "99304", "99305", "99306", "99307", "99308", "99309", "99310",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
  ];
  // CT3 - Initial diagnosis/first contact indicator.
  const ct3InitialDiagnosisCode = "M1441";

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };

  const normalizedIcdCodes = ct1SleepApneaIcdCodes.map((code) => normalizeCode(code));
  const normalizedEncounterCodes = ct2EncounterCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    // CT1 - Age and diagnosis checks.
    const age = Number(record.AGE);
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    // CT2 - Encounter check.
    const encounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));

    const ct1HasSleepApneaDx = icdTokens.some((code) => normalizedIcdCodes.includes(code));
    const ct2HasEncounter = encounterTokens.some((code) => normalizedEncounterCodes.includes(code));
    // CT3 - Initial diagnosis marker check.
    const ct3HasInitialDiagnosisIndicator = hasCode(record, ct3InitialDiagnosisCode);

    // Denominator-only eligibility.
    const denominatorMet =
      age >= 18 &&
      ct1HasSleepApneaDx &&
      ct2HasEncounter &&
      ct3HasInitialDiagnosisIndicator;

    return {
      ICD277: ct1HasSleepApneaDx ? 1 : 0,
      CPT277: ct2HasEncounter ? 1 : 0,
      M277: denominatorMet ? 1 : 0,
      N277_MET: 0,
      N277_EXCEPTION: 0,
      N277_NOT_MET: 0,
      QDC277: "",
    };
  });

  return {
    message: "Measure 277 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure277SleepApneaSeverityAssessmentInitialDiagnosis,
  measure277: measure277SleepApneaSeverityAssessmentInitialDiagnosis,
};
