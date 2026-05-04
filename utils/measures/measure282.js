const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure282DementiaFunctionalStatusAssessment = async (collection, records) => {
  // CT1 - Dementia diagnosis value set.
  const ct1DementiaIcdCodes = [
    "A52.17", "A81.00", "A81.01", "A81.89",
    "F01.50", "F01.511", "F01.518", "F01.52", "F01.53", "F01.54",
    "F01.A0", "F01.A11", "F01.A18", "F01.A2", "F01.A3", "F01.A4",
    "F01.B0", "F01.B11", "F01.B18", "F01.B2", "F01.B3", "F01.B4",
    "F01.C0", "F01.C11", "F01.C18", "F01.C2", "F01.C3", "F01.C4",
    "F02.80", "F02.811", "F02.818", "F02.82", "F02.83", "F02.84",
    "F02.A0", "F02.A11", "F02.A18", "F02.A2", "F02.A3", "F02.A4",
    "F02.B0", "F02.B11", "F02.B18", "F02.B2", "F02.B3", "F02.B4",
    "F02.C0", "F02.C11", "F02.C18", "F02.C2", "F02.C3", "F02.C4",
    "F03.90", "F03.911", "F03.918", "F03.92", "F03.93", "F03.94",
    "F03.A0", "F03.A11", "F03.A18", "F03.A2", "F03.A3", "F03.A4",
    "F03.B0", "F03.B11", "F03.B18", "F03.B2", "F03.B3", "F03.B4",
    "F03.C0", "F03.C11", "F03.C18", "F03.C2", "F03.C3", "F03.C4",
    "F10.27",
    "G30.0", "G30.1", "G30.8", "G30.9",
    "G31.01", "G31.09", "G31.83", "G31.85", "G31.89",
    "G94",
  ];

  // CT2 - Qualifying denominator encounter value set.
  const ct2EncounterCodes = [
    "78811", "78814", "90791", "90792", "90832", "90834", "90837",
    "92522", "92523", "92610", "92611", "92612", "92616",
    "96105", "96112", "96116", "96125", "96130", "96132", "96136", "96138", "96146",
    "96156", "96158", "96164", "96167", "96170",
    "97161", "97162", "97163", "97164", "97165", "97166", "97167", "97168",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015",
    "99202", "99203", "99204", "99205", "99211", "99212", "99213", "99214", "99215",
    "99221", "99222", "99223", "99231", "99232", "99233", "99238", "99239",
    "99242", "99243", "99244", "99245", "99252", "99253", "99254", "99255",
    "99304", "99305", "99306", "99307", "99308", "99309", "99310",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99424", "99426", "99487", "99490", "99491", "99497",
    "A9586", "A9601", "Q9982", "Q9983",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedIcdCodes = ct1DementiaIcdCodes.map((code) => normalizeCode(code));
  const normalizedEncounterCodes = ct2EncounterCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    // CT1 - Diagnosis check.
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    // CT2 - Encounter check.
    const encounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));

    const ct1HasDementiaDx = icdTokens.some((code) => normalizedIcdCodes.includes(code));
    const ct2HasEncounter = encounterTokens.some((code) => normalizedEncounterCodes.includes(code));

    // Denominator-only eligibility.
    const denominatorMet = ct1HasDementiaDx && ct2HasEncounter;

    return {
      ICD282: ct1HasDementiaDx ? 1 : 0,
      CPT282: ct2HasEncounter ? 1 : 0,
      M282: denominatorMet ? 1 : 0,
      N282_MET: 0,
      N282_EXCEPTION: 0,
      N282_NOT_MET: 0,
      QDC282: "",
    };
  });

  return {
    message: "Measure 282 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure282DementiaFunctionalStatusAssessment,
  measure282: measure282DementiaFunctionalStatusAssessment,
};
