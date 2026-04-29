async function bulkUpdateRecords(collection, records, processRecordFn) {
  const batchSize = 5000;
  let ops = [];
  let currentBatch = 0;

  for (let i = 0; i < records.length; i++) {
    const updateData = processRecordFn(records[i]);
    if (updateData) {
      ops.push({
        updateOne: {
          filter: { _id: records[i]._id },
          update: { $set: updateData },
          upsert: false,
        },
      });
    }

    if (ops.length === batchSize || i === records.length - 1) {
      if (ops.length > 0) {
        currentBatch++;
        try {
          await collection.bulkWrite(ops, { ordered: false });
          ops = [];
        } catch (err) {
          console.error(`Batch ${currentBatch} error:`, err.message);
          ops = [];
        }
      }
    }
  }
}

module.exports = bulkUpdateRecords;
