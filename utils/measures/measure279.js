const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure279SleepApneaTherapyAdherence = async (collection, records) => {
  // CT1 - OSA diagnosis value set.
  const ct1SleepApneaIcdCodes = ["G47.33"];
  // CT2 - Qualifying denominator encounter value set.
  const ct2EncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99211", "99212", "99213", "99214", "99215",
    "99304", "99305", "99306", "99307", "99308", "99309", "99310",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
  ];
  // CT3 - Evidence-based therapy prescribed indicator.
  const ct3TherapyPrescribedCode = "M1227";

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
    // CT3 - Therapy prescribed check.
    const ct3HasTherapyPrescribed = hasCode(record, ct3TherapyPrescribedCode);

    // Denominator-only eligibility.
    const denominatorMet =
      age >= 18 &&
      ct1HasSleepApneaDx &&
      ct2HasEncounter &&
      ct3HasTherapyPrescribed;

    return {
      ICD279: ct1HasSleepApneaDx ? 1 : 0,
      CPT279: ct2HasEncounter ? 1 : 0,
      M279: denominatorMet ? 1 : 0,
      N279_MET: 0,
      N279_EXCEPTION: 0,
      N279_NOT_MET: 0,
      QDC279: "",
    };
  });

  return {
    message: "Measure 279 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure279SleepApneaTherapyAdherence,
  measure279: measure279SleepApneaTherapyAdherence,
};
