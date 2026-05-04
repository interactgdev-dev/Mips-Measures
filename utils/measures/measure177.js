const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure177RheumatoidArthritisDiseaseActivity = async (collection, records) => {
  // CT1 - Denominator encounter codes
  const ct1EncounterCodes = [
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99424", "99426", "G0402", "G0468",
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
  const hasRheumatoidArthritisDx = (record) => {
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    return icdTokens.some((code) => code.startsWith("M05") || code.startsWith("M06"));
  };

  const patientState = new Map();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    if (!patientKey) continue;

    const ct1AgeOnEncounterDate = Number(record.AGE);
    const ct1HasRaDx = hasRheumatoidArthritisDx(record);
    const ct1RecordEncounterCodes = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((code) => normalizeCode(code));
    const ct1HasEncounter = ct1RecordEncounterCodes.some((code) => ct1EncounterCodes.includes(code));

    // CT2 - Denominator exclusion: telehealth not eligible for #177
    const ct2TelehealthExcluded = hasCode(record, "M1426");

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, {
        hasEligibleEncounter: false,
        hasAdditionalEncounterIndicator: false,
      });
    }

    const state = patientState.get(patientKey);
    state.hasEligibleEncounter =
      state.hasEligibleEncounter ||
      (ct1AgeOnEncounterDate >= 18 && ct1HasRaDx && ct1HasEncounter && !ct2TelehealthExcluded);
    state.hasAdditionalEncounterIndicator = state.hasAdditionalEncounterIndicator || hasCode(record, "M1374");
  }

  const emittedPatients = new Set();
  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    const state = patientState.get(patientKey);
    const ct1PatientEligible =
      !!state && state.hasEligibleEncounter && state.hasAdditionalEncounterIndicator;
    const ct1DenominatorMet = ct1PatientEligible && !emittedPatients.has(patientKey);
    if (ct1DenominatorMet) emittedPatients.add(patientKey);

    updatesByRecord.set(record, {
      ICD177: ct1DenominatorMet ? 1 : 0,
      CPT177: ct1DenominatorMet ? 1 : 0,
      M177: ct1DenominatorMet ? 1 : 0,
      N177_MET: 0,
      N177_NOT_MET: 0,
      QDC177: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 177 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure177RheumatoidArthritisDiseaseActivity,
  measure177: measure177RheumatoidArthritisDiseaseActivity,
};
