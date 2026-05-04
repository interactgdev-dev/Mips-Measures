const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure243CardiacRehabReferralOutpatient = async (collection, records) => {
  // CT1 - Qualifying denominator encounter value set.
  const ct1EncounterCodes = [
    "98000", "98001", "98002", "98003", "98004", "98005", "98006", "98007", "98008",
    "98009", "98010", "98011", "98012", "98013", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99242", "99243", "99244", "99245",
    "99304", "99305", "99306", "99307", "99308", "99309", "99310", "99315", "99316",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99424", "99426",
    "G0438", "G0439",
  ];

  // CT2/CT3 - Qualifying diagnosis value sets.
  const ct2ChronicStableAnginaIcd = [
    "I20.1", "I20.2", "I20.81", "I20.89", "I20.9", "I25.112", "I25.702", "I25.712", "I25.722", "I25.732", "I25.752", "I25.762", "I25.792",
  ];
  const ct3AcuteMiIcd = [
    "I21.01", "I21.02", "I21.09", "I21.11", "I21.19", "I21.21", "I21.29", "I21.3", "I21.4", "I21.9", "I21.A9", "I21.B", "I22.0", "I22.1", "I22.2", "I22.8", "I22.9", "I25.2",
  ];
  // CT4-CT7 - Qualifying procedure value sets.
  const ct4CabgCpt = ["33510", "33511", "33512", "33513", "33514", "33516", "33533", "33534", "33535", "33536"];
  const ct5PciCpt = ["92920", "92924", "92928", "92930", "92933", "92937", "92941", "92943", "92945"];
  const ct6ValveCpt = [
    "0345T", "0483T", "0484T", "0543T", "0544T", "0545T", "0569T", "0646T",
    "33361", "33362", "33363", "33364", "33365", "33366", "33390", "33391",
    "33404", "33405", "33406", "33410", "33411", "33412", "33413", "33414", "33415", "33416", "33417", "33418",
    "33420", "33422", "33425", "33426", "33427", "33430", "33440", "33460", "33463", "33464", "33465", "33468", "33474", "33475", "33476", "33477", "33478", "33496",
    "33600", "33602",
  ];
  const ct7TransplantCpt = ["33935", "33945"];

  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const hasCode = (record, code) => {
    const target = normalizeCode(code);
    const tokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.ICD)];
    return tokens.some((token) => normalizeCode(token) === target);
  };

  await bulkUpdateRecords(collection, records, (record) => {
    // CT1 - Age and encounter checks.
    const ct1Age = Number(record.AGE);
    const ct1IsEligibleAge = ct1Age >= 18;

    const cptTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((code) => normalizeCode(code));
    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));

    const ct1HasEncounter = cptTokens.some((code) => ct1EncounterCodes.includes(code));
    // CT2-CT7 - Clinical qualifying-path checks.
    const ct2HasAnginaDx = icdTokens.some((code) => ct2ChronicStableAnginaIcd.map(normalizeCode).includes(code));
    const ct3HasAcuteMiDx = icdTokens.some((code) => ct3AcuteMiIcd.map(normalizeCode).includes(code));
    const ct4HasCabg = cptTokens.some((code) => ct4CabgCpt.includes(code));
    const ct5HasPci = cptTokens.some((code) => ct5PciCpt.includes(code));
    const ct6HasValveSurgery = cptTokens.some((code) => ct6ValveCpt.includes(code));
    const ct7HasTransplant = cptTokens.some((code) => ct7TransplantCpt.includes(code));

    // Any qualifying diagnosis or procedure satisfies the clinical path.
    const ct9HasQualifyingPath = ct2HasAnginaDx || ct3HasAcuteMiDx || ct4HasCabg || ct5HasPci || ct6HasValveSurgery || ct7HasTransplant;

    // Denominator-only eligibility.
    const ct1DenominatorMet =
      ct1IsEligibleAge &&
      ct1HasEncounter &&
      ct9HasQualifyingPath;

    return {
      ICD243: ct2HasAnginaDx || ct3HasAcuteMiDx ? 1 : 0,
      CPT243: ct1HasEncounter ? 1 : 0,
      M243: ct1DenominatorMet ? 1 : 0,
      N243_MET: 0,
      N243_EXCEPTION: 0,
      N243_NOT_MET: 0,
      QDC243: "",
    };
  });

  return {
    message: "Measure 243 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure243CardiacRehabReferralOutpatient,
  measure243: measure243CardiacRehabReferralOutpatient,
};
