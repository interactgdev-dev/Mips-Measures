const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure221FunctionalStatusShoulder = async (collection, records) => {
  // CT1 - Initial evaluation encounter codes (CPT or M-code)
  const ct1EncounterCodes = [
    "97161", "97162", "97163", "97165", "97166", "97167",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "98940", "98941", "98942", "98943",
    "99304", "99305", "99306",
    "M1126", "M1426",
  ];

  // Shoulder diagnosis list in CMS spec is large; this prefix set tracks listed ICD families.
  const ct2ShoulderDxPrefixes = [
    "M05", "M06", "M07", "M08", "M11", "M12", "M13", "M14", "M19", "M21", "M24", "M25",
    "M61", "M62", "M63", "M65", "M66", "M67", "M70", "M71", "M75", "M80", "M84", "M93",
    "M94", "M97",
    "S40", "S42", "S43", "S46", "S47", "S49",
    "Z47", "Z89", "Z96",
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
    const ct2HasShoulderDx = ct2IcdCodes.some((code) => ct2ShoulderDxPrefixes.some((prefix) => code.startsWith(prefix)));

    // CT3 - Excludes specific denominator exclusion markers.
    const ct3HasDegenerativeNeuroExclusion = hasCode(record, "M1127");
    const ct3HasUnableToCompletePromExclusion = hasCode(record, "G9735");

    const ct1DenominatorMet =
      ct1AgeOnInitialEvaluation >= 14 &&
      ct1HasInitialEncounter &&
      ct2HasShoulderDx &&
      !ct3HasDegenerativeNeuroExclusion &&
      !ct3HasUnableToCompletePromExclusion;

    return {
      ICD221: ct2HasShoulderDx ? 1 : 0,
      CPT221: ct1HasInitialEncounter ? 1 : 0,
      M221: ct1DenominatorMet ? 1 : 0,
      N221_MET: 0,
      N221_EXCEPTION: 0,
      N221_NOT_MET: 0,
      QDC221: "",
    };
  });

  return {
    message: "Measure 221 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure221FunctionalStatusShoulder,
  measure221: measure221FunctionalStatusShoulder,
};
