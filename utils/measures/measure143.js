const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const CHEMO_ENCOUNTER_CODES = [
  "98000","98001","98002","98003","98004","98005","98006","98007",
  "99202","99203","99204","99205","99212","99213","99214","99215",
];
const CHEMO_PROCEDURE_CODES = [
  "50391","51720","96401","96405","96406","96409","96413","96416","96420","96422",
  "96425","96440","96446","96450","96521","96522","96523","96542","96549","G0498",
];
const RADIATION_ENCOUNTER_CODES = ["77427", "77431", "77432", "77435"];

const measure143OncologyPainIntensityQuantified = async (collection, records) => {
  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };
  const hasAnyCode = (record, codeSet, fields = ["CPT", "HCPCS"]) => {
    const tokens = fields.flatMap((field) => splitCodes(record[field])).map((code) => normalizeCode(code));
    return tokens.some((code) => codeSet.includes(code));
  };
  const isCancerDx = (record) => {
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    return icdTokens.some((code) => {
      if (code.startsWith("C")) return true;
      if (/^D(3[7-9]|4[0-9])/.test(code)) return true;
      return false;
    });
  };

  await bulkUpdateRecords(collection, records, (record) => {
    const ct1HasCancerDx = isCancerDx(record);

    // CT1 - Chemotherapy pathway
    const ct1HasEncounter = hasAnyCode(record, CHEMO_ENCOUNTER_CODES);
    const ct1HasBeforeWindowTherapy = hasAnyCode(record, CHEMO_PROCEDURE_CODES) || hasCode(record, "M1433");
    const ct1HasAfterWindowTherapy = hasAnyCode(record, CHEMO_PROCEDURE_CODES) || hasCode(record, "M1434");
    const ct1DenominatorMet = ct1HasCancerDx && ct1HasEncounter && ct1HasBeforeWindowTherapy && ct1HasAfterWindowTherapy;

    // CT2 - Radiation pathway
    const ct2HasEncounter = hasAnyCode(record, RADIATION_ENCOUNTER_CODES);
    const ct2TelehealthExcluded = hasCode(record, "M1426");
    const ct2DenominatorMet = ct1HasCancerDx && ct2HasEncounter && !ct2TelehealthExcluded;

    const ctDenominatorMet = ct1DenominatorMet || ct2DenominatorMet;

    return {
      ICD143C1: ct1DenominatorMet ? 1 : 0,
      CPT143C1: ct1DenominatorMet ? 1 : 0,
      ICD143C2: ct2DenominatorMet ? 1 : 0,
      CPT143C2: ct2DenominatorMet ? 1 : 0,
      M143: ctDenominatorMet ? 1 : 0,
      N143_MET: 0,
      N143_NOT_MET: 0,
      QDC143: "",
    };
  });

  return {
    message: "Measure 143 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure143OncologyPainIntensityQuantified,
  measure143: measure143OncologyPainIntensityQuantified,
};
