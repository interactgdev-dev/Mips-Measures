const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/**
 * MIPS CQM 450 / QID 450 (2026 MIPS CQM, v10.0 Dec 2025): HER2+ breast cancer — appropriate treatment (stage I T1c–III).
 * Denominator-only (legacy app pattern per measures ≤418): PDF denominator criteria on row; N450_* stay 0.
 * Not modeled: Jul 1 prior year–Jun 30 current year diagnosis window; same-day vs two-day encounter rules (needs dates).
 */
const measure450Her2BreastCancerTreatment = async (collection, records) => {
  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeIcd = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const normalizeToken = (value) => {
    const cleaned = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (/^\d+$/.test(cleaned)) return cleaned.replace(/^0+(?=\d)/, "");
    return cleaned;
  };

  const collectCodeTokens = (record) =>
    [
      ...splitCodes(record.CPT || record.cpt),
      ...splitCodes(record.HCPCS || record.hcpcs),
      ...splitCodes(record.CPT1 || record.cpt1),
      ...splitCodes(record.CPT2 || record.cpt2),
      ...splitCodes(record.QDC || record.qdc),
      ...splitCodes(record.MOD || record.mod),
      ...splitCodes(record.MOD1 || record.mod1),
      ...splitCodes(record.MODIFIER || record.modifier),
      ...splitCodes(record.MODIFIERS || record.modifiers),
    ].map((code) => normalizeToken(code));

  const breastIcdRaw = `C50.A0, C50.A1, C50.A2, C50.011, C50.012, C50.019, C50.021, C50.022, C50.029, C50.111, C50.112, C50.119, C50.121, C50.122, C50.129, C50.211, C50.212, C50.219, C50.221, C50.222, C50.229, C50.311, C50.312, C50.319, C50.321, C50.322, C50.329, C50.411, C50.412, C50.419, C50.421, C50.422, C50.429, C50.511, C50.512, C50.519, C50.521, C50.522, C50.529, C50.611, C50.612, C50.619, C50.621, C50.622, C50.629, C50.811, C50.812, C50.819, C50.821, C50.822, C50.829, C50.911, C50.912, C50.919, C50.921, C50.922, C50.929`;

  const breastIcdSet = new Set(
    breastIcdRaw
      .split(",")
      .map((c) => normalizeIcd(c.trim()))
      .filter(Boolean)
  );

  const encounterSet = new Set(
    ["99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215"].map((c) => normalizeToken(c))
  );

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageOk = Number.isFinite(age) && age >= 18 && age <= 70;

    const icdTokens = splitCodes(record.ICD || record.icd).map((c) => normalizeIcd(c));
    const codeTokens = collectCodeTokens(record);

    const hasBreastDx = icdTokens.some((t) => breastIcdSet.has(t));
    const encounterHits = codeTokens.filter((t) => encounterSet.has(t)).length;
    const hasTwoEncounters = encounterHits >= 2;

    const telehealth = codeTokens.includes("M1426");
    const her2Pos = codeTokens.includes("G9830");
    const stage2Or3 = codeTokens.includes("G9831");
    const stage1T1c = codeTokens.includes("G9832");
    const pregnancyExcl = codeTokens.includes("G2205");

    const denominatorMet =
      ageOk &&
      hasBreastDx &&
      hasTwoEncounters &&
      !telehealth &&
      her2Pos &&
      (stage2Or3 || stage1T1c) &&
      !pregnancyExcl;

    return {
      ICD450: hasBreastDx ? 1 : 0,
      CPT450: hasTwoEncounters ? 1 : 0,
      E450: denominatorMet ? 0 : 1,
      N450_MET: 0,
      N450_EXCEPTION: 0,
      N450_NOT_MET: 0,
      QDC450: "",
      M450: denominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 450 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure450Her2BreastCancerTreatment,
  measure450: measure450Her2BreastCancerTreatment,
};
