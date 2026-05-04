const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure219FunctionalStatusLowerLegFootAnkle = async (collection, records) => {
  // CT1 - Initial evaluation encounter codes (CPT or M-code)
  const ct1EncounterCodes = [
    "97161", "97162", "97163", "97165", "97166", "97167",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "98940", "98941", "98942", "98943",
    "99304", "99305", "99306",
    "M1116", "M1426",
  ];

  // Lower leg/foot/ankle diagnosis list in CMS spec is large; this prefix set tracks listed ICD families.
  const ct2LowerLegFootAnkleDxPrefixes = [
    "M13", "M19", "M24", "M25", "M62", "M63", "M66", "M67", "M70", "M72", "M76", "M77", "M79",
    "M84", "M85", "M89", "M94", "M97",
    "Q66",
    "S82", "S86", "S89", "S90", "S92", "S93", "S94", "S96", "S97", "S99",
    "T84", "Z96",
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
    const ct2HasLowerLegFootAnkleDx = ct2IcdCodes.some((code) =>
      ct2LowerLegFootAnkleDxPrefixes.some((prefix) => code.startsWith(prefix))
    );

    // CT3 - Excludes specific denominator exclusion markers.
    const ct3HasDegenerativeNeuroExclusion = hasCode(record, "M1117");
    const ct3HasUnableToCompletePromExclusion = hasCode(record, "G9731");

    const ct1DenominatorMet =
      ct1AgeOnInitialEvaluation >= 14 &&
      ct1HasInitialEncounter &&
      ct2HasLowerLegFootAnkleDx &&
      !ct3HasDegenerativeNeuroExclusion &&
      !ct3HasUnableToCompletePromExclusion;

    return {
      ICD219: ct2HasLowerLegFootAnkleDx ? 1 : 0,
      CPT219: ct1HasInitialEncounter ? 1 : 0,
      M219: ct1DenominatorMet ? 1 : 0,
      N219_MET: 0,
      N219_EXCEPTION: 0,
      N219_NOT_MET: 0,
      QDC219: "",
    };
  });

  return {
    message: "Measure 219 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure219FunctionalStatusLowerLegFootAnkle,
  measure219: measure219FunctionalStatusLowerLegFootAnkle,
};
