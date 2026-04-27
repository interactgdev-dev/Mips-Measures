const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function post(type, payload = {}) { parentPort.postMessage({ type, ...payload }); }

(async () => {
  try {
    const { tempJsonPath, excelFilePath } = workerData;
    post('step', { name: 'loading data' });

    const raw = fs.readFileSync(tempJsonPath, 'utf8');
    const { updateRecords, meta } = JSON.parse(raw);
    const { columnsOrder, columnCounts, count2Columns, mSheets, selectedMeasures = [], orig } = meta;

    // Build workbook
    const outputWorkbook = XLSX.utils.book_new();

    // Step: ordering
    post('step', { name: 'ordering records' });
    const total = updateRecords.length;
    const hasOrder = Array.isArray(columnsOrder) && columnsOrder.length > 0;

    let orderedRecords = updateRecords;
    if (hasOrder) {
      post('log', { message: `   Applying column order (${columnsOrder.length} columns)...` });
      orderedRecords = [];
      const CHUNK = 4000;
      for (let i = 0; i < total; i += CHUNK) {
        const slice = updateRecords.slice(i, i + CHUNK).map(rec => {
          const ordered = {};
          for (const col of columnsOrder) if (rec.hasOwnProperty(col)) ordered[col] = rec[col];
          for (const key of Object.keys(rec)) if (!ordered.hasOwnProperty(key)) ordered[key] = rec[key];
          return ordered;
        });
        orderedRecords.push(...slice);
        post('progress', { message: `Ordering ${Math.min(i + CHUNK, total)}/${total}` });
      }
    }

    // Step: sheet1
    post('step', { name: 'building Sheet1' });
    post('log', { message: `📄 Creating Sheet1 with ${orderedRecords.length} records...` });
    const sheet1 = XLSX.utils.json_to_sheet(orderedRecords);
    XLSX.utils.book_append_sheet(outputWorkbook, sheet1, 'Sheet1');
    post('progress', { message: `Sheet1 created (${orderedRecords.length} records)`, percent: 96 });

    // Step: counts
    post('step', { name: 'building Counts' });
    if (columnCounts && Object.keys(columnCounts).length > 0) {
      const countsData = Object.entries(columnCounts).map(([Column, Count]) => ({ Column, Count }));
      const countsSheet = XLSX.utils.json_to_sheet(countsData);
      XLSX.utils.book_append_sheet(outputWorkbook, countsSheet, 'Counts');
      post('progress', { message: `Counts sheet created (${countsData.length} columns)` });
    }

    // Step: count2
    post('step', { name: 'building Count2' });
    if (count2Columns && Object.keys(count2Columns).length > 0) {
      const count2Data = Object.entries(count2Columns).map(([Column, Count]) => ({ Column, Count }));
      const count2Sheet = XLSX.utils.json_to_sheet(count2Data);
      XLSX.utils.book_append_sheet(outputWorkbook, count2Sheet, 'Count2');
      post('progress', { message: `Count2 sheet created (${count2Data.length} columns)` });
    }

    // Step: m-sheets
    if (Array.isArray(selectedMeasures) && selectedMeasures.length > 0) {
      post('step', { name: 'building M-Records' });
      selectedMeasures.forEach((measure, idx) => {
        const records = (mSheets && mSheets[measure]) || [];
        const sheet = XLSX.utils.json_to_sheet(records);
        XLSX.utils.book_append_sheet(outputWorkbook, sheet, `${measure} Records`);
        post('progress', { message: `${measure} sheet created (${records.length} records)` });
      });
    }

    // Step: write
    post('step', { name: 'writing Excel' });
    const writeOptions = orderedRecords.length > 50000 ? { bookSST: false, compression: false } : { bookSST: true, compression: true };
    XLSX.writeFile(outputWorkbook, excelFilePath, writeOptions);
    
    post('done');
  } catch (err) {
    post('log', { message: 'Worker error: ' + (err && err.stack || err) });
    throw err;
  }
})();
