const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure065AppropriateTreatmentUri = async (collection, records) => {
  const uriDiagnosisCodes = ["J00", "J060", "J069"];
  const denominatorEncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "98966", "98967", "98968", "98979", "99202", "99203", "99204", "99205",
    "99212", "99213", "99214", "99215", "99221", "99222", "99223", "99238", "99239",
    "99281", "99282", "99283", "99284", "99285", "99341", "99342", "99344", "99345",
    "99347", "99348", "99349", "99350", "99381", "99382", "99383", "99384", "99385",
    "99386", "99387", "99391", "99392", "99393", "99394", "99395", "99396", "99397",
    "99401", "99402", "99403", "99404", "99411", "99412", "99421", "99422", "99423",
    "99455", "99456", "99457", "99470", "98980", "G2250", "G2251", "G2252",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
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
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };
  const toDateValue = (dosValue) => {
    const raw = String(dosValue || "").trim();
    if (!raw) return null;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.getTime();
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 8) {
      const yyyy = Number(digits.slice(0, 4));
      const mm = Number(digits.slice(4, 6));
      const dd = Number(digits.slice(6, 8));
      const parsed = new Date(yyyy, mm - 1, dd).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  };
  const dayDiff = (a, b) => Math.floor(Math.abs(a - b) / (24 * 60 * 60 * 1000));
  const episodeState = new WeakMap();
  const patientEpisodes = new Map();

  for (const record of records) {
    const age = Number(record.AGE);
    const icdCodes = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const cptCodes = splitCodes(record.CPT).map((code) => normalizeCode(code));
    const hasUriDx = icdCodes.some((code) => uriDiagnosisCodes.includes(code));
    const hasEncounter = cptCodes.some((code) => denominatorEncounterCodes.includes(code));
    const isPos21 = Number(record.POS) === 21;
    const inAge = age >= 0.25;
    const denominatorBase = inAge && hasUriDx && hasEncounter && !isPos21;
    const excluded =
      hasCode(record, "G2173") ||
      hasCode(record, "G2174") ||
      hasCode(record, "G8709") ||
      hasCode(record, "G9700");
    const dosTime = toDateValue(record.DOS);
    episodeState.set(record, {
      denominatorBase,
      excluded,
      dosTime,
      keepEpisode: false,
    });

    if (!denominatorBase || excluded || dosTime === null) continue;

    const patientKey = getPatientKey(record) || "__NO_PATIENT__";
    if (!patientEpisodes.has(patientKey)) patientEpisodes.set(patientKey, []);
    patientEpisodes.get(patientKey).push(record);
  }

  for (const [, patientRecords] of patientEpisodes) {
    patientRecords.sort((a, b) => episodeState.get(a).dosTime - episodeState.get(b).dosTime);
    let lastKeptDos = null;
    for (const record of patientRecords) {
      const state = episodeState.get(record);
      if (lastKeptDos === null || dayDiff(state.dosTime, lastKeptDos) > 30) {
        state.keepEpisode = true;
        lastKeptDos = state.dosTime;
      }
    }
  }

  await bulkUpdateRecords(collection, records, (record) => {
    const state = episodeState.get(record);
    const denominator = state && state.denominatorBase && !state.excluded && state.keepEpisode ? 1 : 0;

    return {
      ICD65: denominator,
      CPT65: denominator,
      M65: denominator,
      M065: denominator,
      N065_MET: 0,
      N065_NOT_MET: 0,
      QDC065: "",
    };
  });

  return {
    message: "Measure 65 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure065AppropriateTreatmentUri,
  measure065: measure065AppropriateTreatmentUri,
  measure65: measure065AppropriateTreatmentUri,
};
