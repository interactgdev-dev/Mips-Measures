const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure238HighRiskMedicationsOlderAdults = async (collection, records) => {
  const ct1EncounterCodes = [
    "92002", "92004", "92012", "92014",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99221", "99222", "99223", "99231", "99232", "99233", "99238", "99239",
    "99281", "99282", "99283", "99284", "99285",
    "99304", "99305", "99306", "99307", "99308", "99309", "99310", "99315", "99316",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99387", "99397",
    "G0402", "G0438", "G0439",
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
    const ct1IsEligibleAge = ct1Age >= 65;

    const ct1EncounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((code) => normalizeCode(code));
    const ct1HasEncounter = ct1EncounterTokens.some((code) => ct1EncounterCodes.includes(code));

    const ct2HasHospiceExclusion = hasCode(record, "G9741");
    const ct2HasPalliativeExclusion = hasCode(record, "G0034");

    const ct1DenominatorMet =
      ct1IsEligibleAge &&
      ct1HasEncounter &&
      !ct2HasHospiceExclusion &&
      !ct2HasPalliativeExclusion;

    return {
      CPT238: ct1HasEncounter ? 1 : 0,
      M238: ct1DenominatorMet ? 1 : 0,
      N238_MET: 0,
      N238_EXCEPTION: 0,
      N238_NOT_MET: 0,
      QDC238: "",
    };
  });

  return {
    message: "Measure 238 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure238HighRiskMedicationsOlderAdults,
  measure238: measure238HighRiskMedicationsOlderAdults,
};
