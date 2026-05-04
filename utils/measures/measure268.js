const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure268EpilepsyCounselingWomenChildbearingPotential = async (collection, records) => {
  // CT1 - Epilepsy diagnosis value set.
  const ct1EpilepsyIcdCodes = [
    "G40.001", "G40.009", "G40.011", "G40.019", "G40.101", "G40.109", "G40.111", "G40.119",
    "G40.201", "G40.209", "G40.211", "G40.219", "G40.301", "G40.309", "G40.311", "G40.319",
    "G40.401", "G40.409", "G40.411", "G40.419", "G40.501", "G40.509", "G40.801", "G40.802",
    "G40.803", "G40.804", "G40.811", "G40.812", "G40.813", "G40.814", "G40.821", "G40.822",
    "G40.823", "G40.824", "G40.841", "G40.842", "G40.843", "G40.844", "G40.901", "G40.909",
    "G40.911", "G40.919", "G40.A01", "G40.A09", "G40.A11", "G40.A19", "G40.B01", "G40.B09",
    "G40.B11", "G40.B19", "G40.C01", "G40.C09", "G40.C11", "G40.C19",
  ];
  // CT2 - Denominator encounter value set.
  const ct2EncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007",
    "98008", "98009", "98010", "98011", "98012", "98013", "98014", "98015",
    "99202", "99203", "99204", "99205", "99211", "99212", "99213", "99214", "99215",
    "99242", "99243", "99244", "99245",
    "99421", "99422", "99423",
  ];
  // CT3 - Exclusion for patients unable to bear children.
  const ct3ExclusionCode = "M1016";

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };
  const isFemale = (record) => {
    const genderRaw = String(record.GEN || record.GENDER || record.SEX || "").trim().toUpperCase();
    return genderRaw === "F" || genderRaw === "FEMALE";
  };

  const normalizedIcdCodes = ct1EpilepsyIcdCodes.map((code) => normalizeCode(code));
  const normalizedEncounterCodes = ct2EncounterCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    // CT1 - Demographic and diagnosis checks.
    const age = Number(record.AGE);
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    // CT2 - Encounter check across coding fields.
    const encounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));

    const ct1HasEpilepsyDx = icdTokens.some((code) => normalizedIcdCodes.includes(code));
    const ct2HasEncounter = encounterTokens.some((code) => normalizedEncounterCodes.includes(code));
    // CT3 - Exclusion check.
    const ct3HasExclusion = hasCode(record, ct3ExclusionCode);

    // Denominator-only eligibility.
    const denominatorMet =
      age >= 12 &&
      isFemale(record) &&
      ct1HasEpilepsyDx &&
      ct2HasEncounter &&
      !ct3HasExclusion;

    return {
      ICD268: ct1HasEpilepsyDx ? 1 : 0,
      CPT268: ct2HasEncounter ? 1 : 0,
      M268: denominatorMet ? 1 : 0,
      N268_MET: 0,
      N268_EXCEPTION: 0,
      N268_NOT_MET: 0,
      QDC268: "",
    };
  });

  return {
    message: "Measure 268 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure268EpilepsyCounselingWomenChildbearingPotential,
  measure268: measure268EpilepsyCounselingWomenChildbearingPotential,
};
