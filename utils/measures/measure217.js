const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure217FunctionalStatusKnee = async (collection, records) => {
  // CT1 - Initial evaluation encounter codes (CPT or M-code)
  const ct1EncounterCodes = [
    "97161", "97162", "97163", "97165", "97166", "97167",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "98940", "98941", "98942", "98943",
    "99304", "99305", "99306",
    "M1106", "M1426",
  ];

  // Knee diagnosis list is very large in CMS spec; this prefix set tracks those listed knee-related ICD families.
  const ct2KneeDxPrefixes = [
    "M13", "M17", "M21", "M22", "M23", "M24", "M25", "M65", "M67", "M70", "M71", "M76", "M94", "M97",
    "S72", "S79", "S80", "S82", "S83", "S84", "S89",
    "T84", "Z47", "Z89", "Z96",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };

  await bulkUpdateRecords(collection, records, (record) => {
    const ct1AgeOnInitialEvaluation = Number(record.AGE);
    const ct1EncounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((code) => normalizeCode(code));
    const ct1HasInitialEncounter = ct1EncounterTokens.some((code) => ct1EncounterCodes.includes(code));

    const ct2IcdCodes = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const ct2HasKneeDx = ct2IcdCodes.some((code) => ct2KneeDxPrefixes.some((prefix) => code.startsWith(prefix)));

    // CT3 - Excludes specific denominator exclusion markers.
    const ct3HasDegenerativeNeuroExclusion = hasCode(record, "M1107");
    const ct3HasUnableToCompletePromExclusion = hasCode(record, "G9727");

    const ct1DenominatorMet =
      ct1AgeOnInitialEvaluation >= 14 &&
      ct1HasInitialEncounter &&
      ct2HasKneeDx &&
      !ct3HasDegenerativeNeuroExclusion &&
      !ct3HasUnableToCompletePromExclusion;

    return {
      ICD217: ct2HasKneeDx ? 1 : 0,
      CPT217: ct1HasInitialEncounter ? 1 : 0,
      M217: ct1DenominatorMet ? 1 : 0,
      N217_MET: 0,
      N217_EXCEPTION: 0,
      N217_NOT_MET: 0,
      QDC217: "",
    };
  });

  return {
    message: "Measure 217 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure217FunctionalStatusKnee,
  measure217: measure217FunctionalStatusKnee,
};
