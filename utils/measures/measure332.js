const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure332AppropriateAntibioticChoiceForAcuteBacterialSinusitis = async (collection, records) => {
  // CT1 - Acute sinusitis diagnosis codes.
  const ct1SinusitisIcdCodes = [
    "J01.00", "J01.01", "J01.10", "J01.11", "J01.20", "J01.21", "J01.30",
    "J01.31", "J01.40", "J01.41", "J01.80", "J01.81", "J01.90", "J01.91",
  ];
  // CT2 - Bacterial/infectious agent diagnosis codes.
  const ct2BacterialIcdCodes = [
    "B95.0", "B95.1", "B95.2", "B95.3", "B95.4", "B95.5", "B95.61", "B95.62", "B95.7", "B95.8",
    "B96.0", "B96.1", "B96.20", "B96.21", "B96.22", "B96.23", "B96.29", "B96.3", "B96.4", "B96.5",
    "B96.6", "B96.7", "B96.81", "B96.82", "B96.83", "B96.89",
  ];
  // CT3 - Presumed bacterial infection quality-data code.
  const ct3PresumedBacterialCode = "G9364";
  // CT4 - Qualifying denominator encounter codes.
  const ct4EncounterCodes = [
    "98002", "98003", "98006", "98007", "98010", "98011", "98014", "98015", "98016",
    "99202", "99203", "99204", "99205", "99212", "99213", "99214", "99215",
    "99281", "99282", "99283", "99284", "99285",
    "99304", "99305", "99306", "99307", "99308", "99309", "99310",
    "99341", "99342", "99344", "99345", "99347", "99348", "99349", "99350",
    "99424", "99491",
  ];
  // CT5 - Antibiotic prescribed code.
  const ct5AntibioticPrescribedCode = "G9498";

  const splitCodes = (value) => String(value || "").trim().split(/[\s,;|]+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizedSinusitisCodes = ct1SinusitisIcdCodes.map((code) => normalizeCode(code));
  const normalizedBacterialCodes = ct2BacterialIcdCodes.map((code) => normalizeCode(code));
  const normalizedPresumedBacterialCode = normalizeCode(ct3PresumedBacterialCode);
  const normalizedEncounterCodes = ct4EncounterCodes.map((code) => normalizeCode(code));
  const normalizedAntibioticCode = normalizeCode(ct5AntibioticPrescribedCode);

  await bulkUpdateRecords(collection, records, (record) => {
    const age = Number(record.AGE);
    const ageEligible = Number.isFinite(age) && age >= 18;

    const icdTokens = splitCodes(record.ICD).map((code) => normalizeCode(code));
    const encounterTokens = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS), ...splitCodes(record.CPT1)].map((code) => normalizeCode(code));
    const allTokens = [...icdTokens, ...encounterTokens];

    const hasSinusitisDx = icdTokens.some((code) => normalizedSinusitisCodes.includes(code));
    const hasBacterialDx = icdTokens.some((code) => normalizedBacterialCodes.includes(code));
    const hasPresumedBacterialCode = allTokens.includes(normalizedPresumedBacterialCode);
    const hasEncounter = encounterTokens.some((code) => normalizedEncounterCodes.includes(code));
    const hasAntibioticRegimenCode = allTokens.includes(normalizedAntibioticCode);

    const hasBacterialCriterion = hasBacterialDx || hasPresumedBacterialCode;
    // Denominator-only eligibility.
    const denominatorMet = ageEligible && hasSinusitisDx && hasBacterialCriterion && hasEncounter && hasAntibioticRegimenCode;

    return {
      ICD332: hasSinusitisDx && hasBacterialCriterion ? 1 : 0,
      CPT332: hasEncounter ? 1 : 0,
      M332: denominatorMet ? 1 : 0,
      N332_MET: 0,
      N332_EXCEPTION: 0,
      N332_NOT_MET: 0,
      QDC332: "",
    };
  });

  return {
    message: "Measure 332 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure332AppropriateAntibioticChoiceForAcuteBacterialSinusitis,
  measure332: measure332AppropriateAntibioticChoiceForAcuteBacterialSinusitis,
};
