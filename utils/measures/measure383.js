const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const spec = require("./data/measure383Denominator.json");
const {
  getIcdTokens,
  getProcedureTokens,
  getModTokens,
  getNumericAge,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 383 (2026): Antipsychotic adherence — schizophrenia / schizoaffective (denominator only).
 * Flat-file proxy: age ≥ 18, schizophrenia ICD (list + F20*), qualifying encounter, exclude dementia ICD/M1452.
 * M1380 and POS filters omitted (registry / attribution fields; they zero out claim extracts).
 */
const schizSet = new Set(spec.schizophreniaIcdNormalized);
const encounterSet = new Set(spec.encounterCptHcpcs.map((c) => normalizeCode(String(c))));
const dementiaSet = new Set(spec.dementiaExclusionIcdNormalized);

const M1452 = normalizeCode("M1452");

const measure383AntipsychoticAdherenceDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const icdTokens = getIcdTokens(record);
    const hasSchiz =
      icdTokens.some((t) => schizSet.has(t)) || icdTokens.some((t) => t.startsWith("F20"));

    const procedureTokens = getProcedureTokens(record);
    const hasEncounter = procedureTokens.some((c) => encounterSet.has(c));

    const codeTokens = [...procedureTokens, ...getModTokens(record)];
    const hasDementiaExcl =
      codeTokens.includes(M1452) || icdTokens.some((t) => dementiaSet.has(t));

    const inDenominator = ageOk && hasSchiz && hasEncounter && !hasDementiaExcl;

    return {
      CPT383: inDenominator ? 1 : 0,
      M383: inDenominator ? 1 : 0,
      N383_MET: 0,
      N383_EXCEPTION: 0,
      N383_NOT_MET: 0,
      QDC383: "",
    };
  });

  return {
    message: "Measure 383 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure383AntipsychoticAdherenceDenominator,
  measure383: measure383AntipsychoticAdherenceDenominator,
};
