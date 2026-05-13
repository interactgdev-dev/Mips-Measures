const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getIcdTokens,
  getProcedureTokens,
  getNumericAge,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 478 (2026): Adolescent idiopathic scoliosis — functional assessment (denominator proxy).
 * Age ≥14, value-set ICD (from CMS processing list), encounter CPT/HCPCS pool; exclude when both G2151 and M1149 on row.
 */
const icd478List = require(path.join(__dirname, "data", "measure478Icd.json"));
const icd478Set = new Set(icd478List.map((c) => normalizeCode(c)));

const encounter478 = [
  "97161", "97162", "97163", "97165", "97166", "97167",
  "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
  "98940", "98941", "98942", "98943", "99304", "99305", "99306", "M1143",
];
const encounter478Set = new Set(encounter478.map((c) => normalizeCode(c)));

const measure478AdolescentIdiopathicScoliosisFunctionalAssessment = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 14;

    const icdTokens = getIcdTokens(record);
    const proc = getProcedureTokens(record);

    const hasIcd = icdTokens.some((t) => icd478Set.has(t));
    const hasEncounter = proc.some((t) => encounter478Set.has(t));
    const bothExcl = proc.includes(normalizeCode("G2151")) && proc.includes(normalizeCode("M1149"));

    const inDenominator = ageOk && hasIcd && hasEncounter && !bothExcl;

    return {
      ICD478: hasIcd ? 1 : 0,
      CPT478: hasEncounter ? 1 : 0,
      M478: inDenominator ? 1 : 0,
      N478_MET: 0,
      N478_EXCEPTION: 0,
      N478_NOT_MET: 0,
      QDC478: "",
    };
  });

  return {
    message: "Measure 478 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure478AdolescentIdiopathicScoliosisFunctionalAssessment,
  measure478: measure478AdolescentIdiopathicScoliosisFunctionalAssessment,
};
