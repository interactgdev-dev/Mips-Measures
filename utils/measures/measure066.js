const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure066AppropriateTestingPharyngitis = async (collection, records) => {
  const pharyngitisDiagnosisCodes = [
    "J020", "J028", "J029", "J0300", "J0301", "J0380", "J0381", "J0390", "J0391",
  ];
  const denominatorEncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "98966", "98967", "98968", "98979", "99202", "99203", "99204", "99205",
    "99212", "99213", "99214", "99215", "99221", "99222", "99223", "99238", "99239",
    "99242", "99243", "99244", "99245", "99281", "99282", "99283", "99284", "99285",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99382", "99383", "99384", "99385", "99386", "99387", "99392", "99393", "99394",
    "99395", "99396", "99397", "99421", "99422", "99423", "99457", "99470",
    "98980", "G2250", "G2251", "G2252",
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
    const hasPharyngitisDx = icdCodes.some((code) => pharyngitisDiagnosisCodes.includes(code));
    const hasEncounter = cptCodes.some((code) => denominatorEncounterCodes.includes(code));
    const isPos21 = Number(record.POS) === 21;
    const hasAntibioticOrder = hasCode(record, "G8711");
    const denominatorBase = age >= 3 && hasPharyngitisDx && hasEncounter && !isPos21 && hasAntibioticOrder;
    const excluded =
      hasCode(record, "G9703") ||
      hasCode(record, "G2175") ||
      hasCode(record, "G2097") ||
      hasCode(record, "G9702");
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
      ICD66: denominator,
      CPT66: denominator,
      M66: denominator,
      M066: denominator,
      N066_MET: 0,
      N066_NOT_MET: 0,
      QDC066: "",
    };
  });

  return {
    message: "Measure 66 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure066AppropriateTestingPharyngitis,
  measure066: measure066AppropriateTestingPharyngitis,
  measure66: measure066AppropriateTestingPharyngitis,
};
