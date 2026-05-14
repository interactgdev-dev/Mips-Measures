const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/**
 * Legacy-aligned: `processing - Copy.js` / `processing.js` measure226 (per-row, CPT-only).
 * Note: hospice flag uses `cpt1CodesToCompare226.includes("M1159")` — list mein M1159 nahi,
 * is liye `cpt3Matched226` hamesha false (purani implementation jaisa).
 */
const measure226TobaccoUseScreeningCessation = async (collection, records) => {
  const cpt1CodesToCompare226 = [
    "90791", "90792", "90832", "90834", "90837", "90845",
    "92002", "92004", "92012", "92014",
    "92521", "92522", "92523", "92524", "92540", "92557",
    "92622", "92625",
    "96156", "96158",
    "97161", "97162", "97163", "97165", "97166", "97167", "97168",
    "97802", "97803", "97804",
    "98980",
    "99024",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99421", "99422", "99423", "99457",
    "G0270", "G0271", "G2250", "G2251", "G2252",
  ];

  const cpt2CodesToCompare226 = [
    "99384", "99385", "99386", "99387",
    "99394", "99395", "99396", "99397",
    "99401", "99402", "99403", "99404", "99411", "99412", "99429",
    "G0438", "G0439",
  ];

  await bulkUpdateRecords(collection, records, (record) => {
    const cpt1Codes226 = String(record.CPT || "").split(" ");
    const cpt2Codes226 = String(record.CPT || "").split(" ");

    const cpt1Matched226 = cpt1Codes226.filter(
      (code) => cpt1CodesToCompare226.includes(code) && record.AGE >= 12
    );

    const cpt2Matched226 = cpt2Codes226.filter(
      (code) => cpt2CodesToCompare226.includes(code) && record.AGE >= 12
    );

    const cpt3Matched226 = cpt1CodesToCompare226.includes("M1159") && record.AGE >= 12;

    const m226 =
      (cpt1Matched226.length > 0 || cpt2Matched226.length > 0) && cpt3Matched226 === false ? 1 : 0;

    const cpt226 = cpt1Matched226.length > 0 || cpt2Matched226.length > 0 ? 1 : 0;

    return {
      CPT226: cpt226,
      M226: m226,
    };
  });

  return {
    message: "Measure 226 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure226TobaccoUseScreeningCessation,
  measure226: measure226TobaccoUseScreeningCessation,
};
