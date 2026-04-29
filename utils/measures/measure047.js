const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure047 = async (collection, records) => {
  const denominatorEncounterCodes = [
    "90791", "90792", "90832", "90834", "90837", "90839", "90845", "90846", "90847",
    "96116", "96130", "96132", "96110", "96112", "96156", "96105", "96125",
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99221", "99222", "99223", "99231", "99232", "99233", "99234", "99235", "99236",
    "99291", "99304", "99305", "99306", "99307", "99308", "99309", "99310",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
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

    const age = Number(record.AGE);
    const cptCodes = splitCodes(record.CPT);
    const hasEncounter = cptCodes.some((code) => denominatorEncounterCodes.includes(code));
    const pos = Number(record.POS);
    const isEligibleEncounter = age >= 65 && hasEncounter && pos !== 23;

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, { hasDenominator: false, excluded: false });
    }

    const state = patientState.get(patientKey);
    state.hasDenominator = state.hasDenominator || isEligibleEncounter;
    state.excluded = state.excluded || (isEligibleEncounter && hasCode(record, "G9692"));
  }

  const updatesByRecord = new WeakMap();
  const emittedPatients = new Set();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    const state = patientState.get(patientKey);
    const shouldIncludePatient = !!(state && state.hasDenominator && !state.excluded);
    const denominator = shouldIncludePatient && !emittedPatients.has(patientKey) ? 1 : 0;
    if (denominator) emittedPatients.add(patientKey);

    updatesByRecord.set(record, {
      CPT47: denominator,
      M047: denominator,
      N047_MET: 0,
      N047_NOT_MET: 0,
      QDC047: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 47 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure047,
  measure47: measure047,
};
