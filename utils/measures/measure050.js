const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure050UrinaryIncontinencePlanOfCare = async (collection, records) => {
  // CT1 - Urinary incontinence diagnosis value set.
  const denominatorDiagnosisCodes = [
    "F980", "N393", "N3941", "N3942", "N3943", "N3944", "N3945",
    "N3946", "N39490", "N39491", "N39492", "N39498", "R32",
  ];
  // CT2 - Qualifying denominator encounter value set.
  const denominatorEncounterCodes = [
    "97161", "97162", "97163", "97164", "97165", "97166", "97167", "97168",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350", "G0402",
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
    return raw === undefined || raw === null || String(raw).trim() === ""
      ? String(record._id)
      : String(raw).trim();
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

    // CT1/CT2 - Base denominator filters.
    const age = Number(record.AGE);
    const isFemale = String(record.GEN || "").toUpperCase() === "F";
    const icdCodes = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const cptCodes = splitCodes(record.CPT).map((code) => normalizeCode(code));
    const hasDiagnosis = icdCodes.some((code) => denominatorDiagnosisCodes.includes(code));
    const hasEncounter = cptCodes.some((code) => denominatorEncounterCodes.includes(code));
    const inDenominator = age >= 65 && isFemale && hasDiagnosis && hasEncounter;

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, {
        hasDenominator: false,
        excluded: false,
      });
    }

    const state = patientState.get(patientKey);
    state.hasDenominator = state.hasDenominator || inDenominator;
    // CT3 - Denominator exclusion.
    state.excluded = state.excluded || (inDenominator && hasCode(record, "G9694"));
  }

  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    const state = patientState.get(patientKey);
    // Final denominator-only assignment.
    const denominator = state && state.hasDenominator && !state.excluded ? 1 : 0;

    updatesByRecord.set(record, {
      ICD50: denominator,
      CPT50: denominator,
      M050: denominator,
      N050_MET: 0,
      N050_NOT_MET: 0,
      QDC050: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 50 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure050UrinaryIncontinencePlanOfCare,
  measure050: measure050UrinaryIncontinencePlanOfCare,
  measure50: measure050UrinaryIncontinencePlanOfCare,
};
