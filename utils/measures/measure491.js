const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getIcdTokens,
  getProcedureTokens,
  getModTokens,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/** 2026 MIPS CQM 491: primary CRC / endometrial / gastroesophageal / small bowel carcinoma (ICD-10-CM, dots stripped). */
const CANCER_ICD = new Set(
  [
    "C153", "C154", "C155", "C158", "C159", "C160", "C161", "C162", "C163", "C164", "C165", "C166", "C168", "C169",
    "C170", "C171", "C172", "C173", "C178", "C179", "C180", "C182", "C183", "C184", "C185", "C186", "C187", "C188",
    "C189", "C19", "C20", "C260", "C541", "C543", "C548", "C549", "C55",
  ].map((c) => normalizeCode(c))
);

const PATH_CPT = new Set(["88305", "88307", "88309"].map((c) => normalizeCode(c)));

const LYNCH_ICD = new Set(["Z1504", "Z1509", "Z800"].map((c) => normalizeCode(c)));

const EXCL_HCPCS_MOD = new Set(["M1467", "M1192"].map((c) => normalizeCode(c)));

/**
 * MIPS CQM 491 (2026): MMR/MSI biomarker testing status — denominator only.
 * Surgical pathology CPT (88305, 88307, 88309) + qualifying primary carcinoma ICD; excludes Lynch-related ICD,
 * M1467/M1192 value-set tokens, telehealth (M1426, GQ, GT, POS 02/10) on row.
 */
const measure491MmrMsiBiomarkerDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const icdTokens = getIcdTokens(record);
    const proc = getProcedureTokens(record);
    const mods = getModTokens(record);
    const allProc = [...proc, ...mods];

    const hasCancerDx = icdTokens.some((t) => CANCER_ICD.has(t));
    const hasLynchDx = icdTokens.some((t) => LYNCH_ICD.has(t));
    const hasPathCpt = proc.some((t) => PATH_CPT.has(t));

    const hasValueSetExcl = allProc.some((t) => EXCL_HCPCS_MOD.has(t));
    const telehealthMod =
      mods.includes(normalizeCode("GQ")) ||
      mods.includes(normalizeCode("GT")) ||
      allProc.includes(normalizeCode("M1426"));
    const pos = String(record.POS ?? "").trim();
    const telehealthPos = pos === "2" || pos === "10";

    const excluded = hasLynchDx || hasValueSetExcl || telehealthMod || telehealthPos;

    const denominatorMet = hasCancerDx && hasPathCpt && !excluded;

    return {
      ICD491: hasCancerDx ? 1 : 0,
      CPT491: hasPathCpt ? 1 : 0,
      E491: denominatorMet ? 0 : 1,
      N491_MET: 0,
      N491_NOT_MET: 0,
      QDC491: "",
      M491: denominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 491 denominator processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure491MmrMsiBiomarkerDenominator,
  measure491: measure491MmrMsiBiomarkerDenominator,
};
