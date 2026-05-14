const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const cptDenominatorBase2026 = require("./helpers/functionalStatus2026DenominatorCpt");

const icdCodesToCompare218 = require(path.join(__dirname, "data", "measure218LegacyIcd.json"));

/** 2026 MIPS CQM PDF: M1111 (hip initial eval), not M1106. Plus M1426 per PDF. */
const cptCodesToCompare218 = [...cptDenominatorBase2026, "M1111", "M1426"];

/**
 * Same row logic as `processing.js` measure218; CPT list per **2026 PDF** (M1111 + 980xx + M1426).
 * `E00218` uses `cpt1Matched218.length` on boolean (legacy quirk → effectively 0).
 */
const measure218FunctionalStatusHip = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const icdCodes218 = (record.ICD || "").split(" ");
    const cptCodes218 = String(record.CPT || "").split(" ");

    const icdMatched218 = icdCodes218.filter(
      (code) => icdCodesToCompare218.includes(code) && record.AGE >= 14
    );

    const cptMatched218 = cptCodes218.filter(
      (code) => cptCodesToCompare218.includes(code) && record.AGE >= 14
    );

    const cpt1Matched218 = cptCodes218.includes("M1010") && record.AGE >= 14;
    const cpt2Matched218 = cptCodes218.includes("M1112") && record.AGE >= 14;
    const cpt3Matched218 = cptCodes218.includes("G9729") && record.AGE >= 14;

    const m218 =
      icdMatched218.length > 0 &&
      cptMatched218.length > 0 &&
      (cpt2Matched218 == false || cpt3Matched218 == false)
        ? 1
        : 0;

    const e00218 =
      icdMatched218.length > 0 &&
      cptMatched218.length > 0 &&
      cpt1Matched218.length > 0 &&
      (cpt2Matched218 == false || cpt3Matched218 == false)
        ? 1
        : 0;

    return {
      ICD218: icdMatched218.length > 0 ? 1 : 0,
      CPT218: cptMatched218.length > 0 ? 1 : 0,
      M218: m218,
      E00218: e00218,
    };
  });

  return {
    message: "Measure 218 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure218FunctionalStatusHip,
  measure218: measure218FunctionalStatusHip,
};
