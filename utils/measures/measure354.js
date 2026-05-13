const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/**
 * MIPS CQM 354 (2026): Anastomotic leak intervention (inverse measure).
 * Denominator only: patients aged 18+ with qualifying gastric bypass or colectomy CPT during the period.
 * Spec CPT: 43644, 43645, 43775, 43845–43848, 43860, 43865, 44140, 44141, 44143–44147, 44150, 44151,
 * 44155–44158, 44160, 44204–44208, 44210–44212, 44626.
 */
const measure354AnastomoticLeakDenominator = async (collection, records) => {
  const denominatorProcedureCodes = [
    "43644",
    "43645",
    "43775",
    "43845",
    "43846",
    "43847",
    "43848",
    "43860",
    "43865",
    "44140",
    "44141",
    "44143",
    "44144",
    "44145",
    "44146",
    "44147",
    "44150",
    "44151",
    "44155",
    "44156",
    "44157",
    "44158",
    "44160",
    "44204",
    "44205",
    "44206",
    "44207",
    "44208",
    "44210",
    "44211",
    "44212",
    "44626",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedDenominatorCodes = denominatorProcedureCodes.map((code) => normalizeCode(code));

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const procedureTokens = [
      ...splitCodes(record.CPT),
      ...splitCodes(record.HCPCS),
      ...splitCodes(record.CPT1),
    ].map((code) => normalizeCode(code));
    const hasProcedure = procedureTokens.some((code) => normalizedDenominatorCodes.includes(code));

    const inDenominator = ageOk && hasProcedure;

    return {
      CPT354: inDenominator ? 1 : 0,
      M354: inDenominator ? 1 : 0,
      N354_MET: 0,
      N354_EXCEPTION: 0,
      N354_NOT_MET: 0,
      QDC354: "",
    };
  });

  return {
    message: "Measure 354 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure354AnastomoticLeakDenominator,
  measure354: measure354AnastomoticLeakDenominator,
};
