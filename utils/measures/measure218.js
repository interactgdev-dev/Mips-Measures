const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure218FunctionalStatusHip = async (collection, records) => {
  // CT1 - Initial evaluation encounter codes (CPT or M-code)
  const ct1EncounterCodes = [
    "97161", "97162", "97163", "97165", "97166", "97167",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "98940", "98941", "98942", "98943",
    "99304", "99305", "99306",
    "M1111", "M1426",
  ];

  // Hip diagnosis list in CMS spec is large; these prefixes track the listed hip-related ICD families.
  const ct2HipDxPrefixes = [
    "M12", "M13", "M16", "M21", "M24", "M25", "M66", "M67", "M70", "M71", "M76", "M84", "M93", "M96", "M97",
    "R29",
    "S32", "S39", "S70", "S72", "S73", "S74", "S76", "S79",
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
    const ct2HasHipDx = ct2IcdCodes.some((code) => ct2HipDxPrefixes.some((prefix) => code.startsWith(prefix)));

    // CT3 - Excludes specific denominator exclusion markers.
    const ct3HasDegenerativeNeuroExclusion = hasCode(record, "M1112");
    const ct3HasUnableToCompletePromExclusion = hasCode(record, "G9729");

    const ct1DenominatorMet =
      ct1AgeOnInitialEvaluation >= 14 &&
      ct1HasInitialEncounter &&
      ct2HasHipDx &&
      !ct3HasDegenerativeNeuroExclusion &&
      !ct3HasUnableToCompletePromExclusion;

    return {
      ICD218: ct2HasHipDx ? 1 : 0,
      CPT218: ct1HasInitialEncounter ? 1 : 0,
      M218: ct1DenominatorMet ? 1 : 0,
      N218_MET: 0,
      N218_EXCEPTION: 0,
      N218_NOT_MET: 0,
      QDC218: "",
    };
  });

  return {
    message: "Measure 218 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure218FunctionalStatusHip,
  measure218: measure218FunctionalStatusHip,
};
