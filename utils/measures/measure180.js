const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const icdCodesToCompare180 = require(path.join(__dirname, "data", "measure180LegacyIcd.json"));

const cptCodesToCompare180 = [
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

/** Legacy-aligned (processing - Copy.js): explicit ICD list, per-row, no MOD/POS filter on CPT. */
const measure180RheumatoidArthritisGlucocorticoidManagement = async (collection, records) => {
  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const icdCodes180 = (record.ICD || "").split(" ");
    const cptCodes180 = String(record.CPT || "").split(" ");

    const icdMatched180 = icdCodes180.filter(
      (code) => icdCodesToCompare180.includes(code) && record.AGE >= 18
    );

    const cptMatched180 = cptCodes180.filter(
      (code) => cptCodesToCompare180.includes(code) && record.AGE >= 18
    );

    const m180 = icdMatched180.length > 0 && cptMatched180.length > 0 ? 1 : 0;

    updatesByRecord.set(record, {
      CPT180: cptMatched180.length > 0 ? 1 : 0,
      ICD180: icdMatched180.length > 0 ? 1 : 0,
      M180: m180,
      N180_MET: 0,
      N180_EXCEPTION: 0,
      N180_NOT_MET: 0,
      QDC180: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 180 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure180RheumatoidArthritisGlucocorticoidManagement,
  measure180: measure180RheumatoidArthritisGlucocorticoidManagement,
};
