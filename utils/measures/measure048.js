const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure048 = async (collection, records) => {
  // CT1 - Qualifying denominator encounters.
  const denominatorEncounterCodes = [
    "97161", "97162", "97163", "97164", "97165", "97166", "97167", "97168",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "G0402",
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

    // CT1 - Base denominator filters.
    const age = Number(record.AGE);
    const isFemale = String(record.GEN || "").toUpperCase() === "F";
    const cptCodes = splitCodes(record.CPT);
    const hasEncounter = cptCodes.some((code) => denominatorEncounterCodes.includes(code));
    const inDenominator = age >= 65 && isFemale && hasEncounter;

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, { hasDenominator: false, excluded: false });
    }

    const state = patientState.get(patientKey);
    state.hasDenominator = state.hasDenominator || inDenominator;
    // CT2 - Patient-level denominator exclusion.
    state.excluded = state.excluded || (inDenominator && hasCode(record, "G9693"));
  }

  const updatesByRecord = new WeakMap();
  const emittedPatients = new Set();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    const state = patientState.get(patientKey);
    const shouldIncludePatient = !!(state && state.hasDenominator && !state.excluded);
    // Final denominator-only assignment (single episode per patient).
    const denominator = shouldIncludePatient && !emittedPatients.has(patientKey) ? 1 : 0;
    if (denominator) emittedPatients.add(patientKey);

    updatesByRecord.set(record, {
      CPT48: denominator,
      M048: denominator,
      N048_MET: 0,
      N048_NOT_MET: 0,
      QDC048: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 48 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure048,
  measure48: measure048,
};
