const bulkUpdateRecords = require("./bulkUpdateRecords");

/**
 * Legacy row logic from utils/processing.js measure282 / measure286:
 * ICD and qualifying CPT on the same row; space-split ICD/CPT only (no HCPCS/CPT1).
 */
const runLegacyDementiaDenominator = async (
  collection,
  records,
  { icdCodes, cptCodes, fieldPrefix }
) => {
  const icdList = icdCodes;
  const cptList = cptCodes;

  await bulkUpdateRecords(collection, records, (record) => {
    const icdTokens = (record.ICD || "").split(" ");
    const cptTokens = String(record.CPT || "").split(" ");

    const icdMatched = icdTokens.filter((code) => icdList.includes(code));
    const cptMatched = cptTokens.filter((code) => cptList.includes(code));
    const denominatorMet = icdMatched.length > 0 && cptMatched.length > 0;

    return {
      [`ICD${fieldPrefix}`]: icdMatched.length > 0 ? 1 : 0,
      [`CPT${fieldPrefix}`]: cptMatched.length > 0 ? 1 : 0,
      [`M${fieldPrefix}`]: denominatorMet ? 1 : 0,
      [`N${fieldPrefix}_MET`]: 0,
      [`N${fieldPrefix}_EXCEPTION`]: 0,
      [`N${fieldPrefix}_NOT_MET`]: 0,
      [`QDC${fieldPrefix}`]: "",
    };
  });

  return {
    message: `Measure ${fieldPrefix} processed successfully`,
    totalRecords: records.length,
  };
};

module.exports = { runLegacyDementiaDenominator };
