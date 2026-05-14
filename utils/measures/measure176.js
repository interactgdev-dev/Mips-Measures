const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure176TuberculosisScreeningBiologicTherapy = async (collection, records) => {
  // CT1 - Denominator encounter codes
  const denominatorEncounterCodes = [
    "98000","98001","98002","98003","98004","98005","98006","98007","98008","98009","98010","98011","98012","98013","98014","98015","98016",
    "99202","99203","99204","99205","99212","99213","99214","99215",
    "99341","99342","99344","99345","99347","99348","99349","99350",
    "99424","99426","G0402","G0468",
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
    const ct1HasFirstTimeBiologicIndicator = hasCode(record, "G2182");
    // Legacy `processing.js` set M176 whenever qualifying encounter + age matched; G2182 was not required for M176.
    const ct1EncounterLine = ct1AgeOnEncounterDate >= 18 && ct1HasEncounter;
    const ct1FullDenominatorPerSpec = ct1EncounterLine && ct1HasFirstTimeBiologicIndicator;

    return {
      CPT176: ct1EncounterLine ? 1 : 0,
      M176: ct1EncounterLine ? 1 : 0,
      E176: ct1FullDenominatorPerSpec ? 1 : 0,
      N176_MET: 0,
      N176_EXCEPTION: 0,
      N176_NOT_MET: 0,
      QDC176: "",
    };
  });

  return {
    message: "Measure 176 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure176TuberculosisScreeningBiologicTherapy,
  measure176: measure176TuberculosisScreeningBiologicTherapy,
};
