const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getIcdTokens,
  getProcedureTokens,
  getModTokens,
  getNumericAge,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 418 (2026): Osteoporosis management after fracture in women 50–85 (denominator only).
 * Women: explicit male (GEN M/1) excluded; F, 2, or blank GEN allowed for flat extracts without sex.
 * Encounter CPT/HCPCS pool or fracture procedure CPT on row. QDC exclusions when present on row.
 * Flat file cannot enforce 180-day episode window from DOS alone.
 */
const ct1DiagnosisPrefixes = [
  "M484", "M480", "M481", "M482", "M483", "M800", "M808", "M840", "M841", "M842", "M843", "M844", "M845", "M846", "M847",
  "M970", "M971", "M972", "M973", "M974",
  "S12", "S22", "S32", "S42", "S52", "S62", "S72", "S82", "S92",
];

const ct2EncounterCodes = [
  "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008", "98009", "98010", "98011", "98012",
  "98013", "98014", "98015", "98016", "98966", "98967", "98968", "98970", "98971", "98972", "98979", "98980", "99202",
  "99203", "99204", "99205", "99211", "99212", "99213", "99214", "99215", "99221", "99222", "99223", "99238", "99239",
  "99242", "99243", "99244", "99245", "99281", "99282", "99283", "99284", "99285", "99341", "99342", "99344", "99345",
  "99347", "99348", "99349", "99350", "99386", "99387", "99396", "99397", "99401", "99402", "99403", "99404", "99411",
  "99412", "99421", "99422", "99423", "99429", "99455", "99456", "99457", "99470", "99483", "G0071", "G0402", "G0438",
  "G0439", "G0463", "G2010", "T1015",
];

const ct3ProcedureCodes = [
  "22310", "22315", "22318", "22319", "22325", "22326", "22327", "22510", "22511", "22513", "22514", "25600", "25605",
  "25606", "25607", "25608", "25609", "27230", "27232", "27235", "27236", "27238", "27240", "27244", "27245", "27246",
  "27248",
];

const exclusionCodes = ["G9768", "G0048", "G9769", "G9938", "G2127", "G2126", "G2125"];

const encounterSet = new Set(ct2EncounterCodes.map((c) => normalizeCode(c)));
const procedureSet = new Set(ct3ProcedureCodes.map((c) => normalizeCode(c)));
const exclusionSet = new Set(exclusionCodes.map((c) => normalizeCode(c)));

function isFemale(record) {
  const g = String(record.GEN ?? record.SEX ?? record.GENDER ?? "")
    .trim()
    .toUpperCase();
  if (!g) return true;
  if (g === "M" || g === "1") return false;
  return g === "F" || g === "2" || g.startsWith("F");
}

const hasFractureDiagnosis = (icdTokens) =>
  icdTokens.some((code) => ct1DiagnosisPrefixes.some((prefix) => code.startsWith(prefix)));

const measure418OsteoporosisManagementWomenWithFracture = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageEligible = !Number.isNaN(age) && age >= 50 && age <= 85;
    const female = isFemale(record);

    const icdTokens = getIcdTokens(record);
    const hasDiagnosis = hasFractureDiagnosis(icdTokens);

    const procedureTokens = getProcedureTokens(record);
    const codeTokens = [...procedureTokens, ...getModTokens(record)];

    const hasEncounter = procedureTokens.some((code) => encounterSet.has(code));
    const hasFractureProcedure = procedureTokens.some((code) => procedureSet.has(code));
    const hasExclusion = codeTokens.some((code) => exclusionSet.has(code));

    const pos = String(record.POS ?? "").trim();
    const posExcludedForEncounter = pos === "21";

    const inDenominator =
      female &&
      ageEligible &&
      hasDiagnosis &&
      !hasExclusion &&
      ((hasEncounter && !posExcludedForEncounter) || hasFractureProcedure);

    return {
      ICD418: hasDiagnosis ? 1 : 0,
      CPT418: hasEncounter || hasFractureProcedure ? 1 : 0,
      M418: inDenominator ? 1 : 0,
      N418_MET: 0,
      N418_EXCEPTION: 0,
      N418_NOT_MET: 0,
      QDC418: "",
    };
  });

  return {
    message: "Measure 418 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure418OsteoporosisManagementWomenWithFracture,
  measure418: measure418OsteoporosisManagementWomenWithFracture,
};
