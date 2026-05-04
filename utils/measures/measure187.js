const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure187StrokeThrombolyticTherapy = async (collection, records) => {
  // CT1 - Stroke denominator encounter codes
  const ct1EncounterCodes = [
    "99221", "99222", "99223", "99231", "99232", "99233",
    "99281", "99282", "99283", "99284", "99285", "99291",
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
    const ct1IcdCodes = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const ct1CptCodes = splitCodes(record.CPT).map((code) => normalizeCode(code));

    const ct1HasStrokeDx = ct1IcdCodes.some((code) => code.startsWith("I63"));
    const ct1HasEncounter = ct1CptCodes.some((code) => ct1EncounterCodes.includes(code));

    // CT2 - Not telehealth eligible (exclude M1426)
    const ct2TelehealthExcluded = hasCode(record, "M1426");

    const ct1DenominatorMet =
      ct1AgeOnEncounterDate >= 18 &&
      ct1HasStrokeDx &&
      ct1HasEncounter &&
      !ct2TelehealthExcluded;

    return {
      ICD187: ct1HasStrokeDx ? 1 : 0,
      CPT187: ct1HasEncounter ? 1 : 0,
      M187: ct1DenominatorMet ? 1 : 0,
      N187_MET: 0,
      N187_EXCEPTION: 0,
      N187_NOT_MET: 0,
      QDC187: "",
    };
  });

  return {
    message: "Measure 187 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure187StrokeThrombolyticTherapy,
  measure187: measure187StrokeThrombolyticTherapy,
};
