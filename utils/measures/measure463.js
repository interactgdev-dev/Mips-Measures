const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/** 2026 MIPS CQM 463 denominator anesthesia CPT list (verbatim from measure PDF). */
const MEASURE463_ANESTHESIA_CPT_RAW = `00100, 00102, 00103, 00104, 00120, 00124, 00126, 00140, 00142, 00144, 00145, 00147, 00148, 00160, 00162, 00164, 00170, 00172, 00174, 00176, 00190, 00192, 00210, 00211, 00212, 00214, 00215, 00216, 00218, 00220, 00222, 00300, 00320, 00322, 00350, 00352, 00400, 00402, 00404, 00406, 00410, 00450, 00454, 00470, 00472, 00474, 00500, 00520, 00522, 00524, 00528, 00529, 00530, 00532, 00534, 00537, 00539, 00540, 00541, 00542, 00546, 00548, 00550, 00560, 00562, 00563, 00566, 00567, 00580, 00600, 00604, 00620, 00625, 00626, 00630, 00632, 00635, 00640, 00670, 00700, 00702, 00730, 00731, 00732, 00750, 00752, 00754, 00756, 00770, 00790, 00792, 00794, 00796, 00797, 00800, 00802, 00811, 00812, 00813, 00820, 00830, 00832, 00840, 00842, 00844, 00846, 00848, 00851, 00860, 00862, 00864, 00865, 00866, 00868, 00870, 00872, 00873, 00880, 00882, 00902, 00904, 00906, 00908, 00910, 00912, 00914, 00916, 00918, 00920, 00921, 00922, 00924, 00926, 00928, 00930, 00932, 00934, 00936, 00938, 00940, 00942, 00944, 00948, 00950, 00952, 01112, 01120, 01130, 01140, 01150, 01160, 01170, 01173, 01200, 01202, 01210, 01212, 01214, 01215, 01220, 01230, 01232, 01234, 01250, 01260, 01270, 01272, 01274, 01320, 01340, 01360, 01380, 01382, 01390, 01392, 01400, 01402, 01404, 01420, 01430, 01432, 01440, 01442, 01444, 01462, 01464, 01470, 01472, 01474, 01480, 01482, 01484, 01486, 01490, 01500, 01502, 01520, 01522, 01610, 01620, 01622, 01630, 01634, 01636, 01638, 01650, 01652, 01654, 01656, 01670, 01680, 01710, 01712, 01714, 01716, 01730, 01732, 01740, 01742, 01744, 01756, 01758, 01760, 01770, 01772, 01780, 01782, 01810, 01820, 01829, 01830, 01832, 01840, 01842, 01844, 01850, 01852, 01860, 01916, 01920, 01922, 01924, 01925, 01926, 01930, 01931, 01932, 01933, 01937, 01938, 01939, 01940, 01941, 01942, 01951, 01952, 01958, 01960, 01961, 01962, 01963, 01965, 01966, 01991, 01992`;

/**
 * MIPS CQM 463 / QID 463 (2026 MIPS CQM): pediatric POV — combination antiemetic therapy.
 * Denominator-only (legacy app pattern per measures ≤418): age 3–17, anesthesia CPT set, 4554F, G9954, not G9955.
 * N463_* stay 0; numerator QDC from raw row data outside this processor.
 */
const measure463PediatricPovCombinationTherapy = async (collection, records) => {
  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
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

  const anesthesiaCptSet = new Set(
    MEASURE463_ANESTHESIA_CPT_RAW.split(/,\s*/)
      .map((c) => normalizeToken(c.trim()))
      .filter(Boolean)
  );

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageOk = Number.isFinite(age) && age >= 3 && age <= 17;
    const codeTokens = collectCodeTokens(record);

    const hasAnesthesiaCpt = codeTokens.some((t) => anesthesiaCptSet.has(t));
    const inhalationalMaintenance = codeTokens.includes("4554F");
    const twoOrMoreRiskFactors = codeTokens.includes("G9954");
    const inductionOnlyExclusion = codeTokens.includes("G9955");

    const denominatorMet =
      ageOk && hasAnesthesiaCpt && inhalationalMaintenance && twoOrMoreRiskFactors && !inductionOnlyExclusion;

    return {
      CPT463: hasAnesthesiaCpt ? 1 : 0,
      E463: denominatorMet ? 0 : 1,
      N463_MET: 0,
      N463_EXCEPTION: 0,
      N463_NOT_MET: 0,
      QDC463: "",
      M463: denominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 463 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure463PediatricPovCombinationTherapy,
  measure463: measure463PediatricPovCombinationTherapy,
};
