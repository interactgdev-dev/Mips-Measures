const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/**
 * 2026 MIPS CQM 477 denominator CPT list (verbatim from measure PDF).
 * Multimodal pain management — selected surgical procedures.
 */
const MEASURE477_SURGICAL_CPT_RAW = `00102, 00120, 00160, 00162, 00172, 00174, 00190, 00222, 00300, 00320, 00402, 00404, 00406, 00450, 00470, 00472, 00500, 00528, 00529, 00539, 00540, 00541, 00542, 00546, 00548, 00600, 00620, 00625, 00626, 00630, 00670, 00700, 00730, 00750, 00752, 00754, 00756, 00770, 00790, 00792, 00794, 00797, 00800, 00820, 00830, 00832, 00840, 00844, 00846, 00848, 00860, 00862, 00864, 00865, 00866, 00870, 00872, 00873, 00880, 00902, 00906, 00910, 00912, 00914, 00916, 00918, 00920, 00940, 00942, 00948, 01120, 01160, 01170, 01173, 01210, 01214, 01215, 01220, 01230, 01360, 01392, 01400, 01402, 01480, 01482, 01484, 01486, 01630, 01634, 01636, 01638, 01740, 01742, 01744, 01760, 01830, 01832, 01961`;

/**
 * MIPS CQM 477 / QID 477 (2026): Multimodal pain management.
 * Denominator: age ≥18, listed surgical CPT, not emergent exclusion M1142 (PDF).
 * N477_* stay 0; numerator (G2148/G2149/G2150) from raw row outside this processor.
 */
const measure477MultimodalPainManagement = async (collection, records) => {
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

  const surgicalCptSet = new Set(
    MEASURE477_SURGICAL_CPT_RAW.split(/,\s*/)
      .map((c) => normalizeToken(c.trim()))
      .filter(Boolean)
  );

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageOk = Number.isFinite(age) && age >= 18;
    const codeTokens = collectCodeTokens(record);

    const hasSurgicalCpt = codeTokens.some((t) => surgicalCptSet.has(t));
    const emergentExclusion = codeTokens.includes("M1142");

    const denominatorMet = ageOk && hasSurgicalCpt && !emergentExclusion;

    return {
      CPT477: hasSurgicalCpt ? 1 : 0,
      E477: denominatorMet ? 0 : 1,
      N477_MET: 0,
      N477_EXCEPTION: 0,
      N477_NOT_MET: 0,
      QDC477: "",
      M477: denominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 477 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure477MultimodalPainManagement,
  measure477: measure477MultimodalPainManagement,
};
