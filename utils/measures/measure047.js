const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/**
 * Measure 047 — legacy app behavior (matches manual checks against the old
 * processing.js / processing - Copy.js paragraph): per-row denominator,
 * encounter CPT list as before, G9692 read from CPT only, CPT47 vs M047 split.
 */
const measure047 = async (collection, records) => {
  const cptCodesToCompare47 = [
    "90791",
    "90832",
    "90834",
    "90837",
    "90845",
    "90846",
    "90847",
    "99202",
    "99203",
    "99204",
    "99205",
    "99212",
    "99213",
    "99214",
    "99215",
    "99221",
    "99222",
    "99223",
    "99231",
    "99232",
    "99233",
    "99234",
    "99235",
    "99236",
    "99291",
    "99304",
    "99305",
    "99306",
    "99307",
    "99308",
    "99309",
    "99310",
    "99341",
    "99342",
    "99344",
    "99345",
    "99347",
    "99348",
    "99349",
    "99350",
    "G0402",
    "G0438",
    "G0439",
  ];

  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const cptCodes47 = String(record.CPT || "").split(" ");

    const cptMatched47 = cptCodes47.filter(
      (code) =>
        cptCodesToCompare47.includes(code) &&
        record.AGE >= 65 &&
        record.POS !== 23
    );

    const cpt1Matched47 = cptCodes47.includes("G9692") && record.AGE >= 65;

    const m47 = cptMatched47.length > 0 && cpt1Matched47 === false ? 1 : 0;
    const cpt47 = cptMatched47.length > 0 ? 1 : 0;

    updatesByRecord.set(record, {
      CPT47: cpt47,
      M047: m47,
      N047_MET: 0,
      N047_NOT_MET: 0,
      QDC047: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 47 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure047,
  measure47: measure047,
};
