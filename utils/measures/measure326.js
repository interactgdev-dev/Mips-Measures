const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure326AtrialFibChronicAnticoagulation = async (collection, records) => {
  // CT1 - AF / atrial flutter diagnosis value set.
  const ct1DiagnosisCodes = ["I48.0", "I48.3", "I48.4", "I48.11", "I48.19", "I48.20", "I48.21", "I48.91", "I48.92"];
  // CT2 - Qualifying denominator encounters.
  const ct2EncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007",
    "98008", "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99242", "99243", "99244", "99245",
    "99315", "99316", "99304", "99305", "99306", "99307", "99308", "99309", "99310",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99424", "99426",
  ];
  // CT3 - Denominator exclusions.
  const ct3ExclusionCodes = ["G9929", "G9930", "G9931", "G0044", "G0043"];

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedDiagnosisCodes = ct1DiagnosisCodes.map((code) => normalizeCode(code));
  const normalizedEncounterCodes = ct2EncounterCodes.map((code) => normalizeCode(code));
  const normalizedExclusionCodes = ct3ExclusionCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageEligible = Number.isFinite(age) && age >= 18;

    const diagnosisTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const encounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));
    const allTokens = [...diagnosisTokens, ...encounterTokens];

    const hasAtrialFibDx = diagnosisTokens.some((code) => normalizedDiagnosisCodes.includes(code));
    const hasEncounter = encounterTokens.some((code) => normalizedEncounterCodes.includes(code));
    const hasDenominatorExclusion = allTokens.some((code) => normalizedExclusionCodes.includes(code));

    // Denominator-only eligibility.
    const denominatorMet = ageEligible && hasAtrialFibDx && hasEncounter && !hasDenominatorExclusion;

    return {
      ICD326: hasAtrialFibDx ? 1 : 0,
      CPT326: hasEncounter ? 1 : 0,
      M326: denominatorMet ? 1 : 0,
      N326_MET: 0,
      N326_EXCEPTION: 0,
      N326_NOT_MET: 0,
      QDC326: "",
    };
  });

  return {
    message: "Measure 326 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure326AtrialFibChronicAnticoagulation,
  measure326: measure326AtrialFibChronicAnticoagulation,
};
