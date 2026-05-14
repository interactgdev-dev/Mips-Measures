const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure178RheumatoidArthritisFunctionalStatus = async (collection, records) => {
  // CT1 - Denominator encounter codes (2026 MIPS CQM spec — same family as measure 176)
  const ct1EncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007",
    "98008", "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99424", "99426", "G0402", "G0468",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasRheumatoidArthritisDx = (record) => {
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    return icdTokens.some((code) => code.startsWith("M05") || code.startsWith("M06"));
  };

  await bulkUpdateRecords(collection, records, (record) => {
    const ct1AgeOnEncounterDate = Number(record.AGE);
    const ct1RecordEncounterCodes = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((code) =>
      normalizeCode(code)
    );
    const ct1HasEncounter = ct1RecordEncounterCodes.some((code) => ct1EncounterCodes.includes(code));
    const ct1HasRaDx = hasRheumatoidArthritisDx(record);
    // Row-level denominator like legacy `processing.js`: RA dx + qualifying encounter + age,
    // without requiring MIPS QDC M1375 (rarely present in flat extracts).
    const ct1DenominatorMet = ct1AgeOnEncounterDate >= 18 && ct1HasRaDx && ct1HasEncounter;

    return {
      ICD178: ct1DenominatorMet ? 1 : 0,
      CPT178: ct1DenominatorMet ? 1 : 0,
      M178: ct1DenominatorMet ? 1 : 0,
      N178_MET: 0,
      N178_NOT_MET: 0,
      QDC178: "",
    };
  });

  return {
    message: "Measure 178 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure178RheumatoidArthritisFunctionalStatus,
  measure178: measure178RheumatoidArthritisFunctionalStatus,
};
