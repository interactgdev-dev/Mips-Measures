const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure141POAGReductionIOP = async (collection, records) => {
  // CT1 - Denominator diagnosis and encounter codes
  const poagDiagnosisCodes = [
    "H401111","H401112","H401113","H401114","H401121","H401122","H401123","H401124",
    "H401131","H401132","H401133","H401134","H401211","H401212","H401213","H401214",
    "H401221","H401222","H401223","H401224","H401231","H401232","H401233","H401234",
    "H40151","H40152","H40153",
  ];
  const denominatorEncounterCodes = [
    "92002","92004","92012","92014","99202","99203","99204","99205",
    "99212","99213","99214","99215","99307","99308","99309","99310",
    "99341","99342","99344","99345","99347","99348","99349","99350",
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
    const ct1RecordIcdCodes = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const ct1RecordCptCodes = splitCodes(record.CPT).map((code) => normalizeCode(code));
    const ct1HasPoagDx = ct1RecordIcdCodes.some((code) => poagDiagnosisCodes.includes(code));
    const ct1HasEncounter = ct1RecordCptCodes.some((code) => denominatorEncounterCodes.includes(code));

    // CT2 - Denominator exclusions
    const ct2TelehealthExcluded = hasCode(record, "M1432");
    const ct2Pos12Excluded = String(record.POS || "").trim() === "12";

    const ct1DenominatorMet =
      ct1AgeOnEncounterDate >= 18 &&
      ct1HasPoagDx &&
      ct1HasEncounter &&
      !ct2TelehealthExcluded &&
      !ct2Pos12Excluded;

    return {
      ICD141: ct1DenominatorMet ? 1 : 0,
      CPT141: ct1DenominatorMet ? 1 : 0,
      M141: ct1DenominatorMet ? 1 : 0,
      N141_MET: 0,
      N141_NOT_MET: 0,
      QDC141: "",
    };
  });

  return {
    message: "Measure 141 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure141POAGReductionIOP,
  measure141: measure141POAGReductionIOP,
};
