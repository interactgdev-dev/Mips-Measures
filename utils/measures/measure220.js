const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const cptDenominatorBase2026 = require("./helpers/functionalStatus2026DenominatorCpt");

const icdCodesToCompare220 = require(path.join(__dirname, "data", "measure220LegacyIcd.json"));

/** 2026 MIPS CQM PDF: M1121 + M1426 with shared CPT base. */
const cptCodesToCompare220 = [...cptDenominatorBase2026, "M1121", "M1426"];

/**
 * Row logic aligned with `processing.js` measure220; CPT denominator per **2026 PDF**.
 * ICD list from CMS processing export (dotless tokens; match `ICD` field split).
 * `E00220` uses `cpt1Matched220.length` on boolean (legacy quirk → effectively 0).
 */
const measure220FunctionalStatusLowBack = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const icdCodes220 = (record.ICD || "").split(" ");
    const cptCodes220 = String(record.CPT || "").split(" ");

    const icdMatched220 = icdCodes220.filter(
      (code) => icdCodesToCompare220.includes(code) && record.AGE >= 14
    );

    const cptMatched220 = cptCodes220.filter(
      (code) => cptCodesToCompare220.includes(code) && record.AGE >= 14
    );

    const cpt1Matched220 = cptCodes220.includes("M1012") && record.AGE >= 14;
    const cpt2Matched220 = cptCodes220.includes("M1122") && record.AGE >= 14;
    const cpt3Matched220 = cptCodes220.includes("G9733") && record.AGE >= 14;

    const m220 =
      icdMatched220.length > 0 &&
      cptMatched220.length > 0 &&
      (cpt2Matched220 == false || cpt3Matched220 == false)
        ? 1
        : 0;

    const e00220 =
      icdMatched220.length > 0 &&
      cptMatched220.length > 0 &&
      cpt1Matched220.length > 0 &&
      (cpt2Matched220 == false || cpt3Matched220 == false)
        ? 1
        : 0;

    return {
      ICD220: icdMatched220.length > 0 ? 1 : 0,
      CPT220: cptMatched220.length > 0 ? 1 : 0,
      M220: m220,
      E00220: e00220,
    };
  });

  return {
    message: "Measure 220 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure220FunctionalStatusLowBack,
  measure220: measure220FunctionalStatusLowBack,
};
