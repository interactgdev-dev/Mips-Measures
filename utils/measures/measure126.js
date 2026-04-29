const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure126DiabetesFootExam = async (collection, records) => {
  const denominatorEncounterCodes = [
    "11042","11043","11044","11055","11056","11057","11719","11720","11721","11730","11740",
    "97161","97162","97163","97164","97597","97802","97803",
    "99202","99203","99204","99205","99212","99213","99214","99215",
    "99304","99305","99306","99307","99308","99309","99310",
    "99341","99342","99344","99345","99347","99348","99349","99350",
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
  const hasDiabetesDx = (record) => {
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    return icdTokens.some((code) => code.startsWith("E10") || code.startsWith("E11") || code.startsWith("E13"));
  };
  const hasEncounter = (record) => {
    const cptTokens = splitCodes(record.CPT).map((code) => normalizeCode(code));
    return cptTokens.some((code) => denominatorEncounterCodes.includes(code));
  };
  const patientState = new Map();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    if (!patientKey) continue;

    const age = Number(record.AGE);
    const inBaseDenominator = age >= 18 && hasDiabetesDx(record) && hasEncounter(record);
    const telehealthEncounter = hasCode(record, "M1426");
    const denominatorExclusion = hasCode(record, "G2178");

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, {
        hasDiabetes: false,
        hasEncounter: false,
        ageEligible: false,
        hasTelehealth: false,
        excluded: false,
      });
    }

    const state = patientState.get(patientKey);
    state.ageEligible = state.ageEligible || age >= 18;
    state.hasDiabetes = state.hasDiabetes || hasDiabetesDx(record);
    state.hasEncounter = state.hasEncounter || hasEncounter(record);
    state.hasTelehealth = state.hasTelehealth || (inBaseDenominator && telehealthEncounter);
    state.excluded = state.excluded || (inBaseDenominator && denominatorExclusion);
  }

  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const state = patientState.get(getPatientKey(record));
    const inDenominator =
      !!state &&
      state.ageEligible &&
      state.hasDiabetes &&
      state.hasEncounter &&
      !state.hasTelehealth &&
      !state.excluded;

    updatesByRecord.set(record, {
      ICD126: inDenominator ? 1 : 0,
      CPT126: inDenominator ? 1 : 0,
      M126: inDenominator ? 1 : 0,
      N126_MET: 0,
      N126_EXCEPTION: 0,
      N126_NOT_MET: 0,
      QDC126: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 126 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure126DiabetesFootExam,
  measure126: measure126DiabetesFootExam,
};
