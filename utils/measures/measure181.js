const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure181ElderMaltreatmentScreen = async (collection, records) => {
  // CT1 - Denominator encounter codes
  const ct1EncounterCodes = [
    "90791","90792","90832","90834","90837",
    "92002","92004","92012","92014",
    "92517","92518","92519","92521","92522","92523","92524","92537","92538","92540","92541","92542","92544","92545","92546","92548","92549","92550",
    "92551","92552","92553","92555","92556","92557","92558","92567","92568","92570","92587","92588",
    "92610","92620","92622","92625","92626","92650","92651","92652","92653",
    "96105","96116","96125","96127","96130","96132","96136","96138","96156","96158",
    "97161","97162","97163","97164","97165","97166","97167","97168",
    "97802","97803",
    "99202","99203","99204","99205","99212","99213","99214","99215","99281","99282","99283","99284","99285",
    "99304","99305","99306","99307","99308","99309","99310","99341","99342","99344","99345","99347","99348","99349","99350",
    "99401","99402","99403","99404","99424","99483","99487","99490","99491","99492",
    "G0101","G0102","G0270","G0323","G0402","G0438","G0439",
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
    const ct1HasEncounter = ct1RecordEncounterCodes.some((code) => ct1EncounterCodes.includes(code));

    // CT2 - Denominator exclusion: telehealth not eligible
    const ct2TelehealthExcluded = hasCode(record, "M1437");

    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, {
        eligible: false,
      });
    }

    const state = patientState.get(patientKey);
    state.eligible = state.eligible || (ct1AgeOnEncounterDate >= 60 && ct1HasEncounter && !ct2TelehealthExcluded);
  }

  const emittedPatients = new Set();
  const updatesByRecord = new WeakMap();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    const state = patientState.get(patientKey);
    const ct1DenominatorMet = !!state && state.eligible && !emittedPatients.has(patientKey);
    if (ct1DenominatorMet) emittedPatients.add(patientKey);

    updatesByRecord.set(record, {
      CPT181: ct1DenominatorMet ? 1 : 0,
      M181: ct1DenominatorMet ? 1 : 0,
      N181_MET: 0,
      N181_EXCEPTION: 0,
      N181_NOT_MET: 0,
      QDC181: "",
    });
  }

  await bulkUpdateRecords(collection, records, (record) => updatesByRecord.get(record) || {});

  return {
    message: "Measure 181 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure181ElderMaltreatmentScreen,
  measure181: measure181ElderMaltreatmentScreen,
};
