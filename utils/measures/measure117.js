const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure117DiabetesEyeExam = async (collection, records) => {
  // CT1 - Diabetes diagnosis value set.
  const icdCodesToCompare117 = [
    "E1010", "E1011", "E1021", "E1022", "E1029", "E10311", "E10319", "E103211", "E103212", "E103213",
    "E103219", "E103291", "E103292", "E103293", "E103299", "E103311", "E103312", "E103313", "E103319",
    "E103391", "E103392", "E103393", "E103399", "E103411", "E103412", "E103413", "E103419", "E103491",
    "E103492", "E103493", "E103499", "E103511", "E103512", "E103513", "E103519", "E103521", "E103522",
    "E103523", "E103529", "E103531", "E103532", "E103533", "E103539", "E103541", "E103542", "E103543",
    "E103549", "E103551", "E103552", "E103553", "E103559", "E103591", "E103592", "E103593", "E103599",
    "E1036", "E1037X1", "E1037X2", "E1037X3", "E1037X9", "E1039", "E1040", "E1041", "E1042", "E1043",
    "E1044", "E1049", "E1051", "E1052", "E1059", "E10610", "E10618", "E10620", "E10621", "E10622", "E10628", "E10630", "E10638", "E10641",
    "E10649", "E1065", "E1069", "E108", "E109", "E1100", "E1101", "E1121", "E1122", "E1129", "E11311",
    "E11319", "E113211", "E113212", "E113213", "E113219", "E113291", "E113292", "E113293", "E113299",
    "E113311", "E113312", "E113313", "E113319", "E113391", "E113392", "E113393", "E113399", "E113411",
    "E113412", "E113413", "E113419", "E113491", "E113492", "E113493", "E113499", "E113511", "E113512",
    "E113513", "E113519", "E113521", "E113522", "E113523", "E113529", "E113531", "E113532", "E113533",
    "E113539", "E113541", "E113542", "E113543", "E113549", "E113551", "E113552", "E113553", "E113559",
    "E113591", "E113592", "E113593", "E113599", "E1136", "E1137X1", "E1137X2", "E1137X3", "E1137X9",
    "E1139", "E1140", "E1141", "E1142", "E1143", "E1144", "E1149", "E1151", "E1152", "E1159", "E11610",
    "E11618", "E11620", "E11621", "E11622", "E11628", "E11630", "E11638", "E11641", "E11649", "E1165",
    "E1169", "E118", "E119", "E1300", "E1301", "E1310", "E1311", "E1321", "E1322", "E1329", "E13311",
    "E13319", "E133211", "E133212", "E133213", "E133219", "E133291", "E133292", "E133293", "E133299",
    "E133311", "E133312", "E133313", "E133319", "E133391", "E133392", "E133393", "E133399", "E133411",
    "E133412", "E133413", "E133419", "E133491", "E133492", "E133493", "E133499", "E133511", "E133512",
    "E133513", "E133519", "E133521", "E133522", "E133523", "E133529", "E133531", "E133532", "E133533",
    "E133539", "E133541", "E133542", "E133543", "E133549", "E133551", "E133552", "E133553", "E133559",
    "E133591", "E133592", "E133593", "E133599", "E1336", "E1337X1", "E1337X2", "E1337X3", "E1337X9",
    "E1339", "E1340", "E1341", "E1342", "E1343", "E1344", "E1349", "E1351", "E1352", "E1359", "E13610",
    "E13618", "E13620", "E13621", "E13622", "E13628", "E13630", "E13638", "E13641", "E13649", "E1365",
    "E1369", "E138", "E139", "O24011", "O24012", "O24013", "O24019", "O2402", "O2403", "O24111", "O24112",
    "O24113", "O24119", "O2412", "O2413", "O24311", "O24312", "O24313", "O24319", "O2432", "O2433", "O24811",
    "O24812", "O24813", "O24819", "O2482", "O2483",
  ];
  // CT2 - Qualifying denominator encounter value set.
  const cptCodesToCompare117 = [
    "92002", "92004", "92012", "92014",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99385", "99386", "99387", "99395", "99396", "99397",
    "G0402", "G0438", "G0439",
  ];

  const getPatientKey = (record) => {
    const raw =
      record["PAT ID"] ??
      record["PATID"] ??
      record["PATIENT ID"] ??
      record["Patient ID"] ??
      record["MRN"] ??
      record["MEMBER ID"] ??
      record["Member ID"] ??
      record["PATIENT"];
    return raw === undefined || raw === null || String(raw).trim() === "" ? String(record._id) : String(raw).trim();
  };
  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };

  const patientState = new Map();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    if (!patientKey) continue;

    // CT1/CT2 - Base denominator checks.
    const age = Number(record.AGE);
    const icdCodes117 = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const cptCodes117 = splitCodes(record.CPT).map((code) => normalizeCode(code));
    const hasDiabetesDx = icdCodes117.some((code) => icdCodesToCompare117.includes(code));
    const hasEncounter = cptCodes117.some((code) => cptCodesToCompare117.includes(code));
    const inBaseDenominator = age >= 18 && age <= 75 && hasDiabetesDx && hasEncounter;

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, {
        hasDenominator: false,
        excluded: false,
      });
    }

    const state = patientState.get(patientKey);
    state.hasDenominator = state.hasDenominator || inBaseDenominator;

    // CT3 - Denominator exclusions.
    const exclusion =
      (inBaseDenominator && hasCode(record, "G9714")) ||
      (inBaseDenominator && hasCode(record, "G9994")) ||
      (inBaseDenominator && age >= 66 && hasCode(record, "G2105")) ||
      (inBaseDenominator && age >= 66 && hasCode(record, "G2106")) ||
      (inBaseDenominator && age >= 66 && hasCode(record, "G2107")) ||
      (inBaseDenominator && hasCode(record, "M1428"));
    state.excluded = state.excluded || exclusion;
  }

  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    const state = patientState.get(patientKey);
    // Final denominator-only assignment.
    const denominator = state && state.hasDenominator && !state.excluded ? 1 : 0;

    updatesByRecord.set(record, {
      ICD117: denominator,
      CPT117: denominator,
      M117: denominator,
      N117_MET: 0,
      N117_NOT_MET: 0,
      QDC117: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 117 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure117DiabetesEyeExam,
  measure117: measure117DiabetesEyeExam,
};
