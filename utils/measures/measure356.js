const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

/** 2026 MIPS CQM #356 denominator CPT list (principal surgical procedures), from measure PDF. */
const CPT356_DENOMINATOR_SPEC = `
11004, 11005, 11006, 15734, 15778, 15920, 15931, 15933,
15940, 15950, 19306, 20100, 20101, 20102, 21601, 21602, 21603, 21811, 21812, 21813, 22904, 22905, 27080, 35221,
35251, 35281, 35840, 36565, 36566, 37617, 38100, 38115, 38120, 38530, 38531, 38564, 38765, 39501, 39540, 39541,
39560, 43122, 43279, 43281, 43282, 43286, 43287, 43288, 43325, 43327, 43330, 43332, 43333, 43336, 43337, 43340,
43497, 43500, 43501, 43502, 43510, 43520, 43605, 43610, 43611, 43620, 43621, 43622, 43631, 43632, 43633, 43634,
43640, 43641, 43644, 43645, 43651, 43652, 43653, 43772, 43773, 43774, 43775, 43800, 43810, 43820, 43825, 43830,
43831, 43832, 43840, 43843, 43845, 43846, 43847, 43848, 43860, 43865, 43870, 43880, 44005, 44010, 44020, 44021,
44025, 44050, 44055, 44110, 44111, 44120, 44125, 44126, 44127, 44130, 44140, 44141, 44143, 44144, 44145, 44146,
44147, 44150, 44151, 44155, 44156, 44157, 44158, 44160, 44180, 44186, 44187, 44188, 44202, 44204, 44205, 44206,
44207, 44208, 44210, 44211, 44212, 44227, 44300, 44310, 44312, 44314, 44316, 44320, 44322, 44340, 44345, 44346,
44602, 44603, 44604, 44605, 44615, 44620, 44625, 44626, 44640, 44650, 44660, 44661, 44680, 44700, 44800, 44820,
44850, 44900, 44950, 44960, 44970, 45000, 45020, 45110, 45111, 45112, 45113, 45114, 45116, 45119, 45120, 45121,
45123, 45126, 45130, 45135, 45136, 45395, 45397, 45400, 45402, 45540, 45550, 45562, 45563, 45800, 45805, 47010,
47015, 47100, 47120, 47122, 47125, 47130, 47300, 47350, 47360, 47361, 47362, 47370, 47380, 47400, 47420, 47425,
47460, 47480, 47564, 47570, 47600, 47605, 47610, 47612, 47620, 47711, 47712, 47715, 47720, 47721, 47740, 47741,
47760, 47765, 47780, 47785, 47800, 47801, 47900, 48000, 48001, 48020, 48100, 48105, 48120, 48140, 48145, 48146,
48148, 48150, 48152, 48153, 48154, 48155, 48500, 48510, 48520, 48540, 48545, 48547, 48548, 49000, 49002, 49010,
49013, 49014, 49020, 49040, 49060, 49062, 49084, 49186, 49187, 49188, 49189, 49190, 49215, 49255, 49320, 49322,
49323, 49402, 49425, 49429, 49553, 49557, 49596, 49616, 49617, 49618, 49621, 49622, 49900, 50205, 50500, 50740,
57305, 57307, 60200, 60254, 60270, 60540, 60545, 60650
`.trim();

const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const denominatorNormalized = new Set(
  splitCodes(CPT356_DENOMINATOR_SPEC).map((c) => normalizeCode(c))
);

/**
 * MIPS CQM 356 (2026): Unplanned hospital readmission within 30 days (inverse). Denominator only.
 * Age 18+ and denominator CPT from PDF.
 */
const measure356UnplannedReadmissionDenominator = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageOk = !Number.isNaN(age) && age >= 18;

    const procedureTokens = [
      ...splitCodes(record.CPT),
      ...splitCodes(record.HCPCS),
      ...splitCodes(record.CPT1),
    ].map((code) => normalizeCode(code));
    const hasProcedure = procedureTokens.some((code) => denominatorNormalized.has(code));

    const inDenominator = ageOk && hasProcedure;

    return {
      CPT356: inDenominator ? 1 : 0,
      M356: inDenominator ? 1 : 0,
      N356_MET: 0,
      N356_EXCEPTION: 0,
      N356_NOT_MET: 0,
      QDC356: "",
    };
  });

  return {
    message: "Measure 356 (denominator) processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure356UnplannedReadmissionDenominator,
  measure356: measure356UnplannedReadmissionDenominator,
};
