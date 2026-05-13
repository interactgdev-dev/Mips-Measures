const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getProcedureTokens,
  getIcdTokens,
  getModTokens,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 440 (2026): Skin cancer — timely path biopsy report to clinician (denominator proxy).
 * Qualifying skin/melanoma/sarcoma-related ICDs + CPT 88304 or 88305 (aligned with legacy processing.js).
 * Exclusions on row: G9784 (second opinion), G9939 (same clinician). Telehealth-style MOD/POS filter on biopsy line.
 */
const icdBccSccRaw = `C44.01, C44.02, C44.111, C44.1121, C44.1122, C44.1191, C44.1192, C44.121, C44.1221, C44.1222, C44.1291, C44.1292, C44.211, C44.212, C44.219, C44.221, C44.222, C44.229, C44.310, C44.311, C44.319, C44.320, C44.321, C44.329, C44.41, C44.42, C44.510, C44.511, C44.519, C44.520, C44.521, C44.529, C44.611, C44.612, C44.619, C44.621, C44.622, C44.629, C44.711, C44.712, C44.719, C44.721, C44.722, C44.729, C44.81, C44.82, C44.91, C44.92, D00.01, D04.0, D04.10, D04.111, D04.112, D04.121, D04.122, D04.20, D04.21, D04.22, D04.30, D04.39, D04.4, D04.5, D04.60, D04.61, D04.62, D04.70, D04.71, D04.72, D04.8, D04.9`;
const icdMelanomaRaw = `C43.0, C43.10, C43.111, C43.112, C43.121, C43.122, C43.20, C43.21, C43.22, C43.30, C43.31, C43.39, C43.4, C43.51, C43.52, C43.59, C43.60, C43.61, C43.62, C43.70, C43.71, C43.72, C43.8, C43.9, D03.0, D03.10, D03.111, D03.112, D03.121, D03.122, D03.20, D03.21, D03.22, D03.30, D03.39, D03.4, D03.51, D03.52, D03.59, D03.60, D03.61, D03.62, D03.70, D03.71, D03.72, D03.8, D03.9`;
const icdOtherMalignantRaw = `C06.0, C06.1, C06.2, C06.80, C06.89, C06.9, C44.90, C44.99, C46.0, C46.1, C49.0, C49.10, C49.11, C49.12, C49.20, C49.21, C49.22, C49.3, C49.4, C49.5, C49.6, C49.8, C49.9`;

const parseIcdSet = (raw) =>
  new Set(
    raw
      .split(",")
      .map((c) => normalizeCode(c.trim()))
      .filter(Boolean)
  );

const denomIcdSet = new Set([
  ...parseIcdSet(icdBccSccRaw),
  ...parseIcdSet(icdMelanomaRaw),
  ...parseIcdSet(icdOtherMalignantRaw),
]);

const BIOPSY_CPTS = new Set([normalizeCode("88304"), normalizeCode("88305")]);
const EXCLUDED_MODS = new Set(["GQ", "GT", "95"]);

function biopsyPassesModPos(record, procedureTokens) {
  const hasBiopsy = procedureTokens.some((t) => BIOPSY_CPTS.has(t));
  if (!hasBiopsy) return false;
  const modTokens = getModTokens(record);
  if (modTokens.some((m) => EXCLUDED_MODS.has(m))) return false;
  const pos = String(record.POS ?? "").trim();
  if (pos === "2" || pos === "10") return false;
  return true;
}

const measure440SkinCancerBiopsyReportingTime = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const icdTokens = getIcdTokens(record);
    const procedureTokens = getProcedureTokens(record);

    const hasQualifyingIcd = icdTokens.some((t) => denomIcdSet.has(t));
    const hasQualifyingBiopsy = biopsyPassesModPos(record, procedureTokens);

    const exclusionSecondOpinion = procedureTokens.includes(normalizeCode("G9784"));
    const exclusionSameClinician = procedureTokens.includes(normalizeCode("G9939"));

    const denominatorMet =
      hasQualifyingIcd &&
      hasQualifyingBiopsy &&
      !exclusionSecondOpinion &&
      !exclusionSameClinician;

    return {
      ICD440: hasQualifyingIcd ? 1 : 0,
      CPT440: hasQualifyingBiopsy ? 1 : 0,
      M440: denominatorMet ? 1 : 0,
      N440_MET: 0,
      N440_EXCEPTION: 0,
      N440_NOT_MET: 0,
      QDC440: "",
    };
  });

  return {
    message: "Measure 440 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure440SkinCancerBiopsyReportingTime,
  measure440: measure440SkinCancerBiopsyReportingTime,
};
