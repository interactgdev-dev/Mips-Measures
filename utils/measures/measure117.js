const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/** Legacy denominator ICD — processing.js / Copy (278 codes + O24). */
const icdCodesToCompare117 = require(path.join(__dirname, "data", "measure117LegacyIcd.json"));

/**
 * Legacy encounter CPT — processing - Copy.js (no telehealth 980xx, no G0402).
 */
const cptCodesToCompare117 = [
  "92002", "92004", "92012", "92014",
  "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
  "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
  "99385", "99386", "99387", "99395", "99396", "99397",
  "G0438", "G0439",
];

/**
 * M117 — processing - Copy.js row logic: same row age 18–75 + diabetes ICD + CPT;
 * M117 only on qualifying rows (not all patient rows).
 */
const measure117DiabetesEyeExam = async (collection, records) => {
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
  const icdList = icdCodesToCompare117.map((code) => normalizeCode(code));
  const cptList = cptCodesToCompare117.map((code) => normalizeCode(code));

  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };

  const hasAny8PNotMet = (record) => {
    if (hasCode(record, "2022F8P") || hasCode(record, "2024F8P") || hasCode(record, "2026F8P")) return true;
    const mods = splitCodes(record.MOD).map((m) => normalizeCode(m));
    const hasEightP = mods.includes("8P");
    if (!hasEightP) return false;
    return hasCode(record, "2022F") || hasCode(record, "2024F") || hasCode(record, "2026F");
  };

  const getQdcStatus = (record) => {
    if (hasCode(record, "M1220")) return { qdc: "M1220", met: 1, notMet: 0 };
    if (hasCode(record, "M1221")) return { qdc: "M1221", met: 1, notMet: 0 };
    if (hasCode(record, "2024F")) return { qdc: "2024F", met: 1, notMet: 0 };
    if (hasCode(record, "2025F")) return { qdc: "2025F", met: 1, notMet: 0 };
    if (hasCode(record, "2026F")) return { qdc: "2026F", met: 1, notMet: 0 };
    if (hasCode(record, "2033F")) return { qdc: "2033F", met: 1, notMet: 0 };
    if (hasCode(record, "3072F")) return { qdc: "3072F", met: 1, notMet: 0 };
    if (hasCode(record, "M1429")) return { qdc: "M1429", met: 1, notMet: 0 };
    if (hasCode(record, "M1430")) return { qdc: "M1430", met: 1, notMet: 0 };
    if (hasAny8PNotMet(record)) return { qdc: "2022F/2024F/2026F-8P", met: 0, notMet: 1 };
    return null;
  };

  const rowExcluded = (record, age) => {
    const cptRaw = splitCodes(record.CPT);
    const hasG9714 = cptRaw.some((c) => normalizeCode(c) === "G9714") && age >= 18 && age <= 75;
    const hasG9994 = cptRaw.some((c) => normalizeCode(c) === "G9994") && age >= 18 && age <= 75;
    const pos = record.POS;
    const hasG2105 =
      cptRaw.some((c) => normalizeCode(c) === "G2105") &&
      age >= 66 &&
      (pos == 32 || pos == 33 || pos == 34 || pos == 54 || pos == 56);
    const hasG2106 = cptRaw.some((c) => normalizeCode(c) === "G2106") && age >= 66;
    const hasG2107 = cptRaw.some((c) => normalizeCode(c) === "G2107") && age >= 66;
    const hasM1428 = hasCode(record, "M1428");

    return hasG9714 || hasG9994 || hasG2105 || hasG2106 || hasG2107 || hasM1428;
  };

  const patientQdc = new Map();
  const rowState = new WeakMap();

  for (const record of records) {
    const age = Number(record.AGE);
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const cptTokens = splitCodes(record.CPT).map((code) => normalizeCode(code));

    const icdMatched =
      age >= 18 && age <= 75 && icdTokens.some((code) => icdList.includes(code));
    const cptMatched =
      age >= 18 && age <= 75 && cptTokens.some((code) => cptList.includes(code));
    const baseRow = icdMatched && cptMatched;
    const excluded = baseRow && rowExcluded(record, age);
    const denominator = baseRow && !excluded;

    rowState.set(record, {
      icdFlag: icdMatched ? 1 : 0,
      cptFlag: cptMatched ? 1 : 0,
      denominator: denominator ? 1 : 0,
    });

    if (denominator) {
      const qdcStatus = getQdcStatus(record);
      if (qdcStatus) {
        const patientKey = getPatientKey(record);
        const existing = patientQdc.get(patientKey);
        if (!existing || (existing.met === 0 && qdcStatus.met === 1)) {
          patientQdc.set(patientKey, qdcStatus);
        }
      }
    }
  }

  await bulkUpdateRecords(collection, records, (record) => {
    const row = rowState.get(record);
    if (!row) return {};

    const qdc = row.denominator ? patientQdc.get(getPatientKey(record)) : null;
    const hasNumerator = row.denominator && qdc;

    return {
      ICD117: row.icdFlag,
      CPT117: row.cptFlag,
      M117: row.denominator,
      N117_MET: hasNumerator ? qdc.met : 0,
      N117_NOT_MET: hasNumerator ? qdc.notMet : 0,
      QDC117: hasNumerator ? qdc.qdc : "",
    };
  });

  return {
    message: "Measure 117 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure117DiabetesEyeExam,
  measure117: measure117DiabetesEyeExam,
};
