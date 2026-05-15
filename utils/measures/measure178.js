const path = require("path");
const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/** Legacy RA ICD list — utils/processing.js (211 codes). */
const raIcdCodes = new Set(require(path.join(__dirname, "data", "measure178LegacyIcd.json")));

/** Legacy denominator CPT — processing.js (no telehealth 980xx). */
const cptCodesToCompare178 = [
  "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
  "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
  "99424", "99426", "G0402", "G0468",
];

/**
 * M178 RA functional status — processing.js / Copy row logic:
 * same row age ≥18 + RA ICD + qualifying CPT (CPT column only); M178 only on those rows.
 */
const measure178RheumatoidArthritisFunctionalStatus = async (collection, records) => {
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

  const getQdcStatus = (record) => {
    if (hasCode(record, "1170F") && !splitCodes(record.MOD).map(normalizeCode).includes("8P")) {
      return { qdc: "1170F", met: 1, notMet: 0 };
    }
    if (hasCode(record, "1170F8P")) return { qdc: "1170F-8P", met: 0, notMet: 1 };
    const mods = splitCodes(record.MOD).map((m) => normalizeCode(m));
    if (mods.includes("8P") && hasCode(record, "1170F")) {
      return { qdc: "1170F-8P", met: 0, notMet: 1 };
    }
    return null;
  };

  const encounterNorm = cptCodesToCompare178.map((code) => normalizeCode(code));
  const patientQdc = new Map();
  const rowState = new WeakMap();

  for (const record of records) {
    const age = Number(record.AGE);
    const icdTokens = splitCodes(record.ICD);
    const cptTokens = splitCodes(record.CPT);

    const icdMatched = icdTokens.filter(
      (code) => raIcdCodes.has(normalizeCode(code)) && age >= 18
    );
    const cptMatched = cptTokens.filter(
      (code) => encounterNorm.includes(normalizeCode(code)) && age >= 18
    );
    const denominator = icdMatched.length > 0 && cptMatched.length > 0;

    rowState.set(record, {
      icdFlag: icdMatched.length > 0 ? 1 : 0,
      cptFlag: cptMatched.length > 0 ? 1 : 0,
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
      ICD178: row.icdFlag,
      CPT178: row.cptFlag,
      M178: row.denominator,
      N178_MET: hasNumerator ? qdc.met : 0,
      N178_NOT_MET: hasNumerator ? qdc.notMet : 0,
      QDC178: hasNumerator ? qdc.qdc : "",
    };
  });

  return {
    message: "Measure 178 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure178RheumatoidArthritisFunctionalStatus,
  measure178: measure178RheumatoidArthritisFunctionalStatus,
};
