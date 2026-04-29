const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure006CadAntiplateletTherapy = async (collection, records) => {
  // CT1 - Denominator code sets
  const ct1CadIcdCodes = [
    "I200", "I201", "I202", "I2081", "I2089", "I209", "I2101", "I2102", "I2109",
    "I2111", "I2119", "I2121", "I2129", "I213", "I214", "I219", "I21A9", "I240", "I2489", "I249",
    "I2510", "I25110", "I25111", "I25112", "I25118", "I25119", "I252", "I255", "I256",
    "I25700", "I25701", "I25702", "I25708", "I25709", "I25710", "I25711", "I25712", "I25718", "I25719",
    "I25720", "I25721", "I25722", "I25728", "I25729", "I25730", "I25731", "I25732", "I25738", "I25739",
    "I25750", "I25751", "I25752", "I25758", "I25759", "I25760", "I25761", "I25762", "I25768", "I25769",
    "I25790", "I25791", "I25792", "I25798", "I25799", "I25810", "I25811", "I25812", "I2582", "I2583",
    "I2584", "I2589", "I259", "Z951", "Z955", "Z9861",
  ];

  const ct1EncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99242", "99243", "99244", "99245", "99304", "99305", "99306", "99307", "99308",
    "99309", "99310", "99315", "99316", "99341", "99342", "99344", "99345", "99347",
    "99348", "99349", "99350", "99424", "99426",
  ];

  await bulkUpdateRecords(collection, records, (record) => {
    const ct1RecordIcdCodes = String(record.ICD || "")
      .replace(/\./g, "")
      .split(" ")
      .filter(Boolean);
    const ct1RecordCptCodes = String(record.CPT || "")
      .replace(/\*/g, "")
      .split(" ")
      .filter(Boolean);

    const ct1AgeOnEncounterDate = Number(record.AGE);
    const ct1AgeEligible = ct1AgeOnEncounterDate >= 18;

    const ct1HasCadDiagnosis =
      ct1AgeEligible &&
      ct1RecordIcdCodes.some((code) => ct1CadIcdCodes.includes(code));
    const ct1HasEncounter =
      ct1AgeEligible &&
      ct1RecordCptCodes.some((code) => ct1EncounterCodes.includes(code));

    const ct1DenominatorMet = ct1HasCadDiagnosis && ct1HasEncounter;

    return {
      ICD6: ct1HasCadDiagnosis ? 1 : 0,
      CPT6: ct1HasEncounter ? 1 : 0,
      E006: ct1DenominatorMet ? 0 : 1,
      N006_MET: 0,
      N006_EXCEPTION: 0,
      N006_NOT_MET: 0,
      QDC006: "",
      M006: ct1DenominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 6 denominator processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure006CadAntiplateletTherapy,
  measure006: measure006CadAntiplateletTherapy,
  measure6: measure006CadAntiplateletTherapy,
};
