const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure134DepressionScreening = async (collection, records) => {
  // CT1 - Denominator encounter and exclusion code sets
  const denominatorEncounterCodes = [
    "59400","59425","59426","59510","59610","59618","90791","90792","90832","90834","90837",
    "92622","92625","96105","96110","96112","96116","96125","96136","96138","96156","96158",
    "97161","97162","97163","97164","97165","97166","97167","97802","97803",
    "98000","98001","98002","98003","98004","98005","98006","98007","98008",
    "98009","98010","98011","98012","98013","98014","98015","98016",
    "98966","98967","98968","99078","99202","99203","99204","99205","99212","99213","99214","99215",
    "99304","99305","99306","99307","99308","99309","99310","99315","99316",
    "99341","99342","99344","99345","99347","99348","99349","99350",
    "99401","99402","99403","99424","99483","99484","99491","99492","99493",
    "99384","99385","99386","99387","99394","99395","99396","99397",
    "G0101","G0270","G0271","G0402","G0438","G0439","G0444",
  ];
  const bipolarDiagnosisCodes = [
    "F302","F303","F304","F308","F309","F3010","F3011","F3012","F3013",
    "F310","F3110","F3111","F3112","F3113","F312","F3130","F3131","F3132",
    "F314","F315","F3160","F3161","F3162","F3163","F3164","F3170","F3171",
    "F3172","F3173","F3174","F3175","F3176","F3177","F3178","F3181","F3189","F319",
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

    const ct1AgeOnEncounterDate = Number(record.AGE);
    const ct1RecordEncounterCodes = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((code) => normalizeCode(code));
    const ct1RecordIcdCodes = splitCodes(record.ICD).map((code) => normalizeCode(code));

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, {
        ageEligible: false,
        hasEncounter: false,
        excluded: false,
      });
    }

    const state = patientState.get(patientKey);
    state.ageEligible = state.ageEligible || ct1AgeOnEncounterDate >= 12;
    state.hasEncounter = state.hasEncounter || ct1RecordEncounterCodes.some((code) => denominatorEncounterCodes.includes(code));
    state.excluded =
      state.excluded ||
      hasCode(record, "G9717") ||
      ct1RecordIcdCodes.some((code) => bipolarDiagnosisCodes.includes(code));
  }

  const updatesByRecord = new WeakMap();
  const emittedPatients = new Set();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    const state = patientState.get(patientKey);
    const ct1PatientEligible = !!state && state.ageEligible && state.hasEncounter && !state.excluded;
    // Measure 134 is patient-intermediate; count eligible patient once.
    const ct1DenominatorMet = ct1PatientEligible && !emittedPatients.has(patientKey);
    if (ct1DenominatorMet) emittedPatients.add(patientKey);

    updatesByRecord.set(record, {
      ICD134: ct1DenominatorMet ? 1 : 0,
      CPT134: ct1DenominatorMet ? 1 : 0,
      M134: ct1DenominatorMet ? 1 : 0,
      N134_MET: 0,
      N134_EXCEPTION: 0,
      N134_NOT_MET: 0,
      QDC134: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 134 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure134DepressionScreening,
  measure134: measure134DepressionScreening,
};
