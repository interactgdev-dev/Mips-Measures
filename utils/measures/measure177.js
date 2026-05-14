const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const icdCodesToCompare177 = require(path.join(__dirname, "data", "measure177LegacyIcd.json"));

const cptCodesToCompare177 = [
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
  "99424",
  "99426",
  "G0402",
  "G0468",
];

/**
 * Legacy-aligned (processing - Copy.js): explicit RA ICD list, per-row, CPT-only,
 * MOD/POS exclusions as in original paragraph.
 */
const measure177RheumatoidArthritisDiseaseActivity = async (collection, records) => {
  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const icdCodes177 = (record.ICD || "").split(" ");
    const cptCodes177 = String(record.CPT || "").split(" ");

    const icdMatched177 = icdCodes177.filter(
      (code) => icdCodesToCompare177.includes(code) && record.AGE >= 18
    );

    const cptMatched177 = cptCodes177.filter(
      (code) =>
        cptCodesToCompare177.includes(code) &&
        record.AGE >= 18 &&
        !["GQ", "GT", "95"].includes(record.MOD) &&
        !["2", "10"].includes(record.POS)
    );

    const m177 = icdMatched177.length > 0 && cptMatched177.length > 0 ? 1 : 0;

    updatesByRecord.set(record, {
      CPT177: cptMatched177.length > 0 ? 1 : 0,
      ICD177: icdMatched177.length > 0 ? 1 : 0,
      M177: m177,
      N177_MET: 0,
      N177_NOT_MET: 0,
      QDC177: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 177 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure177RheumatoidArthritisDiseaseActivity,
  measure177: measure177RheumatoidArthritisDiseaseActivity,
};
