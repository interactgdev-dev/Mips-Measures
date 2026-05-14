const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const icdCodesToCompare222 = require(path.join(__dirname, "data", "measure222LegacyIcd.json"));

const cptCodesToCompare222 = [
  "97161", "97162", "97163", "97165", "97166", "97167",
  "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
  "98940", "98941", "98942", "98943",
  "99304", "99305", "99306",
  "M1135",
];

/**
 * Legacy-aligned: `processing.js` / `processing - Copy.js` measure222 (per-row, CPT-only for exclusions).
 * `E0222` uses `cpt1Matched222.length` where `cpt1Matched222` is boolean (legacy quirk → effectively 0).
 */
const measure222FunctionalStatusElbowWristHand = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const icdCodes222 = (record.ICD || "").split(" ");
    const cptCodes222 = String(record.CPT || "").split(" ");

    const icdMatched222 = icdCodes222.filter(
      (code) => icdCodesToCompare222.includes(code) && record.AGE >= 14
    );

    const cptMatched222 = cptCodes222.filter(
      (code) => cptCodesToCompare222.includes(code) && record.AGE >= 14
    );

    const cpt1Matched222 = cptCodes222.includes("M1014") && record.AGE >= 14;
    const cpt2Matched222 = cptCodes222.includes("M1131") && record.AGE >= 14;
    const cpt3Matched222 = cptCodes222.includes("G9737") && record.AGE >= 14;

    const m222 =
      icdMatched222.length > 0 &&
      cptMatched222.length > 0 &&
      (cpt2Matched222 == false || cpt3Matched222 == false)
        ? 1
        : 0;

    const e0222 =
      icdMatched222.length > 0 &&
      cptMatched222.length > 0 &&
      cpt1Matched222.length > 0 &&
      (cpt2Matched222 == false || cpt3Matched222 == false)
        ? 1
        : 0;

    return {
      ICD222: icdMatched222.length > 0 ? 1 : 0,
      CPT222: cptMatched222.length > 0 ? 1 : 0,
      M222: m222,
      E0222: e0222,
    };
  });

  return {
    message: "Measure 222 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure222FunctionalStatusElbowWristHand,
  measure222: measure222FunctionalStatusElbowWristHand,
};
