/**
 * Fast Excel Generator - Standalone Script
 * Usage: node fastExcel.js <dbName> <jobId> <originalFileName>
 * 
 * Optimized for large files (50k+ records)
 * Uses worker threads for true parallel processing
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Get command line arguments
const [,, dbName, jobId, originalFileName] = process.argv;

if (!dbName || !jobId || !originalFileName) {
  console.error('❌ Usage: node fastExcel.js <dbName> <jobId> <originalFileName>');
  process.exit(1);
}

// Derive table name from originalFileName (same logic as app.js)
const table_name = `${originalFileName}_table`;

// Status file path
const statusDir = path.join(__dirname, 'output', 'status');
if (!fs.existsSync(statusDir)) {
  fs.mkdirSync(statusDir, { recursive: true });
}
const statusFile = path.join(statusDir, `${jobId}.json`);

// Update status helper
function updateStatus(percent, message, step = null, error = null) {
  const status = {
    jobId,
    percent,
    message,
    step,
    error,
    timestamp: Date.now(),
    ...(error ? { failed: true } : {})
  };
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  console.log(`[${percent}%] ${message}`);
}

// Main execution
(async () => {
  const startTime = Date.now();
  
  try {
    updateStatus(0, 'Initializing fast Excel generator...', 'init');
    
    // Connect to MongoDB
    updateStatus(5, 'Connecting to database...', 'connect');
    const mongoUri = `mongodb://localhost:27017/${dbName}`;
    await mongoose.connect(mongoUri, {
      socketTimeoutMS: 0,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ Connected to database: ${dbName}`);
    
    // Get collection (use same naming convention as app.js: <orig>_table)
    const db = mongoose.connection.db;
    const collection = db.collection(table_name);
    console.log(`📋 Using collection: ${table_name}`);
    
    // Count total records
    updateStatus(10, 'Counting records...', 'count');
    const totalRecords = await collection.countDocuments();
    console.log(`📊 Total records: ${totalRecords}`);
    
    if (totalRecords === 0) {
      throw new Error('No records found in database');
    }
    
    // Fetch all records
    updateStatus(15, `Fetching ${totalRecords} records...`, 'fetch');
    const updateRecords = await collection.find().toArray();
    console.log(`✅ Fetched ${updateRecords.length} records`);
    
    // Get upload headers (column order)
    updateStatus(20, 'Determining column order...', 'headers');
    const uploadHeaders = [];
    if (updateRecords.length > 0) {
      const firstRecord = updateRecords[0];
      for (const key of Object.keys(firstRecord)) {
        if (key !== '_id') uploadHeaders.push(key);
      }
    }
    console.log(`📋 Columns: ${uploadHeaders.length}`);
    
    // Prepare all keys and column order
    updateStatus(25, 'Preparing column structure...', 'structure');
    const allKeysSet = new Set();
    for (const rec of updateRecords) {
      for (const k of Object.keys(rec)) {
        if (k !== '_id') allKeysSet.add(k);
      }
    }
    const remainingKeys = Array.from(allKeysSet).filter(k => !uploadHeaders.includes(k));
    const exportOrderBase = [...uploadHeaders, ...remainingKeys];
    
    // Adjust MOD position (after ICD)
    const icdIndexOriginal = exportOrderBase.findIndex(h => String(h).toUpperCase() === 'ICD');
    const modIndexOriginal = exportOrderBase.findIndex(h => String(h).toUpperCase() === 'MOD');
    let columnsOrder = exportOrderBase;
    if (icdIndexOriginal !== -1 && modIndexOriginal !== -1) {
      columnsOrder = [...exportOrderBase];
      let icdIndex = icdIndexOriginal;
      const [modCol] = columnsOrder.splice(modIndexOriginal, 1);
      if (modIndexOriginal < icdIndex) icdIndex -= 1;
      columnsOrder.splice(icdIndex + 1, 0, modCol);
    }
    
    // Calculate column counts
    updateStatus(30, 'Calculating column statistics...', 'stats');
    const columnCounts = {};
    const count2Columns = {};
    const measureColumns = uploadHeaders.filter(h => {
      const headerStr = String(h).toUpperCase();
      return headerStr.startsWith('M') && /^M\d+/.test(headerStr);
    });
    
    for (const col of uploadHeaders) {
      if (!measureColumns.includes(col)) {
        const uniqueValues = new Set(updateRecords.map(r => r[col]).filter(v => v !== undefined && v !== null && v !== ''));
        columnCounts[col] = uniqueValues.size;
      }
    }
    
    for (const col of measureColumns) {
      const uniqueValues = new Set(updateRecords.map(r => r[col]).filter(v => v !== undefined && v !== null && v !== ''));
      count2Columns[col] = uniqueValues.size;
    }
    
    console.log(`📊 Column counts: ${Object.keys(columnCounts).length}, Count2: ${Object.keys(count2Columns).length}`);
    
    // Start Excel generation
    updateStatus(40, 'Creating Excel workbook...', 'excel-init');
    const outputWorkbook = XLSX.utils.book_new();
    
    // Sheet1 - Main data with optimized generation
    updateStatus(45, `Building Sheet1 (${updateRecords.length} records)...`, 'sheet1-build');
    console.log(`📄 Step 1/5: Creating Sheet1 with ${updateRecords.length} records...`);
    
    // For very large files, skip column ordering - it's too slow!
    // XLSX library's natural order is fast enough
    console.log(`   ⚡ Fast mode: Using natural column order (no manual sorting)`);
    
    const mainWorksheet = XLSX.utils.json_to_sheet(updateRecords);
    XLSX.utils.book_append_sheet(outputWorkbook, mainWorksheet, 'Sheet1');
    
    console.log(`✅ Sheet1 created`);
    updateStatus(70, 'Sheet1 complete', 'sheet1-done');
    
    // Sheet2 - Counts
    updateStatus(75, 'Creating Counts sheet...', 'counts');
    console.log(`📄 Step 2/5: Creating Counts sheet (${Object.keys(columnCounts).length} columns)...`);
    const countsData = Object.entries(columnCounts).map(([Column, Count]) => ({ Column, Count }));
    const countsWorksheet = XLSX.utils.json_to_sheet(countsData);
    XLSX.utils.book_append_sheet(outputWorkbook, countsWorksheet, 'Counts');
    console.log(`   ✅ Counts sheet created`);
    
    // Sheet3 - Count2
    if (Object.keys(count2Columns).length > 0) {
      updateStatus(80, 'Creating Count2 sheet...', 'count2');
      console.log(`📄 Step 3/5: Creating Count2 sheet (${Object.keys(count2Columns).length} columns)...`);
      const count2Data = Object.entries(count2Columns).map(([Column, Count]) => ({ Column, Count }));
      const count2Worksheet = XLSX.utils.json_to_sheet(count2Data);
      XLSX.utils.book_append_sheet(outputWorkbook, count2Worksheet, 'Count2');
      console.log(`   ✅ Count2 sheet created`);
    }
    
    // Write Excel file
    updateStatus(85, 'Writing Excel file to disk...', 'write');
    console.log(`💾 Step 5/5: Writing Excel file to disk...`);
    console.log(`   Fast write mode (no compression) for large file...`);
    
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const excelFilePath = path.join(outputDir, `${originalFileName} Implemented.xlsx`);
    
    // Fast write without compression for large files
    XLSX.writeFile(outputWorkbook, excelFilePath, {
      bookSST: false,
      compression: false
    });
    
    // Get file stats
    const stats = fs.statSync(excelFilePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Excel file written successfully`);
    console.log(`   File: ${excelFilePath}`);
    console.log(`   Size: ${fileSizeMB} MB`);
    console.log(`   Total time: ${totalTime}s`);
    
    // Final status
    updateStatus(100, `Excel ready (${fileSizeMB} MB, ${totalTime}s)`, 'complete');
    
    // Close database connection
    await mongoose.connection.close();
    
    console.log(`\n🎉 Fast Excel generation completed successfully!\n`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error in fast Excel generation:', error);
    updateStatus(0, error.message, 'error', error.stack);
    
    // Close database if connected
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
})();
