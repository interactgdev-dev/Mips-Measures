const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure155FallsPlanOfCare = async (collection, records) => {
  // CT1 - Denominator encounter codes
  const denominatorEncounterCodes = [
    "92540","92541","92542","92548",
    "97161","97162","97163","97164","97165","97166","97167","97168",
    "98000","98001","98002","98003","98004","98005","98006","98007","98008","98009","98010","98011","98012","98013","98014","98015","98016",
    "99202","99203","99204","99205","99211","99212","99213","99214","99215",
    "99304","99305","99306","99307","99308","99309","99310",
    "99341","99342","99344","99345","99347","99348","99349","99350",
    "G0402","G0438","G0439",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };

  await bulkUpdateRecords(collection, records, (record) => {
    const ct1AgeOnEncounterDate = Number(record.AGE);
    const ct1RecordEncounterCodes = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((code) => normalizeCode(code));
    const ct1HasEncounter = ct1RecordEncounterCodes.some((code) => denominatorEncounterCodes.includes(code));
    const ct1HasFallRiskScreen = hasCode(record, "1100F");

    // CT2 - Denominator exclusion
    const ct2HospiceExcluded = hasCode(record, "G9720");
    const ct1DenominatorMet =
      ct1AgeOnEncounterDate >= 65 &&
      ct1HasEncounter &&
      ct1HasFallRiskScreen &&
      !ct2HospiceExcluded;

    return {
      CPT155_1: ct1AgeOnEncounterDate >= 65 && ct1HasEncounter ? 1 : 0,
      CPT155_2: ct1AgeOnEncounterDate >= 65 && ct1HasFallRiskScreen ? 1 : 0,
      M155: ct1DenominatorMet ? 1 : 0,
      E155: ct1DenominatorMet ? 1 : 0,
      N155_MET: 0,
      N155_EXCEPTION: 0,
      N155_NOT_MET: 0,
      QDC155: "",
    };
  });

  return {
    message: "Measure 155 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure155FallsPlanOfCare,
  measure155: measure155FallsPlanOfCare,
};
