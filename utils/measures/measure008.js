const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure008HfBetaBlockerLvsd = async (collection, records) => {
  // Shared denominator code sets
  const ctHeartFailureIcdCodes = [
    "I110", "I130", "I132", "I501", "I5020", "I5021", "I5022", "I5023", "I5030",
    "I5031", "I5032", "I5033", "I5040", "I5041", "I5042", "I5043", "I50814", "I5082",
    "I5083", "I5084", "I5089", "I509",
  ];

  const ctOutpatientEncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99242", "99243", "99244", "99245", "99304", "99305", "99306", "99307", "99308",
    "99309", "99310", "99315", "99316", "99341", "99342", "99344", "99345", "99347",
    "99348", "99349", "99350", "99424", "99426",
  ];

  const ctDischargeEncounterCodes = ["99238", "99239"];

  const getPatientKey = (record) => {
    const raw =
      record["PAT ID"] ??
      record["PATID"] ??
      record["PATIENT ID"] ??
      record["Patient ID"] ??
      record["MRN"] ??
      record["MEMBER ID"] ??
      record["Member ID"] ??
      record["PATIENT"];
    return raw === undefined || raw === null ? String(record._id) : String(raw);
  };

  const hasToken = (record, token) => {
    const codeString = `${record.CPT || ""} ${record.ICD || ""} ${record.MOD || ""}`;
    return codeString.split(" ").includes(token);
  };

  // Criteria-1 additional encounter is patient-level, so build state first.
  const patientState = new Map();
  for (const record of records) {
    const patientKey = getPatientKey(record);
    if (!patientState.has(patientKey)) {
      patientState.set(patientKey, {
        qualifyingOutpatientEncounters: 0,
        hasQualifyingDischargeEncounter: false,
        hasLvefLe40: false,
        hasTransplantOrLvad: false,
      });
    }
    const state = patientState.get(patientKey);

    const ctRecordIcdCodes = String(record.ICD || "")
      .replace(/\./g, "")
      .split(" ")
      .filter(Boolean);
    const ctRecordCptCodes = String(record.CPT || "")
      .replace(/\*/g, "")
      .split(" ")
      .filter(Boolean);

    const ctAgeOnEncounterDate = Number(record.AGE);
    const ctAgeEligible = ctAgeOnEncounterDate >= 18;

    const ctHasHeartFailureDxOnRecord =
      ctAgeEligible &&
      ctRecordIcdCodes.some((code) => ctHeartFailureIcdCodes.includes(code));
    const ctHasOutpatientEncounter =
      ctAgeEligible &&
      ctRecordCptCodes.some((code) => ctOutpatientEncounterCodes.includes(code));
    const ctHasDischargeEncounter =
      ctAgeEligible &&
      ctRecordCptCodes.some((code) => ctDischargeEncounterCodes.includes(code));
    const ctTelehealthForCriteria2 = hasToken(record, "M1426");

    if (ctHasOutpatientEncounter && ctHasHeartFailureDxOnRecord) {
      state.qualifyingOutpatientEncounters += 1;
    }
    if (ctHasDischargeEncounter && ctHasHeartFailureDxOnRecord && !ctTelehealthForCriteria2) {
      state.hasQualifyingDischargeEncounter = true;
    }
    state.hasLvefLe40 = state.hasLvefLe40 || hasToken(record, "G8923");
    state.hasTransplantOrLvad = state.hasTransplantOrLvad || hasToken(record, "M1152");
  }

  await bulkUpdateRecords(collection, records, (record) => {
    const patientKey = getPatientKey(record);
    const state = patientState.get(patientKey);
    if (!state) return null;

    const ctAgeOnEncounterDate = Number(record.AGE);
    const ctAgeEligible = ctAgeOnEncounterDate >= 18;

    const ctRecordIcdCodes = String(record.ICD || "")
      .replace(/\./g, "")
      .split(" ")
      .filter(Boolean);
    const ctHasHeartFailureDxOnRecord =
      ctAgeEligible &&
      ctRecordIcdCodes.some((code) => ctHeartFailureIcdCodes.includes(code));

    const ctRecordCptCodes = String(record.CPT || "")
      .replace(/\*/g, "")
      .split(" ")
      .filter(Boolean);
    const ctHasDischargeEncounter = ctRecordCptCodes.some((code) =>
      ctDischargeEncounterCodes.includes(code)
    );

    const ct1CriteriaDenominatorMet =
      ctAgeEligible &&
      state.qualifyingOutpatientEncounters >= 2 &&
      state.hasLvefLe40 &&
      !state.hasTransplantOrLvad;

    const ct2CriteriaDenominatorMet =
      ctAgeEligible &&
      state.hasQualifyingDischargeEncounter &&
      state.hasLvefLe40 &&
      !state.hasTransplantOrLvad;

    const ctDenominatorMet =
      ct1CriteriaDenominatorMet || ct2CriteriaDenominatorMet;

    return {
      ICD8C1: state.qualifyingOutpatientEncounters > 0 ? 1 : 0,
      CPT8C1: state.qualifyingOutpatientEncounters >= 2 ? 1 : 0,
      ICD8C2: ctHasHeartFailureDxOnRecord ? 1 : 0,
      CPT8C2: ctHasDischargeEncounter ? 1 : 0,
      E008: ctDenominatorMet ? 0 : 1,
      N008_MET: 0,
      N008_EXCEPTION: 0,
      N008_NOT_MET: 0,
      QDC008: "",
      M008: ctDenominatorMet ? 1 : 0,
    };
  });

  return {
    message: "Measure 8 denominator processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure008HfBetaBlockerLvsd,
  measure008: measure008HfBetaBlockerLvsd,
  measure8: measure008HfBetaBlockerLvsd,
};
