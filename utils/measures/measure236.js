const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure236ControllingHighBloodPressure = async (collection, records) => {
  // Denominator encounter codes (CPT/HCPCS)
  const ct1EncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "98970", "98980",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99385", "99386", "99387", "99395", "99396", "99397",
    "99421", "99422", "99423", "99457", "99470",
    "G0402", "G0438", "G0439", "G2250", "G2251", "G2252",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };

  await bulkUpdateRecords(collection, records, (record) => {
    const ct1Age = Number(record.AGE);
    const ct1IsEligibleAge = ct1Age >= 18 && ct1Age <= 85;

    const ct1EncounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((code) => normalizeCode(code));
    const ct1HasEncounter = ct1EncounterTokens.some((code) => ct1EncounterCodes.includes(code));

    const ct2IcdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const ct2HasHypertensionDx = ct2IcdTokens.includes("I10");

    // Denominator exclusions represented by measure G-codes.
    const ct3HasHospiceExclusion = hasCode(record, "G9740");
    const ct3HasPalliativeExclusion = hasCode(record, "G0031");
    const ct3HasEsrdPregnancyExclusion = hasCode(record, "G9231");
    const ct3HasInstitutionalExclusion = hasCode(record, "G9910");
    const ct3HasFrailtyDementiaExclusion = hasCode(record, "G2115");
    const ct3HasFrailtyAdvancedIllnessExclusion = hasCode(record, "G2116");
    const ct3HasFrailty81PlusExclusion = hasCode(record, "G2118");

    const ct1DenominatorMet =
      ct1IsEligibleAge &&
      ct1HasEncounter &&
      ct2HasHypertensionDx &&
      !ct3HasHospiceExclusion &&
      !ct3HasPalliativeExclusion &&
      !ct3HasEsrdPregnancyExclusion &&
      !ct3HasInstitutionalExclusion &&
      !ct3HasFrailtyDementiaExclusion &&
      !ct3HasFrailtyAdvancedIllnessExclusion &&
      !ct3HasFrailty81PlusExclusion;

    return {
      ICD236: ct2HasHypertensionDx ? 1 : 0,
      CPT236: ct1HasEncounter ? 1 : 0,
      M236: ct1DenominatorMet ? 1 : 0,
      N236_MET: 0,
      N236_EXCEPTION: 0,
      N236_NOT_MET: 0,
      QDC236: "",
    };
  });

  return {
    message: "Measure 236 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure236ControllingHighBloodPressure,
  measure236: measure236ControllingHighBloodPressure,
};
