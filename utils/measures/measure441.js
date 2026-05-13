const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");
const {
  getProcedureTokens,
  getIcdTokens,
  getNumericAge,
  normalizeCode,
} = require("./helpers/clinicalTokens");

/**
 * MIPS CQM 441 (2026): IVD — all-or-none composite (denominator proxy, flat row).
 * Stratum 1: age 18–75 + CAD or stroke/TIA/pad risk ICDs + ≥2 encounter codes on row + alive (G9787) − hospice (G9690).
 * Stratum 2: age 18–75 + AMI ICD or PCI/CABG procedure + same encounter / alive / hospice rules.
 * Full measure needs multiple visits in period; row proxy counts distinct qualifying encounter tokens.
 */
const splitCsvCodes = (raw) =>
  new Set(
    raw
      .replace(/\*/g, "")
      .split(",")
      .map((c) => normalizeCode(c.trim()))
      .filter(Boolean)
  );

const cadIcdRaw = `I20.0, I20.1, I20.8, I20.81, I20.89, I20.9, I21.01, I21.02, I21.09, I21.11, I21.19, I21.21, I21.29, I21.3, I21.4, I21.9, I21.A1, I21.A9, I21.B, I22.0, I22.1, I22.8, I22.9, I24.0, I24.1, I24.8, I24.81, I24.89, I24.9, I25.10, I25.110, I25.111, I25.112, I25.118, I25.119, I25.2, I25.5, I25.6, I25.700, I25.701, I25.702, I25.708, I25.709, I25.710, I25.711, I25.712, I25.718, I25.719, I25.720, I25.721, I25.722, I25.728, I25.729, I25.730, I25.731, I25.732, I25.738, I25.739, I25.750, I25.751, I25.752, I25.758, I25.759, I25.760, I25.761, I25.762, I25.768, I25.769, I25.790, I25.791, I25.792, I25.798, I25.799, I25.810, I25.811, I25.812, I25.82, I25.83, I25.85, I25.89, I25.9, Z95.1, Z95.5, Z95.818, Z95.820, Z95.828, Z95.9, Z98.61, Z98.62`;

const riskIcdRaw = `I63.00, I63.011, I63.012, I63.013, I63.019, I63.02, I63.031, I63.032, I63.033, I63.039, I63.09, I63.10, I63.111, I63.112, I63.113, I63.119, I63.12, I63.131, I63.132, I63.133, I63.139, I63.19, I63.211, I63.212, I63.213, I63.219, I63.20, I63.22, I63.29, I63.231, I63.232, I63.233, I63.239, I63.30, I63.311, I63.312, I63.313, I63.319, I63.321, I63.322, I63.323, I63.329, I63.331, I63.332, I63.333, I63.339, I63.341, I63.342, I63.349, I63.39, I63.40, I63.411, I63.412, I63.413, I63.419, I63.421, I63.422, I63.423, I63.429, I63.431, I63.432, I63.433, I63.439, I63.441, I63.442, I63.449, I63.49, I63.50, I63.511, I63.512, I63.513, I63.519, I63.521, I63.522, I63.523, I63.529, I63.531, I63.532, I63.533, I63.539, I63.541, I63.542, I63.543, I63.549, I63.59, I63.6, I63.81, I63.89, I63.9, I65.01, I65.02, I65.03, I65.09, I65.1, I65.21, I65.22, I65.23, I65.29, I65.8, I65.9, I66.01, I66.02, I66.03, I66.09, I66.11, I66.12, I66.13, I66.19, I66.21, I66.22, I66.23, I66.29, I66.3, I66.8, I66.9, I70.1, I70.201, I70.202, I70.203, I70.208, I70.209, I70.211, I70.212, I70.213, I70.218, I70.219, I70.221, I70.222, I70.223, I70.228, I70.229, I70.231, I70.232, I70.233, I70.234, I70.235, I70.238, I70.239, I70.241, I70.242, I70.243, I70.244, I70.245, I70.248, I70.249, I70.25, I70.261, I70.262, I70.263, I70.268, I70.269, I70.291, I70.292, I70.293, I70.298, I70.299, I70.301, I70.302, I70.303, I70.308, I70.309, I70.311, I70.312, I70.313, I70.318, I70.319, I70.321, I70.322, I70.323, I70.328, I70.329, I70.331, I70.332, I70.333, I70.334, I70.335, I70.338, I70.339, I70.341, I70.342, I70.343, I70.344, I70.345, I70.348, I70.349, I70.35, I70.361, I70.362, I70.363, I70.368, I70.369, I70.391, I70.392, I70.393, I70.398, I70.399, I70.401, I70.402, I70.403, I70.408, I70.409, I70.411, I70.412, I70.413, I70.418, I70.419, I70.421, I70.422, I70.423, I70.428, I70.429, I70.431, I70.432, I70.433, I70.434, I70.435, I70.438, I70.439, I70.441, I70.442, I70.443, I70.444, I70.445, I70.448, I70.449, I70.45, I70.461, I70.462, I70.463, I70.468, I70.469, I70.491, I70.492, I70.493, I70.498, I70.499, I70.501, I70.502, I70.503, I70.508, I70.509, I70.511, I70.512, I70.513, I70.518, I70.519, I70.521, I70.522, I70.523, I70.528, I70.529, I70.531, I70.532, I70.533, I70.534, I70.535, I70.538, I70.539, I70.541, I70.542, I70.543, I70.544, I70.545, I70.548, I70.549, I70.55, I70.561, I70.562, I70.563, I70.568, I70.569, I70.591, I70.592, I70.593, I70.598, I70.599, I70.601, I70.602, I70.603, I70.608, I70.609, I70.611, I70.612, I70.613, I70.618, I70.619, I70.621, I70.622, I70.623, I70.628, I70.629, I70.631, I70.632, I70.633, I70.634, I70.635, I70.638, I70.639, I70.641, I70.642, I70.643, I70.644, I70.645, I70.648, I70.649, I70.65, I70.661, I70.662, I70.663, I70.668, I70.669, I70.691, I70.692, I70.693, I70.698, I70.699, I70.701, I70.702, I70.703, I70.708, I70.709, I70.711, I70.712, I70.713, I70.718, I70.719, I70.721, I70.722, I70.723, I70.728, I70.729, I70.731, I70.732, I70.733, I70.734, I70.735, I70.738, I70.739, I70.741, I70.742, I70.743, I70.744, I70.745, I70.748, I70.749, I70.75, I70.761, I70.762, I70.763, I70.768, I70.769, I70.791, I70.792, I70.793, I70.798, I70.799, I70.92, I75.011, I75.012, I75.013, I75.019, I75.021, I75.022, I75.023, I75.029, I75.81, I75.89`;

const amiIcdRaw = `I21.01, I21.02, I21.09, I21.11, I21.19, I21.21, I21.29, I21.3, I21.4, I21.9, I21.A1, I21.A9, I21.B, I22.0, I22.1, I22.8, I22.9`;

const encounterRaw = `98000, 98001, 98002, 98003, 98004, 98005, 98006, 98007, 98008, 98009, 98010, 98011, 98012, 98013, 98014, 98015, 98016, 99202, 99203, 99204, 99205, 99211, 99212, 99213, 99214, 99215, 99241, 99242, 99243, 99244, 99245, 99347, 99348, 99349, 99350, 99385, 99386, 99387, 99395, 99396, 99397, 99401, 99402, 99403, 99404, 99411, 99412, 99424, 99426, 99429, 99461, 99490, 99491, 99495, 99496, G0402, G0438, G0439, 99421, 99422, 99423, G2010, 99341, 99342, 99343, 99344, 99345`;

const pciRaw = `92920, 92924, 92930, 92933, 92937, 92941, 92943, 92945, C9600, C9602, C9604, C9606, C9607`;
const cabgRaw = `33509, 33510, 33511, 33512, 33513, 33514, 33516, 33533, 33534, 33535, 33536, 92920, 92924, 92928, 92933, S2205, S2206, S2207, S2208, S2209`;

const cadSet = splitCsvCodes(cadIcdRaw);
const riskSet = splitCsvCodes(riskIcdRaw);
const amiSet = splitCsvCodes(amiIcdRaw);
const encounterSet = splitCsvCodes(encounterRaw);
const pciSet = splitCsvCodes(pciRaw);
const cabgSet = splitCsvCodes(cabgRaw);

const countEncounterHits = (tokens) => tokens.filter((t) => encounterSet.has(t)).length;

const measure441IvdAllOrNone = async (collection, records) => {
  await bulkUpdateRecords(collection, records, (record) => {
    const age = getNumericAge(record);
    const ageOk = !Number.isNaN(age) && age >= 18 && age <= 75;

    const icdTokens = getIcdTokens(record);
    const codeTokens = getProcedureTokens(record);

    const hasCad = icdTokens.some((t) => cadSet.has(t));
    const hasRisk = icdTokens.some((t) => riskSet.has(t));
    const hasAmi = icdTokens.some((t) => amiSet.has(t));
    const hasPci = codeTokens.some((t) => pciSet.has(t));
    const hasCabg = codeTokens.some((t) => cabgSet.has(t));

    const encounterHits = countEncounterHits(codeTokens);
    const hasTwoEncounters = encounterHits >= 2;

    const alive = codeTokens.includes(normalizeCode("G9787"));
    const hospice = codeTokens.includes(normalizeCode("G9690"));

    const strat1Base = ageOk && (hasCad || hasRisk) && hasTwoEncounters && alive && !hospice;
    const strat2Base = ageOk && (hasAmi || hasPci || hasCabg) && hasTwoEncounters && alive && !hospice;

    const inDenominator = strat1Base || strat2Base;

    return {
      ICD441: hasCad || hasRisk || hasAmi ? 1 : 0,
      CPT441: hasTwoEncounters ? 1 : 0,
      M441S1: strat1Base ? 1 : 0,
      M441S2: strat2Base ? 1 : 0,
      M441: inDenominator ? 1 : 0,
      N441_MET: 0,
      N441_EXCEPTION: 0,
      N441_NOT_MET: 0,
      QDC441: "",
    };
  });

  return {
    message: "Measure 441 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure441IvdAllOrNone,
  measure441: measure441IvdAllOrNone,
};
