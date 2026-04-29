const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure039 = async (collection, records) => {
  const denominatorEncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
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
  const hasOsteoporosisDx = (record) => {
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    return icdTokens.some(
      (code) => code.startsWith("M80") || code === "M810" || code === "M816" || code === "M818"
    );
  };

  const patientState = new Map();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    if (!patientKey) continue;

    const age = Number(record.AGE);
    const isFemale = String(record.GEN || "").toUpperCase() === "F";
    const cptCodes = splitCodes(record.CPT);
    const hasEncounter = cptCodes.some((code) => denominatorEncounterCodes.includes(code));
    const inDenominator = isFemale && age >= 65 && age <= 85 && hasEncounter;

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, { hasDenominator: false, excluded: false });
    }

    const state = patientState.get(patientKey);
    state.hasDenominator = state.hasDenominator || inDenominator;
    state.excluded =
      state.excluded ||
      (inDenominator &&
        (hasCode(record, "M1153") || hasOsteoporosisDx(record) || hasCode(record, "G9690")));
  }

  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    const state = patientState.get(patientKey);
    const denominator = state && state.hasDenominator && !state.excluded ? 1 : 0;
    updatesByRecord.set(record, {
      CPT39: denominator,
      M039: denominator,
      N039_MET: 0,
      N039_NOT_MET: 0,
      QDC039: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 39 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure039,
  measure39: measure039,
};
