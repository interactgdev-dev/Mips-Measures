const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure005HeartFailureLvef = async (collection, records) => {
  // CT1 - Shared denominator code sets
  const ct1HeartFailureIcdCodes = [
    "I110", "I130", "I132", "I501", "I5020", "I5021", "I5022", "I5023", "I5030",
    "I5031", "I5032", "I5033", "I5040", "I5041", "I5042", "I5043", "I50814", "I5082",
    "I5083", "I5084", "I5089", "I509",
  ];

  const ct1OutpatientEncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99242", "99243", "99244", "99245", "99304", "99305", "99306", "99307", "99308",
    "99309", "99310", "99315", "99316", "99341", "99342", "99344", "99345", "99347",
    "99348", "99349", "99350", "99424", "99426",
  ];

  const ct2DischargeEncounterCodes = ["99238", "99239"];

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

    // Shared checks used by both criteria
    const ct1HasHeartFailureDx =
      ct1AgeEligible &&
      ct1RecordIcdCodes.some((code) => ct1HeartFailureIcdCodes.includes(code));
    const ct1HasLvefLe40 = ct1RecordCptCodes.includes("M1150");
    const ct1DenominatorExcluded = ct1RecordCptCodes.includes("M1151");

    // Criteria 1 (outpatient): needs encounter for numerator evaluation + one additional encounter
    const ct1MatchedOutpatientEncounters = ct1RecordCptCodes.filter((code) =>
      ct1OutpatientEncounterCodes.includes(code)
    );
    const ct1HasOutpatientEncounter = ct1MatchedOutpatientEncounters.length > 0;
    const ct1HasAdditionalOutpatientEncounter =
      ct1MatchedOutpatientEncounters.length >= 2;
    const ct1Criteria1DenominatorMet =
      ct1HasHeartFailureDx &&
      ct1HasOutpatientEncounter &&
      ct1HasAdditionalOutpatientEncounter &&
      ct1HasLvefLe40 &&
      !ct1DenominatorExcluded;

    // Criteria 2 (discharge): discharge encounter and not telehealth
    const ct2HasDischargeEncounter = ct1RecordCptCodes.some((code) =>
      ct2DischargeEncounterCodes.includes(code)
    );
    const ct2TelehealthEncounter = ct1RecordCptCodes.includes("M1426");
    const ct2Criteria2DenominatorMet =
      ct1HasHeartFailureDx &&
      ct2HasDischargeEncounter &&
      !ct2TelehealthEncounter &&
      ct1HasLvefLe40 &&
      !ct1DenominatorExcluded;

    const ctDenominatorMet =
      ct1Criteria1DenominatorMet || ct2Criteria2DenominatorMet;

    return {
      ICD5C1: ct1HasHeartFailureDx ? 1 : 0,
      CPT5C1: ct1HasOutpatientEncounter ? 1 : 0,
      ICD5C2: ct1HasHeartFailureDx ? 1 : 0,
      CPT5C2: ct2HasDischargeEncounter ? 1 : 0,
      E005: ctDenominatorMet ? 0 : 1,
      N005_MET: 0,
      N005_EXCEPTION: 0,
      N005_NOT_MET: 0,
      QDC005: "",
      M005: ctDenominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 5 denominator processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure005HeartFailureLvef,
  measure005: measure005HeartFailureLvef,
  measure5: measure005HeartFailureLvef,
};
