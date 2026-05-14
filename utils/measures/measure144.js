const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/** Legacy logic aligned with utils/processing.js measure144 (explicit ICD list, per-row). */
const icdCodesToCompare144C1 = require(path.join(__dirname, "data", "measure144IcdC1.json"));

const cpt1CodesToCompare144C1 = [
  "98000", "98001", "98002", "98003",
  "98004", "98005", "98006", "98007",
  "99202", "99203", "99204", "99205",
  "99212", "99213", "99214", "99215",
];
const cpt2CodesToCompare144C1 = [
  "50391", "51720", "96401",
  "96405", "96406", "96409", "96413", "96416",
  "96420", "96422", "96425", "96440", "96446",
  "96450", "96521", "96522", "96523",
  "96542", "96549", "G0498",
];
const cpt1CodesToCompare144C2 = ["77427", "77431", "77432", "77435"];

const measure144OncologyPlanOfCareForPain = async (collection, records) => {
  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const icdCodes144C1 = (record.ICD || "").split(" ");
    const cpt1Codes144C1 = String(record.CPT || "").split(" ");
    const cpt2Codes144C1 = String(record.CPT || "").split(" ");
    const cpt1Codes144C2 = String(record.CPT || "").split(" ");

    const icdMatched144C1 = icdCodes144C1.filter((code) => icdCodesToCompare144C1.includes(code));
    const cpt1Matched144C1 = cpt1Codes144C1.filter((code) => cpt1CodesToCompare144C1.includes(code));
    const cpt2Matched144C1 = cpt2Codes144C1.filter((code) => cpt2CodesToCompare144C1.includes(code));

    const icdMatched144C2 = icdCodes144C1.filter((code) => icdCodesToCompare144C1.includes(code));
    const cpt1Matched144C2 = cpt1Codes144C2.filter(
      (code) =>
        cpt1CodesToCompare144C2.includes(code) &&
        (record.MOD !== "GQ" || record.MOD !== "GT") &&
        (record.POS !== 2 || record.POS !== 10)
    );

    const m144 =
      (icdMatched144C1.length > 0 &&
        cpt1Matched144C1.length > 0 &&
        cpt2Matched144C1.length > 0) ||
      (icdMatched144C2.length > 0 && cpt1Matched144C2.length > 0)
        ? 1
        : 0;

    updatesByRecord.set(record, {
      ICD144C1: icdMatched144C1.length > 0 ? 1 : 0,
      CPT144C1: cpt1Matched144C1.length > 0 && cpt2Matched144C1.length > 0 ? 1 : 0,
      ICD144C2: icdMatched144C2.length > 0 ? 1 : 0,
      CPT144C2: cpt1Matched144C2.length > 0 ? 1 : 0,
      M144: m144,
      N144_MET: 0,
      N144_NOT_MET: 0,
      QDC144: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 144 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure144OncologyPlanOfCareForPain,
  measure144: measure144OncologyPlanOfCareForPain,
};
