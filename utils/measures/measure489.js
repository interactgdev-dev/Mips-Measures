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

const encounterSet = new Set(encounterCodes.map((c) => normalizeCode(c)));

/** CKD stages proxy: N18.* except acute renal failure N180.x */
function hasCkdToken(t) {
  if (!t.startsWith("N18") || t.startsWith("N180")) return false;
  return true;
}

function hasProteinuriaToken(t) {
  return t.startsWith("R80") || t.startsWith("R81");
}

/**
 * MIPS CQM 489 (2026): Adult kidney disease — ACE/ARB therapy (denominator proxy).
 * Age ≥18, CKD (N18.* stages proxy) + proteinuria/albuminuria ICD prefix + encounter. Dialysis and med nuance omitted on single row.
 */
const measure489AdultKidneyDiseaseAceArb = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const icdTokens = getIcdTokens(record);
    const proc = getProcedureTokens(record);

    const hasCkd = icdTokens.some(hasCkdToken);
    const hasProt = icdTokens.some(hasProteinuriaToken);
    const hasEncounter = proc.some((t) => encounterSet.has(t));

    const inDenominator = ageOk && hasCkd && hasProt && hasEncounter;

    return {
      ICD489: hasCkd || hasProt ? 1 : 0,
      CPT489: hasEncounter ? 1 : 0,
      M489: inDenominator ? 1 : 0,
      N489_MET: 0,
      N489_EXCEPTION: 0,
      N489_NOT_MET: 0,
      QDC489: "",
    };
  });

  return {
    message: "Measure 489 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure489AdultKidneyDiseaseAceArb,
  measure489: measure489AdultKidneyDiseaseAceArb,
};
