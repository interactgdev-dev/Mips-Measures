const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure317BloodPressureScreeningFollowup = async (collection, records) => {
  // CT1 - Qualifying denominator encounter value set.
  const ct1EncounterCodes = [
    "90791", "90792",
    "92002", "92004", "92012", "92014",
    "92532", "92534", "92537", "92538", "92540", "92541", "92542", "92544", "92545", "92546",
    "92622", "92625",
    "97802", "97803",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215", "99236",
    "99242", "99243", "99244", "99245",
    "99281", "99282", "99283", "99284", "99285",
    "99304", "99305", "99306", "99307", "99308", "99309", "99310", "99315", "99316",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99385", "99386", "99387", "99395", "99396", "99397",
    "99424", "99491",
    "D3921", "D7111", "D7140", "D7210", "D7220", "D7230", "D7240", "D7241", "D7250", "D7251",
    "G0101", "G0270", "G0402", "G0438", "G0439",
  ];

  // CT2 - Telehealth encounter exclusion code.
  const ct2TelehealthExclusionCode = "M1442";
  // CT3 - Active hypertension denominator exclusion code.
  const ct3HypertensionExclusionCode = "G9744";

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedEncounterCodes = ct1EncounterCodes.map((code) => normalizeCode(code));
  const normalizedTelehealthExclusion = normalizeCode(ct2TelehealthExclusionCode);
  const normalizedHypertensionExclusion = normalizeCode(ct3HypertensionExclusionCode);

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageEligible = Number.isFinite(age) && age >= 18;

    // Check across CPT/HCPCS/CPT1 and modifier-like fields for robust matching.
    const allCodeTokens = [
      ...splitCodes(record.CPT),
      ...splitCodes(record.HCPCS),
      ...splitCodes(record.CPT1),
      ...splitCodes(record.MOD),
      ...splitCodes(record.MOD1),
      ...splitCodes(record.MODIFIER),
      ...splitCodes(record.MODIFIERS),
    ].map((code) => normalizeCode(code));

    const hasEncounter = allCodeTokens.some((code) => normalizedEncounterCodes.includes(code));
    const hasTelehealthExclusion = allCodeTokens.includes(normalizedTelehealthExclusion);
    const hasHypertensionExclusion = allCodeTokens.includes(normalizedHypertensionExclusion);

    // Denominator-only eligibility.
    const denominatorMet = ageEligible && hasEncounter && !hasTelehealthExclusion && !hasHypertensionExclusion;

    return {
      CPT317: hasEncounter ? 1 : 0,
      M317: denominatorMet ? 1 : 0,
      N317_MET: 0,
      N317_EXCEPTION: 0,
      N317_NOT_MET: 0,
      QDC317: "",
    };
  });

  return {
    message: "Measure 317 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure317BloodPressureScreeningFollowup,
  measure317: measure317BloodPressureScreeningFollowup,
};
