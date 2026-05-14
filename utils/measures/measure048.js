const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/**
 * Measure 048 — legacy app behavior (aligned with processing - Copy.js):
 * per-row denominator, encounter list without 980xx, G9693 from CPT only,
 * CPT48 vs M048 split, GEN === "F" (strict, same as old paragraph).
 */
const measure048 = async (collection, records) => {
  const cptCodesToCompare48 = [
    "97161",
    "97162",
    "97163",
    "97164",
    "97165",
    "97166",
    "97167",
    "97168",
    "99202",
    "99203",
    "99204",
    "99205",
    "99212",
    "99213",
    "99214",
    "99215",
    "99341",
    "99342",
    "99344",
    "99345",
    "99347",
    "99348",
    "99349",
    "99350",
    "G0402",
  ];

  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const cptCodes48 = String(record.CPT || "").split(" ");

    const cptMatched48 = cptCodes48.filter(
      (code) =>
        cptCodesToCompare48.includes(code) &&
        record.AGE >= 65 &&
        record.GEN === "F"
    );

    const cpt1Matched48 =
      cptCodes48.includes("G9693") && record.AGE >= 65 && record.GEN === "F";

    const m48 = cptMatched48.length > 0 && cpt1Matched48 === false ? 1 : 0;
    const cpt48 = cptMatched48.length > 0 ? 1 : 0;

    updatesByRecord.set(record, {
      CPT48: cpt48,
      M048: m48,
      N048_MET: 0,
      N048_NOT_MET: 0,
      QDC048: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 48 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure048,
  measure48: measure048,
};
