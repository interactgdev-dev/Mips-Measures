const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const cptDenominatorBase2026 = require("./helpers/functionalStatus2026DenominatorCpt");

const icdCodesToCompare219 = require(path.join(__dirname, "data", "measure219LegacyIcd.json"));

/** 2026 MIPS CQM PDF: M1116 + M1426 with shared CPT base. */
const cptCodesToCompare219 = [...cptDenominatorBase2026, "M1116", "M1426"];

/**
 * Same row logic as `processing.js` measure219; CPT denominator per **2026 PDF** (+ M1426, 980xx).
 * `E00219` uses `cpt1Matched219.length` on boolean (legacy quirk → effectively 0).
 */
const measure219FunctionalStatusLowerLegFootAnkle = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const icdCodes219 = (record.ICD || "").split(" ");
    const cptCodes219 = String(record.CPT || "").split(" ");

    const icdMatched219 = icdCodes219.filter(
      (code) => icdCodesToCompare219.includes(code) && record.AGE >= 14
    );

    const cptMatched219 = cptCodes219.filter(
      (code) => cptCodesToCompare219.includes(code) && record.AGE >= 14
    );

    const cpt1Matched219 = cptCodes219.includes("M1011") && record.AGE >= 14;
    const cpt2Matched219 = cptCodes219.includes("M1117") && record.AGE >= 14;
    const cpt3Matched219 = cptCodes219.includes("G9731") && record.AGE >= 14;

    const m219 =
      icdMatched219.length > 0 &&
      cptMatched219.length > 0 &&
      (cpt2Matched219 == false || cpt3Matched219 == false)
        ? 1
        : 0;

    const e00219 =
      icdMatched219.length > 0 &&
      cptMatched219.length > 0 &&
      cpt1Matched219.length > 0 &&
      (cpt2Matched219 == false || cpt3Matched219 == false)
        ? 1
        : 0;

    return {
      ICD219: icdMatched219.length > 0 ? 1 : 0,
      CPT219: cptMatched219.length > 0 ? 1 : 0,
      M219: m219,
      E00219: e00219,
    };
  });

  return {
    message: "Measure 219 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure219FunctionalStatusLowerLegFootAnkle,
  measure219: measure219FunctionalStatusLowerLegFootAnkle,
};
