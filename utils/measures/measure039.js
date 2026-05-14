const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/** 2026 MIPS CQM #039 denominator encounters (CPT or HCPCS): telehealth 980xx + office/outpatient E/M. */
const denominatorEncounterCodes = new Set([
  "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
  "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
  "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
]);

/**
 * Osteoporosis / related dx used as denominator exclusion (aligned with legacy `processing.js` measure39
 * and CMS “osteoporosis diagnosis” intent: M80.* pathologic fracture with osteoporosis, M81.0 / M81.6 / M81.8).
 */
const hasOsteoporosisExclusionIcd = (record, splitCodes, normalizeCode) => {
  const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
  return icdTokens.some(
    (code) =>
      code.startsWith("M80") ||
      code === "M810" ||
      code === "M816" ||
      code === "M818"
  );
};

/**
 * Women 65–85 with qualifying encounter; excluded for M1153, G9690, or osteoporosis ICD on any claim line.
 * M039/CPT39 = 1 only on rows that themselves meet age/sex/encounter (avoids counting every lab row for the same patient).
 */
const measure039 = async (collection, records) => {
  const getPatientKey = (record) => {
    const raw =
      record["PAT ID"] ??
      record["PATID"] ??
      record["PATIENT ID"] ??
      record["Patient Id"] ??
      record["Patient ID"] ??
      record["MRN"] ??
      record["MEMBER ID"] ??
      record["Member ID"] ??
      record["PATIENT"];
    return raw === undefined || raw === null || String(raw).trim() === ""
      ? String(record._id)
      : String(raw).trim();
  };
  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
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

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, { excluded: false });
    }
    const state = patientState.get(patientKey);
    // Exclusions apply if documented anywhere on the patient (not only on the same line as a denom encounter).
    state.excluded =
      state.excluded ||
      hasCode(record, "M1153") ||
      hasOsteoporosisExclusionIcd(record, splitCodes, normalizeCode) ||
      hasCode(record, "G9690");
  }

  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    const state = patientState.get(patientKey);

    const age = Number(record.AGE);
    const ageOk = Number.isFinite(age) && age >= 65 && age <= 85;
    const isFemale = String(record.GEN || "").trim().toUpperCase() === "F";
    const lineEncounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((c) => normalizeCode(c));
    const hasEncounter = lineEncounterTokens.some((code) => denominatorEncounterCodes.has(code));
    const rowInDenominator = isFemale && ageOk && hasEncounter;

    const denominator = !!(state && rowInDenominator && !state.excluded);
    updatesByRecord.set(record, {
      CPT39: denominator ? 1 : 0,
      M039: denominator ? 1 : 0,
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
