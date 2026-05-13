const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getIcdTokens,
  getProcedureTokens,
  getNumericAge,
  normalizeCode,
} = require("./helpers/clinicalTokens");

const encounterCodes = [
  "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008", "98009", "98010", "98011", "98012",
  "98013", "98014", "98015", "98016", "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215", "99242",
  "99243", "99244", "99245", "99385", "99386", "99387", "99395", "99396", "99397", "99401", "99402", "99403", "99404",
  "99429", "G0438", "G0439",
];

const diabetesPrefixes = ["E10", "E11", "E13", "O24"];
const encounterSet = new Set(encounterCodes.map((c) => normalizeCode(c)));

/**
 * MIPS CQM 488 (2026): Kidney health evaluation — denominator proxy (flat row).
 * Age 18–85, diabetes ICD prefix, qualifying encounter. eGFR + uACR documentation not inferred from claims row.
 */
const measure488KidneyHealthEvaluation = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18 && age <= 85;

    const icdTokens = getIcdTokens(record);
    const proc = getProcedureTokens(record);

    const hasDiabetes = icdTokens.some((t) => diabetesPrefixes.some((p) => t.startsWith(normalizeCode(p))));
    const hasEncounter = proc.some((t) => encounterSet.has(t));

    const inDenominator = ageOk && hasDiabetes && hasEncounter;

    return {
      ICD488: hasDiabetes ? 1 : 0,
      CPT488: hasEncounter ? 1 : 0,
      M488: inDenominator ? 1 : 0,
      N488_MET: 0,
      N488_EXCEPTION: 0,
      N488_NOT_MET: 0,
      QDC488: "",
    };
  });

  return {
    message: "Measure 488 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure488KidneyHealthEvaluation,
  measure488: measure488KidneyHealthEvaluation,
};
