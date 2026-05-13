const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/** 2026 MIPS CQM 464 denominator OME ICD-10-CM (verbatim from measure PDF). */
const MEASURE464_OME_ICD_RAW =
  "H65.90, H65.91, H65.92, H65.93, H65.111, H65.112, H65.113, H65.114, H65.115, H65.116, H65.117, H65.119, H65.191, H65.192, H65.193, H65.194, H65.195, H65.196, H65.197, H65.199, H65.411, H65.412, H65.413, H65.419, H65.491, H65.492, H65.493, H65.499";

const MEASURE464_ENCOUNTER_CPTS = [
  "98002", "98003", "98006", "98007", "98010", "98011", "98014", "98015", "98016",
  "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
  "99242", "99243", "99244", "99245", "99381", "99382", "99383", "99384", "99391", "99392", "99393", "99394",
];

/**
 * MIPS CQM 464 / QID 464 (2026 MIPS CQM): OME — avoid systemic antimicrobials.
 * Denominator-only (legacy app pattern per measures ≤418): age ≥2 months–12y, OME ICD, encounter CPT per PDF.
 * N464_* stay 0; numerator QDC (G9959/G9960/G9961) from raw row data outside this processor.
 */
const measure464OmeAvoidSystemicAntimicrobials = async (collection, records) => {
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

  const omeIcdSet = new Set(
    MEASURE464_OME_ICD_RAW.split(",")
      .map((c) => normalizeIcd(c.trim()))
      .filter(Boolean)
  );
  const encounterSet = new Set(MEASURE464_ENCOUNTER_CPTS.map((c) => normalizeToken(c)));

  const ageEligible464 = (ageYears) => {
    if (!Number.isFinite(ageYears)) return false;
    const minYears = 2 / 12;
    return ageYears >= minYears && ageYears <= 12;
  };

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageOk = ageEligible464(age);

    const icdTokens = splitCodes(record.ICD || record.icd).map((c) => normalizeIcd(c));
    const codeTokens = collectCodeTokens(record);

    const hasOmeDx = icdTokens.some((t) => omeIcdSet.has(t));
    const hasEncounter = codeTokens.some((t) => encounterSet.has(t));

    const denominatorMet = ageOk && hasOmeDx && hasEncounter;

    return {
      ICD464: hasOmeDx ? 1 : 0,
      CPT464: hasEncounter ? 1 : 0,
      E464: denominatorMet ? 0 : 1,
      N464_MET: 0,
      N464_EXCEPTION: 0,
      N464_NOT_MET: 0,
      QDC464: "",
      M464: denominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 464 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure464OmeAvoidSystemicAntimicrobials,
  measure464: measure464OmeAvoidSystemicAntimicrobials,
};
