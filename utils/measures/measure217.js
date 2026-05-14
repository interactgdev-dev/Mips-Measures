const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const cptDenominatorBase2026 = require("./helpers/functionalStatus2026DenominatorCpt");

const icdCodesToCompare217 = require(path.join(__dirname, "data", "measure217LegacyIcd.json"));

/** 2026 MIPS CQM PDF denominator encounter: base CPTs + M1106 + M1426. ICD list from CMS export (dotless). */
const cptCodesToCompare217 = [...cptDenominatorBase2026, "M1106", "M1426"];

/**
 * Denominator logic aligned with `processing.js` (per-row, CPT-only modifiers).
 * CPT encounter list updated to **2026 measure PDF** (adds 980xx + M1426).
 * `E00217` uses `cpt1Matched217.length` on boolean (legacy quirk → effectively 0).
 */
const measure217FunctionalStatusKnee = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const icdCodes217 = (record.ICD || "").split(" ");
    const cptCodes217 = String(record.CPT || "").split(" ");

    const icdMatched217 = icdCodes217.filter(
      (code) => icdCodesToCompare217.includes(code) && record.AGE >= 14
    );

    const cptMatched217 = cptCodes217.filter(
      (code) => cptCodesToCompare217.includes(code) && record.AGE >= 14
    );

    const cpt1Matched217 = cptCodes217.includes("M1009") && record.AGE >= 14;
    const cpt2Matched217 = cptCodes217.includes("M1107") && record.AGE >= 14;
    const cpt3Matched217 = cptCodes217.includes("G9727") && record.AGE >= 14;

    const m217 =
      icdMatched217.length > 0 &&
      cptMatched217.length > 0 &&
      (cpt2Matched217 == false || cpt3Matched217 == false)
        ? 1
        : 0;

    const e00217 =
      icdMatched217.length > 0 &&
      cptMatched217.length > 0 &&
      cpt1Matched217.length > 0 &&
      (cpt2Matched217 == false || cpt3Matched217 == false)
        ? 1
        : 0;

    return {
      ICD217: icdMatched217.length > 0 ? 1 : 0,
      CPT217: cptMatched217.length > 0 ? 1 : 0,
      M217: m217,
      E00217: e00217,
    };
  });

  return {
    message: "Measure 217 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure217FunctionalStatusKnee,
  measure217: measure217FunctionalStatusKnee,
};
