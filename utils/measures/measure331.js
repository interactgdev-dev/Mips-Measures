const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure331AntibioticForAcuteViralSinusitis = async (collection, records) => {
  // CT1 - Acute sinusitis diagnosis codes.
  const ct1SinusitisIcdCodes = [
    "J01.00", "J01.01", "J01.10", "J01.11", "J01.20", "J01.21", "J01.30",
    "J01.31", "J01.40", "J01.41", "J01.80", "J01.81", "J01.90", "J01.91",
  ];
  // CT2 - Qualifying denominator encounter codes.
  const ct2EncounterCodes = [
    "98002", "98003", "98006", "98007", "98010", "98011", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99281", "99282", "99283", "99284", "99285",
    "99304", "99305", "99306", "99307", "99308", "99309", "99310",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99424", "99491",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedIcdCodes = ct1SinusitisIcdCodes.map((code) => normalizeCode(code));
  const normalizedEncounterCodes = ct2EncounterCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageEligible = Number.isFinite(age) && age >= 18;

    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const encounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));

    const hasAcuteSinusitisDx = icdTokens.some((code) => normalizedIcdCodes.includes(code));
    const hasEncounter = encounterTokens.some((code) => normalizedEncounterCodes.includes(code));
    // Denominator-only eligibility.
    const denominatorMet = ageEligible && hasAcuteSinusitisDx && hasEncounter;

    return {
      ICD331: hasAcuteSinusitisDx ? 1 : 0,
      CPT331: hasEncounter ? 1 : 0,
      M331: denominatorMet ? 1 : 0,
      N331_MET: 0,
      N331_EXCEPTION: 0,
      N331_NOT_MET: 0,
      QDC331: "",
    };
  });

  return {
    message: "Measure 331 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure331AntibioticForAcuteViralSinusitis,
  measure331: measure331AntibioticForAcuteViralSinusitis,
};
