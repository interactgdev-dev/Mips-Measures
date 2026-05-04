const bulkUpdateRecords = require("./helpers/bulkUpdateRecords");

const measure130CurrentMedications = async (collection, records) => {
  // CT1 - Denominator encounter codes (visit based measure)
  const denominatorEncounterCodes = [
    "59400","59510","59610","59618","90791","90792","90832","90834","90837","90839",
    "92002","92004","92012","92014","92507","92508","92526","92537","92538","92540",
    "92541","92542","92544","92545","92548","92549","92550","92557","92567","92568",
    "92570","92588","92622","92626","92650","92651","92652","92653","96116","96156","96158",
    "97129","97161","97162","97163","97164","97165","97166","97167","97168","97802","97803",
    "97804","98000","98001","98002","98003","98004","98005","98006","98007","98008",
    "98009","98010","98011","98012","98013","98014","98015","98016",
    "98960","98961","98962","99202","99203","99204","99205","99212","99213","99214","99215",
    "99221","99222","99223","99236","99281","99282","99283","99284","99285",
    "99304","99305","99306","99307","99308","99309","99310","99315","99316",
    "99341","99342","99344","99345","99347","99348","99349","99350",
    "99385","99386","99387","99395","99396","99397","99424","99491","99495","99496",
    "G0101","G0108","G0270","G0402","G0438","G0439",
  ];

  const splitCodes = (value) => String(value || "").trim().split(/\s+/).filter(Boolean);
  const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  await bulkUpdateRecords(collection, records, (record) => {
    const ct1RecordEncounterCodes = [...splitCodes(record.CPT), ...splitCodes(record.HCPCS)].map((code) => normalizeCode(code));
    const ct1DenominatorMet = ct1RecordEncounterCodes.some((code) => denominatorEncounterCodes.includes(code));

    return {
      CPT130: ct1DenominatorMet ? 1 : 0,
      M130: ct1DenominatorMet ? 1 : 0,
      N130_MET: 0,
      N130_EXCEPTION: 0,
      N130_NOT_MET: 0,
      QDC130: "",
    };
  });

  return {
    message: "Measure 130 processed successfully",
    totalRecords: records.length,
  };
};

module.exports = {
  measure130CurrentMedications,
  measure130: measure130CurrentMedications,
};
