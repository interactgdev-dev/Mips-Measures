const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure226TobaccoUseScreeningCessation = async (collection, records) => {
  // Denominator encounter sets (CPT/HCPCS)
  const ct1TwoVisitEncounterCodes = [
    "90791", "90792", "90832", "90834", "90837", "90845",
    "92002", "92004", "92012", "92014",
    "92521", "92522", "92523", "92524", "92540", "92557",
    "92622", "92625",
    "96156", "96158",
    "97161", "97162", "97163", "97165", "97166", "97167", "97168",
    "97802", "97803", "97804",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "98979", "98980",
    "99024",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99421", "99422", "99423", "99457", "99470",
    "G0270", "G0271", "G2250", "G2251", "G2252",
  ];

  const ct2PreventiveEncounterCodes = [
    "99384", "99385", "99386", "99387",
    "99394", "99395", "99396", "99397",
    "99401", "99402", "99403", "99404", "99411", "99412", "99429",
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
    const ct1IsEligibleAge = ct1Age >= 12;

    const ct1EncounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((code) => normalizeCode(code));
    const ct1TwoVisitMatches = ct1EncounterTokens.filter((code) => ct1TwoVisitEncounterCodes.includes(code)).length;
    const ct1HasTwoVisitPath = ct1TwoVisitMatches >= 2;

    const ct2HasPreventivePath = ct1EncounterTokens.some((code) => ct2PreventiveEncounterCodes.includes(code));

    const ct3HasHospiceExclusion = hasCode(record, "M1159");

    const ct1DenominatorMet =
      ct1IsEligibleAge &&
      (ct1HasTwoVisitPath || ct2HasPreventivePath) &&
      !ct3HasHospiceExclusion;

    return {
      CPT226: ct1HasTwoVisitPath || ct2HasPreventivePath ? 1 : 0,
      M226: ct1DenominatorMet ? 1 : 0,
      N226_MET: 0,
      N226_EXCEPTION: 0,
      N226_NOT_MET: 0,
      QDC226: "",
    };
  });

  return {
    message: "Measure 226 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure226TobaccoUseScreeningCessation,
  measure226: measure226TobaccoUseScreeningCessation,
};
