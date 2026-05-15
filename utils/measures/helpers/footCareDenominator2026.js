const path = require("path");
const bulkUpdateRecords = require("./bulkUpdateRecords");

const diabetesIcd126 = new Set(require(path.join(__dirname, "../data/measure126LegacyIcd.json")));
const diabetesIcd127 = new Set(require(path.join(__dirname, "../data/measure127LegacyIcd.json")));

const baseEncounterCptCodes = [
  "11042", "11043", "11044", "11055", "11056", "11057",
  "11719", "11720", "11721", "11730", "11740",
  "97161", "97162", "97163", "97164", "97597", "97802", "97803",
  "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
  "99304", "99305", "99306", "99307", "99308", "99309", "99310",
  "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
];

const encounterCptCodes127 = [...baseEncounterCptCodes, "G0127"];

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

const pickBetterQdc = (current, incoming) => {
  const rank = { met: 3, exception: 2, not_met: 1 };
  return rank[incoming.status] > rank[current.status] ? incoming : current;
};

/**
 * Row-level denominator — processing - Copy.js measure126 / measure127:
 * same row: age ≥18 + exact diabetes ICD + qualifying CPT (CPT column only); M### only on those rows.
 */
async function runFootCareRowLegacy(collection, records, {
  fieldPrefix,
  encounterList,
  exclusionCode,
  diabetesIcdSet,
  getQdcStatus,
}) {
  const encounterNorm = encounterList.map((code) => normalizeCode(code));
  const exclusionNorm = normalizeCode(exclusionCode);
  const patientQdc = new Map();
  const rowState = new WeakMap();

  for (const record of records) {
    const age = Number(record.AGE);
    const icdTokens = splitCodes(record.ICD);
    const cptTokens = splitCodes(record.CPT);

    const icdMatched = icdTokens.filter(
      (code) => diabetesIcdSet.has(normalizeCode(code)) && age >= 18
    );
    const cptMatched = cptTokens.filter(
      (code) => encounterNorm.includes(normalizeCode(code)) && age >= 18
    );
    const exclusionOnRow =
      cptTokens.some((code) => normalizeCode(code) === exclusionNorm) && age >= 18;
    const telehealth =
      icdMatched.length > 0 && cptMatched.length > 0 && hasCode(record, "M1426");

    const denominator =
      icdMatched.length > 0 && cptMatched.length > 0 && !exclusionOnRow && !telehealth;

    rowState.set(record, {
      icdFlag: icdMatched.length > 0 ? 1 : 0,
      cptFlag: cptMatched.length > 0 ? 1 : 0,
      denominator: denominator ? 1 : 0,
    });

    if (denominator && getQdcStatus) {
      const qdcStatus = getQdcStatus(record);
      if (qdcStatus) {
        const patientKey = getPatientKey(record);
        const existing = patientQdc.get(patientKey);
        patientQdc.set(patientKey, existing ? pickBetterQdc(existing, qdcStatus) : qdcStatus);
      }
    }
  }

  await bulkUpdateRecords(collection, records, (record) => {
    const row = rowState.get(record);
    if (!row) return {};

    const qdc = row.denominator ? patientQdc.get(getPatientKey(record)) : null;

    return {
      [`ICD${fieldPrefix}`]: row.icdFlag,
      [`CPT${fieldPrefix}`]: row.cptFlag,
      [`M${fieldPrefix}`]: row.denominator,
      [`N${fieldPrefix}_MET`]: qdc && qdc.status === "met" ? 1 : 0,
      [`N${fieldPrefix}_EXCEPTION`]: qdc && qdc.status === "exception" ? 1 : 0,
      [`N${fieldPrefix}_NOT_MET`]: qdc && qdc.status === "not_met" ? 1 : 0,
      [`QDC${fieldPrefix}`]: qdc ? qdc.qdc : "",
    };
  });

  return {
    message: `Measure ${fieldPrefix} processed successfully`,
    totalRecords: records.length,
  };
}

module.exports = {
  diabetesIcd126,
  diabetesIcd127,
  baseEncounterCptCodes,
  encounterCptCodes127,
  getPatientKey,
  splitCodes,
  normalizeCode,
  hasCode,
  runFootCareRowLegacy,
};
