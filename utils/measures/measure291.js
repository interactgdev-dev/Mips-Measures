const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure291CognitiveAssessmentParkinsons = async (collection, records) => {
  // CT1 - Parkinson's diagnosis value set.
  const ct1ParkinsonsIcdCodes = ["G20.A1", "G20.A2", "G20.B1", "G20.B2", "G20.C"];
  // CT2 - Qualifying denominator encounter value set.
  const ct2EncounterCodes = [
    "90791", "90792", "90839",
    "96105", "96110", "96112", "96116", "96125", "96130", "96132", "96156",
    "97129", "97165", "97166", "97167", "97168",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007",
    "98008", "98009", "98010", "98011", "98012", "98013", "98014", "98015",
    "99202", "99203", "99204", "99205", "99211", "99212", "99213", "99214", "99215",
    "99242", "99243", "99244", "99245",
    "99304", "99305", "99306", "99307", "99308", "99309", "99310",
    "99421", "99422", "99423", "99483",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedIcdCodes = ct1ParkinsonsIcdCodes.map((code) => normalizeCode(code));
  const normalizedEncounterCodes = ct2EncounterCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    // CT1 - Diagnosis check.
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    // CT2 - Encounter check.
    const encounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));

    const ct1HasParkinsonsDx = icdTokens.some((code) => normalizedIcdCodes.includes(code));
    const ct2HasEncounter = encounterTokens.some((code) => normalizedEncounterCodes.includes(code));
    // Denominator-only eligibility.
    const denominatorMet = ct1HasParkinsonsDx && ct2HasEncounter;

    return {
      ICD291: ct1HasParkinsonsDx ? 1 : 0,
      CPT291: ct2HasEncounter ? 1 : 0,
      M291: denominatorMet ? 1 : 0,
      N291_MET: 0,
      N291_EXCEPTION: 0,
      N291_NOT_MET: 0,
      QDC291: "",
    };
  });

  return {
    message: "Measure 291 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure291CognitiveAssessmentParkinsons,
  measure291: measure291CognitiveAssessmentParkinsons,
};
