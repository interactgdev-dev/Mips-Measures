const legacyProcessing = require("../processing");

// Measure 024 has very large denominator fracture code sets.
// Reuse validated legacy denominator logic and expose it in modular form.
const measure024FractureCommunication = async (collection, records) => {
  // Run validated legacy logic first.
  const result = await legacyProcessing.measure24(collection, records);

  // Mirror legacy M0024/E0024 fields to canonical M024/E024 for consistent selection/counting.
  const recordIds = records
    .map((r) => r && r._id)
    .filter(Boolean);
  if (recordIds.length > 0) {
    await collection.updateMany(
      { _id: { $in: recordIds } },
      [
        {
          $set: {
            M024: "$M0024",
            E024: "$E0024",
          },
        },
      ]
    );
  }

  return result;
};

module.exports = {
  measure024FractureCommunication,
  measure024: measure024FractureCommunication,
  measure24: measure024FractureCommunication,
};
