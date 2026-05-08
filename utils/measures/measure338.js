const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure338HivViralSuppression = async (collection, records) => {
  // CT1 - HIV diagnosis value set.
  const ct1HivIcdCodes = ["B20", "B97.35", "Z21", "O98.711", "O98.712", "O98.713", "O98.719", "O98.72", "O98.73"];
  // CT2 - Qualifying denominator encounter value set.
  const ct2EncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007",
    "98008", "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "98966", "98967", "98968",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99242", "99244", "99245",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99381", "99382", "99383", "99384", "99385", "99386", "99387",
    "99391", "99392", "99393", "99394", "99395", "99396", "99397",
    "99429", "G0402", "G0438", "G0439",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedIcdCodes = ct1HivIcdCodes.map((code) => normalizeCode(code));
  const normalizedEncounterCodes = ct2EncounterCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const encounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));

    const hasHivDx = icdTokens.some((code) => normalizedIcdCodes.includes(code));
    const hasEncounter = encounterTokens.some((code) => normalizedEncounterCodes.includes(code));
    // Denominator-only eligibility.
    const denominatorMet = hasHivDx && hasEncounter;

    return {
      ICD338: hasHivDx ? 1 : 0,
      CPT338: hasEncounter ? 1 : 0,
      M338: denominatorMet ? 1 : 0,
      N338_MET: 0,
      N338_EXCEPTION: 0,
      N338_NOT_MET: 0,
      QDC338: "",
    };
  });

  return {
    message: "Measure 338 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure338HivViralSuppression,
  measure338: measure338HivViralSuppression,
};
