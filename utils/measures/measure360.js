const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const { getProcedureTokens } = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 360 (2026): CT / cardiac nuclear medicine — prior study count in report (denominator only).
 * All patients regardless of age with denominator CPT during the performance period (2026 PDF).
 * Flat-file: CPT/HCPCS/CPT1 and common alternate procedure columns (PROC, etc.).
 */
const denominatorProcedureCodes = [
  "70450", "70460", "70470", "70471", "70473", "70480", "70481", "70482", "70486", "70487", "70488",
  "70490", "70491", "70492", "70496", "70498", "71250", "71260", "71270", "71271", "71275", "72125",
  "72126", "72127", "72128", "72129", "72130", "72131", "72132", "72133", "72191", "72192", "72193",
  "72194", "73200", "73201", "73202", "73206", "73700", "73701", "73702", "73706", "74150", "74160",
  "74170", "74174", "74175", "74176", "74177", "74178", "74261", "74262", "74263", "75571", "75572",
  "75573", "75574", "75635", "76380", "76497", "77011", "77012", "77013", "77078", "78072", "78429",
  "78430", "78431", "78433", "78451", "78452", "78453", "78454", "78466", "78468", "78469", "78491",
  "78492",
];

const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const denominatorNormalized = new Set(
  denominatorProcedureCodes.map((c) => normalizeCode(c))
);

const measure360IonizingRadiationCountDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const procedureTokens = getProcedureTokens(record);
    const hasProcedure = procedureTokens.some((code) => denominatorNormalized.has(code));

    return {
      CPT360: hasProcedure ? 1 : 0,
      M360: hasProcedure ? 1 : 0,
      N360_MET: 0,
      N360_EXCEPTION: 0,
      N360_NOT_MET: 0,
      QDC360: "",
    };
  });

  return {
    message: "Measure 360 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure360IonizingRadiationCountDenominator,
  measure360: measure360IonizingRadiationCountDenominator,
};
