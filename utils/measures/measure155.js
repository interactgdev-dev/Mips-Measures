const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/**
 * Legacy-aligned (processing - Copy.js): CPT-only encounter list without 980xx;
 * M155 = encounter + age 65+ and NOT G9720 on same CPT split (1100F not required for M155).
 */
const measure155FallsPlanOfCare = async (collection, records) => {
  const cptCodes1ToCompare155 = [
    "92540",
    "92541",
    "92542",
    "92548",
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
    "99211",
    "99212",
    "99213",
    "99214",
    "99215",
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
    const cpt1Codes155 = String(record.CPT || "").split(" ");

    const cpt1Matched155 = cpt1Codes155.filter(
      (code) => cptCodes1ToCompare155.includes(code) && record.AGE >= 65
    );

    const cpt2Matched155 = cpt1Codes155.includes("1100F") && record.AGE >= 65;
    const cpt3Matched155 = cpt1Codes155.includes("G9720") && record.AGE >= 65;

    const m155 = cpt1Matched155.length > 0 && cpt3Matched155 === false ? 1 : 0;

    // Same expression as legacy processing - Copy.js (cpt2Matched155 is boolean; .length is undefined).
    const e155 =
      cpt1Matched155.length > 0 &&
      cpt2Matched155.length > 0 &&
      cpt3Matched155 === false
        ? 1
        : 0;

    updatesByRecord.set(record, {
      CPT155_1: cpt1Matched155.length > 0 ? 1 : 0,
      CPT155_2: cpt2Matched155 ? 1 : 0,
      M155: m155,
      E155: e155,
      N155_MET: 0,
      N155_EXCEPTION: 0,
      N155_NOT_MET: 0,
      QDC155: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 155 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure155FallsPlanOfCare,
  measure155: measure155FallsPlanOfCare,
};
