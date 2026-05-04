const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure220FunctionalStatusLowBack = async (collection, records) => {
  // CT1 - Initial evaluation encounter codes (CPT or M-code)
  const ct1EncounterCodes = [
    "97161", "97162", "97163", "97165", "97166", "97167",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "98940", "98941", "98942", "98943",
    "99304", "99305", "99306",
    "M1121", "M1426",
  ];

  // Low-back diagnosis list in CMS spec is large; this prefix set tracks listed ICD families.
  const ct2LowBackDxPrefixes = [
    "G54", "G57",
    "M40", "M41", "M42", "M43", "M45", "M46", "M47", "M48", "M49", "M51", "M53", "M54", "M99",
    "Q05", "Q76",
    "S32", "S33", "S39",
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
    const ct2HasLowBackDx = ct2IcdCodes.some((code) => ct2LowBackDxPrefixes.some((prefix) => code.startsWith(prefix)));

    // CT3 - Excludes specific denominator exclusion markers.
    const ct3HasDegenerativeNeuroExclusion = hasCode(record, "M1122");
    const ct3HasUnableToCompletePromExclusion = hasCode(record, "G9733");

    const ct1DenominatorMet =
      ct1AgeOnInitialEvaluation >= 14 &&
      ct1HasInitialEncounter &&
      ct2HasLowBackDx &&
      !ct3HasDegenerativeNeuroExclusion &&
      !ct3HasUnableToCompletePromExclusion;

    return {
      ICD220: ct2HasLowBackDx ? 1 : 0,
      CPT220: ct1HasInitialEncounter ? 1 : 0,
      M220: ct1DenominatorMet ? 1 : 0,
      N220_MET: 0,
      N220_EXCEPTION: 0,
      N220_NOT_MET: 0,
      QDC220: "",
    };
  });

  return {
    message: "Measure 220 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure220FunctionalStatusLowBack,
  measure220: measure220FunctionalStatusLowBack,
};
