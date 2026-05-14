const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const icdCodesToCompare221 = require(path.join(__dirname, "data", "measure221LegacyIcd.json"));

const cptCodesToCompare221 = [
  "97161", "97162", "97163", "97165", "97166", "97167",
  "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
  "98940", "98941", "98942", "98943",
  "99304", "99305", "99306",
  "M1126",
];

/**
 * Legacy-aligned: `processing.js` / `processing - Copy.js` measure221 (per-row, CPT-only for modifiers).
 * `E00221` uses `cpt1Matched221.length` on a boolean (legacy quirk → effectively 0).
 */
const measure221FunctionalStatusShoulder = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const icdCodes221 = (record.ICD || "").split(" ");
    const cptCodes221 = String(record.CPT || "").split(" ");

    const icdMatched221 = icdCodes221.filter(
      (code) => icdCodesToCompare221.includes(code) && record.AGE >= 14
    );

    const cptMatched221 = cptCodes221.filter(
      (code) => cptCodesToCompare221.includes(code) && record.AGE >= 14
    );

    const cpt1Matched221 = cptCodes221.includes("M1013") && record.AGE >= 14;
    const cpt2Matched221 = cptCodes221.includes("M1127") && record.AGE >= 14;
    const cpt3Matched221 = cptCodes221.includes("G9735") && record.AGE >= 14;

    const m221 =
      icdMatched221.length > 0 &&
      cptMatched221.length > 0 &&
      (cpt2Matched221 == false || cpt3Matched221 == false)
        ? 1
        : 0;

    const e00221 =
      icdMatched221.length > 0 &&
      cptMatched221.length > 0 &&
      cpt1Matched221.length > 0 &&
      (cpt2Matched221 == false || cpt3Matched221 == false)
        ? 1
        : 0;

    return {
      ICD221: icdMatched221.length > 0 ? 1 : 0,
      CPT221: cptMatched221.length > 0 ? 1 : 0,
      M221: m221,
      E00221: e00221,
    };
  });

  return {
    message: "Measure 221 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure221FunctionalStatusShoulder,
  measure221: measure221FunctionalStatusShoulder,
};
