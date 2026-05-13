/**
 * Shared token parsing for flat-file extracts (multiple column names, robust age).
 */

const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const PROCEDURE_FIELD_NAMES = new Set(
  ["CPT", "HCPCS", "CPT1", "CPT2", "PROC", "PROCEDURE", "HCPCS_CD", "LINE_CPT", "QDC"].map((s) => s.toUpperCase()),
);

const ICD_FIELD_NAMES = new Set(
  [
    "ICD",
    "ICD1",
    "ICD2",
    "ICD3",
    "ICD01",
    "ICD02",
    "DX",
    "DX1",
    "DX2",
    "DXS",
    "DIAGNOSIS",
    "DIAG",
    "PRINCIPAL_ICD",
    "SECONDARY_ICD",
  ].map((s) => s.toUpperCase()),
);

/** Age as number; accepts numeric strings from Excel. */
function getNumericAge(record) {
  const raw = record.AGE;
  if (raw === undefined || raw === null || raw === "") return NaN;
  const n = Number(String(raw).trim().replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** All procedure-like codes from common upload column names + dynamic ICDn/DXn. */
function getProcedureTokens(record) {
  const out = [];
  for (const key of Object.keys(record)) {
    const ku = String(key).toUpperCase();
    if (PROCEDURE_FIELD_NAMES.has(ku)) {
      out.push(...splitCodes(record[key]).map(normalizeCode));
    }
  }
  return out;
}

/** All diagnosis tokens from common columns (dots already stripped in app transform for ICD). */
function getIcdTokens(record) {
  const out = [];
  for (const key of Object.keys(record)) {
    const ku = String(key).toUpperCase();
    if (ICD_FIELD_NAMES.has(ku)) {
      out.push(...splitCodes(record[key]).map(normalizeCode));
      continue;
    }
    if (/^ICD\d+$/i.test(key) || /^DX\d+$/i.test(key)) {
      out.push(...splitCodes(record[key]).map(normalizeCode));
    }
  }
  return out;
}

function getModTokens(record) {
  return splitCodes(record.MOD).map(normalizeCode);
}

/** True if any token is in set, or normalized ICD starts with one of the prefixes (e.g. J45 for asthma). */
function icdMatchesSetOrPrefix(icdNormalizedTokens, set, prefixes = []) {
  for (const t of icdNormalizedTokens) {
    if (set.has(t)) return true;
    for (const p of prefixes) {
      const pn = normalizeCode(p);
      if (pn && t.startsWith(pn)) return true;
    }
  }
  return false;
}

module.exports = {
  splitCodes,
  normalizeCode,
  getNumericAge,
  getProcedureTokens,
  getIcdTokens,
  getModTokens,
  icdMatchesSetOrPrefix,
};
