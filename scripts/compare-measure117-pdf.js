/**
 * Compare measure117 ICD/CPT vs 2026 PDF denominator lists.
 */
const fs = require("fs");
const path = require("path");

const normalize = (code) =>
  String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const pdfIcdRaw = `E10.A2, E10.10, E10.11, E10.21, E10.22, E10.29, E10.311, E10.319,
E10.3211, E10.3212, E10.3213, E10.3219, E10.3291, E10.3292, E10.3293, E10.3299, E10.3311, E10.3312,
E10.3313, E10.3319, E10.3391, E10.3392, E10.3393, E10.3399, E10.3411, E10.3412, E10.3413, E10.3419,
E10.3491, E10.3492, E10.3493, E10.3499, E10.3511, E10.3512, E10.3513, E10.3519, E10.3521, E10.3522,
E10.3523, E10.3529, E10.3531, E10.3532, E10.3533, E10.3539, E10.3541, E10.3542, E10.3543, E10.3549,
E10.3551, E10.3552, E10.3553, E10.3559, E10.3591, E10.3592, E10.3593, E10.3599, E10.36, E10.37X1,
E10.37X2, E10.37X3, E10.37X9, E10.39, E10.40, E10.41, E10.42, E10.43, E10.44, E10.49, E10.51, E10.52,
E10.59, E10.610, E10.618, E10.620, E10.621, E10.622, E10.628, E10.630, E10.638, E10.641, E10.649, E10.65,
E10.69, E10.8, E10.9, E11.00, E11.01, E11.21, E11.22, E11.29, E11.311, E11.319, E11.3211, E11.3212,
E11.3213, E11.3219, E11.3291, E11.3292, E11.3293, E11.3299, E11.3311, E11.3312, E11.3313, E11.3319,
E11.3391, E11.3392, E11.3393, E11.3399, E11.3411, E11.3412, E11.3413, E11.3419, E11.3491, E11.3492,
E11.3493, E11.3499, E11.3511, E11.3512, E11.3513, E11.3519, E11.3521, E11.3522, E11.3523, E11.3529,
E11.3531, E11.3532, E11.3533, E11.3539, E11.3541, E11.3542, E11.3543, E11.3549, E11.3551, E11.3552,
E11.3553, E11.3559, E11.3591, E11.3592, E11.3593, E11.3599, E11.36, E11.37X1, E11.37X2, E11.37X3,
E11.37X9, E11.39, E11.40, E11.41, E11.42, E11.43, E11.44, E11.49, E11.51, E11.52, E11.59, E11.610,
E11.618, E11.620, E11.621, E11.622, E11.628, E11.630, E11.638, E11.641, E11.649, E11.65, E11.69, E11.8,
E11.9, E13.00, E13.01, E13.10, E13.11, E13.21, E13.22, E13.29, E13.311, E13.319, E13.3211, E13.3212,
E13.3213, E13.3219, E13.3291, E13.3292, E13.3293, E13.3299, E13.3311, E13.3312, E13.3313, E13.3319,
E13.3391, E13.3392, E13.3393, E13.3399, E13.3411, E13.3412, E13.3413, E13.3419, E13.3491, E13.3492,
E13.3493, E13.3499, E13.3511, E13.3512, E13.3513, E13.3519, E13.3521, E13.3522, E13.3523, E13.3529,
E13.3531, E13.3532, E13.3533, E13.3539, E13.3541, E13.3542, E13.3543, E13.3549, E13.3551, E13.3552,
E13.3553, E13.3559, E13.3591, E13.3592, E13.3593, E13.3599, E13.36, E13.37X1, E13.37X2, E13.37X3,
E13.37X9, E13.39, E13.40, E13.41, E13.42, E13.43, E13.44, E13.49, E13.51, E13.52, E13.59, E13.610,
E13.618, E13.620, E13.621, E13.622, E13.628, E13.630, E13.638, E13.641, E13.649, E13.65, E13.69, E13.8,
E13.9, O24.011, O24.012, O24.013, O24.019, O24.02, O24.03, O24.111, O24.112, O24.113, O24.119, O24.12,
O24.13, O24.311, O24.312, O24.313, O24.319, O24.32, O24.33, O24.811, O24.812, O24.813, O24.819, O24.82,
O24.83`;

const pdfCptRaw = `92002, 92004, 92012, 92014, 98000,
98001, 98002, 98003, 98004, 98005, 98006, 98007, 98008, 98009, 98010, 98011, 98012, 98013, 98014, 98015,
98016, 99202, 99203, 99204, 99205, 99212, 99213, 99214, 99215, 99341, 99342, 99344, 99345, 99347, 99348,
99349, 99350, 99385, 99386, 99387, 99395, 99396, 99397, G0402, G0438, G0439`;

const pdfIcd = new Set(
  pdfIcdRaw.split(/,\s*/).map((c) => normalize(c.trim())).filter(Boolean)
);
const pdfCpt = new Set(
  pdfCptRaw.split(/,\s*/).map((c) => normalize(c.trim())).filter(Boolean)
);

const implIcd = new Set(
  require(path.join(__dirname, "../utils/measures/data/measure117DiabetesIcd2026.json")).map(
    normalize
  )
);
const m117 = fs.readFileSync(
  path.join(__dirname, "../utils/measures/measure117.js"),
  "utf8"
);
const cptBlock = m117.match(/const cptCodesToCompare117 = new Set\(\[([\s\S]*?)\]\)/);
const implCpt = new Set([...cptBlock[1].matchAll(/"([^"]+)"/g)].map((m) => normalize(m[1])));

const missingIcd = [...pdfIcd].filter((c) => !implIcd.has(c)).sort();
const extraIcd = [...implIcd].filter((c) => !pdfIcd.has(c)).sort();
const missingCpt = [...pdfCpt].filter((c) => !implCpt.has(c)).sort();
const extraCpt = [...implCpt].filter((c) => !pdfCpt.has(c)).sort();

console.log("PDF ICD", pdfIcd.size, "impl", implIcd.size);
console.log("Missing ICD", missingIcd.length, missingIcd.slice(0, 20));
console.log("Extra ICD", extraIcd.length, extraIcd.slice(0, 20));
console.log("PDF CPT", pdfCpt.size, "impl", implCpt.size);
console.log("Missing CPT", missingCpt);
console.log("Extra CPT", extraCpt);
