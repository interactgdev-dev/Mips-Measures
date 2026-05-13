const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const { getProcedureTokens, getNumericAge, normalizeCode } = require("./helpers/clinicalTokens");

/** Outpatient / evaluation visit codes (measure 431 criteria 1 & 2, legacy cpt1). */
const OUTPATIENT_ENCOUNTER_CODES = [
  "90791", "90792", "90832", "90834", "90837", "90845", "92517", "92518", "92519", "92537", "92538", "92540", "92541",
  "92542", "92544", "92545", "92546", "92548", "92549", "92550", "92552", "92553", "92555", "92556", "92557", "92567",
  "92570", "92584", "92587", "92588", "92620", "92622", "92625", "92626", "92650", "92651", "92652", "92653", "96156",
  "96158", "97165", "97166", "97167", "97168", "97802", "97803", "97804", "98000", "98001", "98002", "98003", "98004",
  "98005", "98006", "98007", "98008", "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016", "99202",
  "99203", "99204", "99205", "99212", "99213", "99214", "99215", "G0270", "G0271",
];

/** Preventive / wellness visit codes (legacy cpt2). */
const PREVENTIVE_ENCOUNTER_CODES = [
  "99385", "99386", "99387", "99395", "99396", "99397", "99401", "99402", "99403", "99404", "99411", "99412", "99429",
  "G0438", "G0439",
];

const EXCLUSION_CODES = ["M1164", "M1165"];
const G2196 = normalizeCode("G2196");

const outpatientSet = new Set(OUTPATIENT_ENCOUNTER_CODES.map((c) => normalizeCode(c)));
const preventiveSet = new Set(PREVENTIVE_ENCOUNTER_CODES.map((c) => normalizeCode(c)));
const exclusionSet = new Set(EXCLUSION_CODES.map((c) => normalizeCode(c)));

/**
 * MIPS CQM 431 (2026 CBE 2152): Unhealthy alcohol use — screening & brief counseling (denominator proxy).
 * Row-level: age ≥ 18, any qualifying encounter from value sets, exclude M1164/M1165 on procedure tokens.
 * Full measure requires ≥2 visits in period or preventive logic; flat file cannot aggregate across rows.
 */
const measure431UnhealthyAlcoholUseScreening = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const procedureTokens = getProcedureTokens(record);
    const hasOutpatient = procedureTokens.some((c) => outpatientSet.has(c));
    const hasPreventive = procedureTokens.some((c) => preventiveSet.has(c));
    const hasQualifyingVisit = hasOutpatient || hasPreventive;
    const excluded = procedureTokens.some((c) => exclusionSet.has(c));
    const hasG2196 = procedureTokens.includes(G2196);

    const inDenominator = ageOk && hasQualifyingVisit && !excluded;

    return {
      CPT431C1: ageOk && hasQualifyingVisit ? 1 : 0,
      CPT431C2: ageOk && hasQualifyingVisit && hasG2196 ? 1 : 0,
      M431: inDenominator ? 1 : 0,
      N431_MET: 0,
      N431_EXCEPTION: 0,
      N431_NOT_MET: 0,
      QDC431: "",
    };
  });

  return {
    message: "Measure 431 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure431UnhealthyAlcoholUseScreening,
  measure431: measure431UnhealthyAlcoholUseScreening,
};
