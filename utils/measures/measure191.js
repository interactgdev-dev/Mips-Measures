const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const icdCodesToCompare191 = require(path.join(__dirname, "data", "measure191LegacyIcd.json"));

const cptCodesToCompare191 = [
  "66840",
  "66850",
  "66852",
  "66920",
  "66930",
  "66940",
  "66982",
  "66983",
  "66984",
];

/**
 * Legacy-aligned (processing - Copy.js): denominator = cataract CPT on row, age ≥ 18,
 * no ocular-comorbidity ICD on row; uses same loose MOD/POS OR-chain as original.
 * Sets M191 and M0191 (typo column used by older exports).
 */
const measure191CataractsVisualAcuity = async (collection, records) => {
  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const icdCodes191 = (record.ICD || "").split(" ");
    const cptCodes191 = String(record.CPT || "").split(" ");

    const icdMatched191 = icdCodes191.filter(
      (code) => icdCodesToCompare191.includes(code) && record.AGE >= 18
    );

    const cptMatched191 = cptCodes191.filter(
      (code) =>
        cptCodesToCompare191.includes(code) &&
        record.AGE >= 18 &&
        (record.MOD !== 55 ||
          record.MOD !== 56 ||
          record.MOD !== "GQ" ||
          record.MOD !== "GT" ||
          record.MOD !== 95) &&
        (record.POS !== 2 || record.POS !== 10)
    );

    const m191 = icdMatched191.length === 0 && cptMatched191.length > 0 ? 1 : 0;

    updatesByRecord.set(record, {
      ICD191: icdMatched191.length > 0 ? 1 : 0,
      CPT191: cptMatched191.length > 0 ? 1 : 0,
      M191: m191,
      M0191: m191,
      N191_MET: 0,
      N191_EXCEPTION: 0,
      N191_NOT_MET: 0,
      QDC191: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 191 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure191CataractsVisualAcuity,
  measure191: measure191CataractsVisualAcuity,
};
