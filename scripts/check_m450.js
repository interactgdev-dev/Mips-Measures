const mongoose = require('mongoose');

// Usage: node check_m450.js <orig>
// Example: node check_m450.js cc

const orig = process.argv[2] || 'cc';
const database = `${orig}_database`;
const table = `${orig}_table`;

async function run() {
  try {
    console.log(`Connecting to mongodb://127.0.0.1:27017/${database}`);
    const conn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${database}`, {
      maxPoolSize: 5,
    });

    const collection = conn.collection(table);

    const total = await collection.countDocuments();
    console.log(`Total documents in ${table}: ${total}`);

    const m450Count = await collection.countDocuments({ M450: 1 });
    const icd450Count = await collection.countDocuments({ ICD450: 1 });
    const cpt450Count = await collection.countDocuments({ CPT450: 1 });

    console.log(`M450 == 1 count: ${m450Count}`);
    console.log(`ICD450 == 1 count: ${icd450Count}`);
    console.log(`CPT450 == 1 count: ${cpt450Count}`);

    console.log('\nSample doc where ICD or CPT or M450 present (limit 5):');
    const cursor = collection.find({ $or: [ { M450: 1 }, { ICD450: 1 }, { CPT450: 1 } ] }).limit(5);
    const docs = await cursor.toArray();
    docs.forEach((d, i) => {
      console.log(`--- doc ${i+1} ---`);
      console.log(JSON.stringify(d, Object.keys(d).slice(0,50), 2));
    });

    await conn.close();
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

run();
