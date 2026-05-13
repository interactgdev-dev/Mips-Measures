const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const { getProcedureTokens, getModTokens, getNumericAge, normalizeCode } = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 394 (2026): Immunizations for adolescents (denominator only — submission criteria 4 pool).
 * Flat-file proxy: ages 12–17 at encounter (spec centers on 13; widen so extracts with rounded age still count).
 * Qualifying CPT/HCPCS; exclude hospice G9761.
 */
const encounterCodes = [
  "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008", "98009",
  "98010", "98011", "98012", "98013", "98014", "98015", "98016",
  "99202", "99203", "99204", "99205", "99211", "99212", "99213", "99214", "99215",
  "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
  "G0402",
];

const encounterSet = new Set(encounterCodes.map((c) => normalizeCode(c)));
const EXCLUSION_G9761 = normalizeCode("G9761");

const measure394AdolescentImmunizationsDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 12 && age <= 17;

    const procedureTokens = getProcedureTokens(record);

    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasEncounter = procedureTokens.some((c) => encounterSet.has(c));
    const hasExclusion = codeTokens.includes(EXCLUSION_G9761);

    const inDenominator = ageOk && hasEncounter && !hasExclusion;

    return {
      CPT394: inDenominator ? 1 : 0,
      M394: inDenominator ? 1 : 0,
      N394_MET: 0,
      N394_EXCEPTION: 0,
      N394_NOT_MET: 0,
      QDC394: "",
    };
  });

  return {
    message: "Measure 394 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure394AdolescentImmunizationsDenominator,
  measure394: measure394AdolescentImmunizationsDenominator,
};
