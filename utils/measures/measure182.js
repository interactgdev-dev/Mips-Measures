const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure182FunctionalOutcomeAssessment = async (collection, records) => {
  // CT1 - Denominator encounter codes
  const ct1EncounterCodes = [
    "92540", "92541", "92542", "92544", "92546", "92548", "92549",
    "92605", "92607", "92610", "92611", "92612", "92614", "92616",
    "96125", "92622", "92626", "97129", "97161", "97162", "97163", "97164",
    "97165", "97166", "97167", "97168",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "98940", "98941", "98942", "98943",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  await bulkUpdateRecords(collection, records, (record) => {
    const ct1AgeOnEncounterDate = Number(record.AGE);
    const ct1RecordEncounterCodes = splitCodes(record.CPT).map((code) => normalizeCode(code));
    const ct1HasEncounter = ct1RecordEncounterCodes.some((code) => ct1EncounterCodes.includes(code));
    const ct1DenominatorMet = ct1AgeOnEncounterDate >= 18 && ct1HasEncounter;

    return {
      CPT182: ct1DenominatorMet ? 1 : 0,
      M182: ct1DenominatorMet ? 1 : 0,
      N182_MET: 0,
      N182_EXCEPTION: 0,
      N182_NOT_MET: 0,
      QDC182: "",
    };
  });

  return {
    message: "Measure 182 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure182FunctionalOutcomeAssessment,
  measure182: measure182FunctionalOutcomeAssessment,
};
