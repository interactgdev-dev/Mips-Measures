const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure052CopdActionPlan = async (collection, records) => {
  // CT1 - COPD diagnosis value set.
  const copdDiagnosisCodes = [
    "J410", "J411", "J418", "J42", "J430", "J431", "J432", "J438", "J439",
    "J440", "J441", "J4489", "J449",
  ];
  // CT2 - Qualifying denominator encounters.
  const encounterCodes = [
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215", "99424", "99426",
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
    const icdCodes = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const cptCodes = splitCodes(record.CPT).map((code) => normalizeCode(code));
    const hasCopdDx = icdCodes.some((code) => copdDiagnosisCodes.includes(code));
    const hasEncounter = cptCodes.some((code) => encounterCodes.includes(code));
    const telehealthEncounter = hasCode(record, "M1426");
    const c1DenominatorHit = age >= 18 && hasCopdDx && hasEncounter && !telehealthEncounter;
    // CT3 - Additional denominator pathway criteria.
    const c2DenominatorHit = c1DenominatorHit && hasCode(record, "G8924") && hasCode(record, "M1218");

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, {
        c1Denominator: false,
        c2Denominator: false,
      });
    }

    const state = patientState.get(patientKey);
    state.c1Denominator = state.c1Denominator || c1DenominatorHit;
    state.c2Denominator = state.c2Denominator || c2DenominatorHit;
  }

  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const state = patientState.get(getPatientKey(record));
    const c1Eligible = state && state.c1Denominator ? 1 : 0;
    const c2Eligible = state && state.c2Denominator ? 1 : 0;

    updatesByRecord.set(record, {
      ICD52: c1Eligible,
      CPT52: c1Eligible,
      M052: c1Eligible,
      M052_C1: c1Eligible,
      N052_C1_MET: 0,
      N052_C1_EXCEPTION: 0,
      N052_C1_NOT_MET: 0,
      QDC052_C1: "",
      M052_C2: c2Eligible,
      N052_C2_MET: 0,
      N052_C2_EXCEPTION: 0,
      N052_C2_NOT_MET: 0,
      QDC052_C2: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 52 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure052CopdActionPlan,
  measure052: measure052CopdActionPlan,
  measure52: measure052CopdActionPlan,
};
