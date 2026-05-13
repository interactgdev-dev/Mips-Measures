const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getIcdTokens,
  getProcedureTokens,
  getModTokens,
  getNumericAge,
  normalizeCode,
  icdMatchesSetOrPrefix,
} = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 398 (2026): Optimal asthma control — denominator pool only (flat file proxy).
 * Ages 5–50; asthma ICD list or J45*; office/telehealth CPT; exclusions when present.
 * M1457 omitted (registry / problem-list QDC; almost never on claim lines).
 */
const asthmaIcdNormalized = [
  "J4520", "J4521", "J4522", "J4530", "J4531", "J4532", "J4540", "J4541", "J4542", "J4550", "J4551", "J4552",
  "J45901", "J45902", "J45909", "J45990", "J45991", "J45998",
];

const exclusionIcdNormalized = [
  "E840", "E8411", "E8419", "E848", "E849", "J430", "J431", "J432", "J438", "J439", "J440", "J441", "J4481",
  "J4489", "J449", "J684", "J9600", "J9601", "J9602", "J9620", "J9621", "J9622", "J982", "J983",
];

const encounterCodes = [
  "98012", "98013", "98014", "98015", "98016", "99211", "99212", "99213", "99214", "99215", "99392", "99393",
  "99394", "99395", "99396", "99421", "99422", "99423",
];

const asthmaSet = new Set(asthmaIcdNormalized);
const exclusionIcdSet = new Set(exclusionIcdNormalized);
const encounterSet = new Set(encounterCodes.map((c) => normalizeCode(c)));

const EXCL_M1460 = normalizeCode("M1460");
const EXCL_M1458 = normalizeCode("M1458");
const EXCL_M1459 = normalizeCode("M1459");
const EXCL_M1021 = normalizeCode("M1021");

const measure398OptimalAsthmaControlDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 5 && age <= 50;

    const icdTokens = getIcdTokens(record);
    const hasAsthma = icdMatchesSetOrPrefix(icdTokens, asthmaSet, ["J45"]);
    const hasExclusionIcd = icdTokens.some((t) => exclusionIcdSet.has(t));

    const procedureTokens = getProcedureTokens(record);

    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasEncounter = procedureTokens.some((c) => encounterSet.has(c));

    const hasExclusionCode =
      codeTokens.includes(EXCL_M1460) ||
      codeTokens.includes(EXCL_M1458) ||
      codeTokens.includes(EXCL_M1459) ||
      codeTokens.includes(EXCL_M1021);

    const inDenominator =
      ageOk && hasAsthma && hasEncounter && !hasExclusionIcd && !hasExclusionCode;

    return {
      CPT398: inDenominator ? 1 : 0,
      M398: inDenominator ? 1 : 0,
      N398_MET: 0,
      N398_EXCEPTION: 0,
      N398_NOT_MET: 0,
      QDC398: "",
    };
  });

  return {
    message: "Measure 398 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure398OptimalAsthmaControlDenominator,
  measure398: measure398OptimalAsthmaControlDenominator,
};
