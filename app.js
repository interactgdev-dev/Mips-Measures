const express = require("express");
const moment = require("moment");
const mongoose = require("mongoose");
const path = require("path");
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");
const debug = require("debug")("app:server");
const debugError = require("debug")("app:error");
let limit;
(async () => {
  const pLimit = (await import("p-limit")).default;
  // Keep concurrency moderate to avoid Mongo socket resets under heavy parallel writes.
  limit = pLimit(15);
})();

const csv = require("csv-parser");

const fs = require("fs");
const fsPromises = require("fs").promises;
const app = express();

const cors = require("cors");
const Measures = require("./utils/processing_2026");
const morgan = require("morgan");
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);
app.use(cors());
const multer = require("multer");
app.use((req, res, next) => {
  debug(`Incoming request: ${req.method} ${req.url}`);
  next();
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});


// Multer: allow up to 200MB file uploads
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

// Express: allow large JSON/form-data bodies (200mb)
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Increase timeout for all requests to 2 hours (for large file processing)
app.use((req, res, next) => {
  req.setTimeout(7200000); // 2 hours
  res.setTimeout(7200000); // 2 hours
  next();
});

// --- SSE progress infrastructure ---
const sseClients = new Map(); // jobId -> Set(res)
const jobMeta = new Map();    // jobId -> { startAt }

function sendSse(jobId, payload) {
  const clients = sseClients.get(jobId);
  if (!clients) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try { res.write(data); } catch (_) { clients.delete(res); }
  }
}

function updateProgress(jobId, { phase = "processing", percent = 0, message = "", step = null }) {
  const meta = jobMeta.get(jobId);
  let etaSeconds = null;
  if (meta && percent > 0) {
    const elapsed = (Date.now() - meta.startAt) / 1000;
    if (percent > 0 && percent <= 100) {
      const remainingFactor = (100 - percent) / percent;
      etaSeconds = Math.max(0, Math.round(elapsed * remainingFactor));
    }
  }
  sendSse(jobId, { phase, percent, message, step, etaSeconds, ts: Date.now() });
}

// SSE endpoint for progress streaming
app.get("/progress/:jobId", (req, res) => {
  const { jobId } = req.params;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders && res.flushHeaders();

  let set = sseClients.get(jobId);
  if (!set) { set = new Set(); sseClients.set(jobId, set); }
  set.add(res);

  // initial event
  sendSse(jobId, { phase: "init", percent: 0, message: "connected" });

  const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch (_) {} }, 25000);
  req.on("close", () => { clearInterval(ping); set.delete(res); });
});

// Status endpoint for background Excel generation
app.get("/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const statusFile = path.join(__dirname, "output", "status", `${jobId}.json`);
  
  if (!fs.existsSync(statusFile)) {
    return res.status(404).json({ error: "Job not found" });
  }
  
  try {
    const statusData = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    res.json(statusData);
  } catch (error) {
    res.status(500).json({ error: "Failed to read status" });
  }
});

const handleError = (res, message, statusCode = 500) => {
  console.error(message);
  return res.status(statusCode).send(message);
};
app.use((err, req, res, next) => {
  handleError(res, `An unexpected error occurred: ${err.message}`);
});
app.get("/files", async (req, res) => {
  try {
    const folderPath = path.join(
      __dirname,
      req.query.v === "f" ? "output1" : "output"
    );

    const files = await fs.promises.readdir(folderPath);

    const xlsxFiles = files.filter((file) => file.endsWith(".xlsx"));

    const fileDetails = await Promise.all(
      xlsxFiles.map(async (file) => {
        const filePath = path.join(folderPath, file);
        const stats = await fs.promises.stat(filePath);

        const sizeInKB = stats.size / 1024;
        const sizeFormatted =
          sizeInKB >= 1024
            ? `${(sizeInKB / 1024).toFixed(2)} MB`
            : `${sizeInKB.toFixed(2)} KB`;

        const lastModifiedDate = new Date(stats.mtime)
          .toISOString()
          .slice(0, 10);

        return {
          name: file,
          url: `/files/${file}`,
          size: sizeFormatted,
          lastModified: lastModifiedDate,
        };
      })
    );

    res.status(200).json({
      success: true,
      files: fileDetails,
    });
  } catch (error) {
    console.error("Error reading files:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve files.",
    });
  }
});
let functionMapping = {
  M143: "measure143",
  M144: "measure144",
  M001: "measure1",
  M005: "measure5",
  M006: "measure6",
  M007: "measure7",
  M008: "measure8",
  M024: "measure24",
  M039: "measure39",
  M047: "measure47",
  M048: "measure48",
  M050: "measure50",
  M052: "measure52",
  M065: "measure65",
  M066: "measure66",
  M116: "measure116",
  M117: "measure117",
  M118: "measure118",
  M126: "measure126",
  M127: "measure127",
  M130: "measure130",
  M134: "measure134",
  M137: "measure137",
  M141: "measure141",
  M143: "measure143",
  M144: "measure144",
  M145: "measure145",
  M155: "measure155",
  M177: "measure177",
  M176: "measure176",
  M178: "measure178",
  M180: "measure180",
  M181: "measure181",
  M182: "measure182",
  M185: "measure185",
  M187: "measure187",
  M191: "measure191",
  M217: "measure217",
  M218: "measure218",
  M219: "measure219",
  M220: "measure220",
  M221: "measure221",
  M222: "measure222",
  M226: "measure226",
  M236: "measure236",
  M238: "measure238",
  M243: "measure243",
  M249: "measure249",
  M250: "measure250",
  M268: "measure268",
  M277: "measure277",
  M279: "measure279",
  M282: "measure282",
  M286: "measure286",
  M288: "measure288",
  M291: "measure291",
  M293: "measure293",
  M317: "measure317",
  M320: "measure320",
  M322: "measure322",
  M326: "measure326",
  M331: "measure331",
  M332: "measure332",
  M338: "measure338",
  M340: "measure340",
  M350: "measure350",
  M351: "measure351",
  M354: "measure354",
  M355: "measure355",
  M356: "measure356",
  M357: "measure357",
  M358: "measure358",
  M360: "measure360",
  M364: "measure364",
  M374: "measure374",
  M383: "measure383",
  M384: "measure384",
  M385: "measure385",
  M389: "measure389",
  M394: "measure394",
  M395: "measure395",
  M396: "measure396",
  M397: "measure397",
  M404: "measure404",
  M405: "measure405",
  M406: "measure406",
  M410: "measure410",
  M415: "measure415",
  M416: "measure416",
  M419: "measure419",
  //M424: "measure424",
  M430: "measure430",
  M431: "measure431",
    // M999: "measure999", // 🦪 TEST measure (copy of M047) [REMOVED]
  M436: "measure436",
  M439: "measure439",
  M440: "measure440",
  M450: "measure450",
  M477: "measure477",
  M478: "measure478",
  M485: "measure485",
  M486: "measure486",
  M999: "measure999", // 🧪 TEST measure (copy of M047)
};

app.post("/upload", upload.single("file"), async (req, res) => {
  let dbConnection = null;
  try {
    const { columns, isSelected, jobId: jobIdRaw } = req.body;
    const jobId = String(jobIdRaw || `${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
    jobMeta.set(jobId, { startAt: Date.now() });
    const file = req.file;
    console.log("Columns............................", columns);
    
    // Parse selected measures into array
    let selectedMeasures = [];
    if (columns) {
      if (typeof columns === 'string') {
        selectedMeasures = columns.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
      } else if (Array.isArray(columns)) {
        selectedMeasures = columns.map(c => String(c).trim().toUpperCase()).filter(Boolean);
      }
    }
    console.log("Selected measures:", selectedMeasures);
    
    if (!file) return handleError(res, "No file uploaded", 400);
    if (path.extname(file.originalname) !== ".xlsx") {
      return handleError(res, "Only .xlsx files are allowed", 400);
    }

    const folderPath = path.join(__dirname, "output");

    let fileName = file.originalname;
    let lastDotIndex = fileName.lastIndexOf(".");
    let orig = "";

    if (lastDotIndex !== -1) {
      let name = fileName.substring(0, lastDotIndex);
      orig = name.replace(/[\s.]/g, "_");
    }

    let originalName = orig + " Implemented" + ".xlsx";
    const files = await fs.promises.readdir(folderPath);
    if (files.includes(originalName)) {
      return handleError(res, "Selected file already processed", 400);
    }

    if (!file.path) return handleError(res, "File path is undefined", 500);

    // announce start
    updateProgress(jobId, { percent: 1, message: "Starting processing..." });

    // Save columns order to a file for later use
    if (columns && Array.isArray(columns)) {
      await fs.promises.writeFile(
        path.join(__dirname, 'output', `${orig}_columnsOrder.json`),
        JSON.stringify(columns)
      );
    }
    
    // Process and track timing
    const startTime = Date.now();
    const result = await processUploadedFile(file.path, fileName, columns, res, jobId, selectedMeasures);
    if (result?.error) {
      throw result.error;
    }
    dbConnection = result.dbConnection; // Store connection reference
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`Processing completed in ${processingTime} seconds`);
    updateProgress(jobId, { percent: 100, message: "Completed" });
    
  } catch (error) {
    console.error("Unexpected error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Unexpected error occurred" });
    }
  } finally {
    // Always close database connection
    if (dbConnection) {
      try {
        await dbConnection.close();
        console.log("Database connection closed");
      } catch (err) {
        console.error("Error closing database connection:", err);
      }
    }
    // Cleanup job metadata
    if (req.body.jobId) {
      jobMeta.delete(req.body.jobId);
    }
  }
});

async function processUploadedFile(filePath, fileName, columns, res, jobId = null, selectedMeasures = []) {
  let dbConnection = null;
  try {
    console.log("Processing uploaded file:", fileName);
    if (jobId) updateProgress(jobId, { percent: 3, message: "Reading workbook..." });
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "Uploaded file is empty" });
    }

    const orig = fileName
      .substring(0, fileName.lastIndexOf("."))
      .replace(/[\s.]/g, "_");
    const originalName = `${orig} Implemented.xlsx`;
    const database_name = `${orig}_database`;
    const table_name = `${orig}_table`;

  dbConnection = await connectToDatabase(database_name);
    const collection = dbConnection.collection(table_name);
    
    // Clear existing data from this collection to avoid mixing old uploads
    console.log(`🗑️  Clearing existing data in ${table_name}...`);
    await collection.deleteMany({});
    if (jobId) updateProgress(jobId, { percent: 5, message: `Cleared existing data in ${table_name}` });
    
    const result = await collection.insertMany(data);
    console.log(`Inserted ${result.insertedCount} documents.`);
    if (jobId) updateProgress(jobId, { percent: 12, message: `Inserted ${result.insertedCount} documents` });
    if (jobId) updateProgress(jobId, { percent: 15, message: "Running measures..." });

    // approximate batch progress between 15..75
    const totalDocs = result.insertedCount || data.length;
  // Use the same batch size as processRecordsInChunks for consistent UI counts
  const BATCH_SIZE = 5000;
    const totalBatches = Math.max(1, Math.ceil(totalDocs / BATCH_SIZE));
    let processedBatches = 0;
    const progressForBatches = (base, top) => {
      const ratio = Math.min(1, processedBatches / totalBatches);
      return Math.round(base + (top - base) * ratio);
    };

    await processRecordsInChunks(collection, collection.find(), columns, async (batchCount) => {
      processedBatches = batchCount;
      // Clamp processedBatches to totalBatches
      const currentBatch = Math.min(processedBatches, totalBatches);
      if (jobId) updateProgress(jobId, { percent: progressForBatches(15, 75), message: `Processing batch ${currentBatch}/${totalBatches}...` });
    });
    
    // For large datasets, skip loading all records into memory; use streaming Excel generation
    const isLarge = totalDocs > 10000;
    // Extract upload headers first
    const headerRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    let uploadHeaders = Array.isArray(headerRows) && headerRows.length > 0
      ? headerRows[0].map((h) => (typeof h === 'string' ? h.trim() : h))
      : [];
    // Ensure M143 is included in uploadHeaders if present in selectedMeasures or in any record
    const hasM143 = selectedMeasures.includes('M143') || data.some(r => Object.keys(r).includes('M143'));
    if (hasM143 && !uploadHeaders.includes('M143')) {
      uploadHeaders.push('M143');
    }
    // recordFields for M-Records sheets
    const recordFields = uploadHeaders.filter((h) => {
      const headerStr = String(h).toUpperCase();
      return !(headerStr.startsWith('M') && /^M\d+/.test(headerStr));
    });

    if (isLarge) {
      if (jobId) updateProgress(jobId, { percent: 78, message: "Preparing streaming Excel writer..." });
      await generateExcelFileStreaming(collection, uploadHeaders, recordFields, orig, selectedMeasures, jobId);
    } else {
      // Fetch records in memory for small datasets
      if (jobId) updateProgress(jobId, { percent: 75, message: "Fetching processed records..." });
      const updateRecords = await fetchUpdateRecords(collection, jobId, totalDocs);
      
      console.log(`Fetched ${updateRecords.length} processed records`);
      if (jobId) updateProgress(jobId, { percent: 78, message: "Preparing data for Excel..." });

      if (jobId) updateProgress(jobId, { percent: 80, message: "Aggregating results..." });
      const { columnCounts, count2Columns, mSheets } = await processExcelData(updateRecords, uploadHeaders, selectedMeasures);

      // Preserve upload column order EXACTLY; use Map to maintain insertion order
      console.log(`📋 Upload headers order: ${uploadHeaders.join(', ')}`);
      const allKeysMap = new Map();
      // First, add all upload headers in exact order
      uploadHeaders.forEach(h => {
        allKeysMap.set(h, true);
      });
      // Then, add any new keys generated by processing (M001, IC*, CP*, etc.)
      // BUT skip MongoDB's _id field as it wasn't in original upload
      for (const rec of updateRecords) {
        for (const k of Object.keys(rec)) {
          if (k !== '_id' && !allKeysMap.has(k)) {
            allKeysMap.set(k, true);
          }
        }
      }
      let exportOrder = Array.from(allKeysMap.keys());
      
      // Sort M columns numerically (M001, M005, M006...) while keeping other columns in place
      const mColumns = exportOrder.filter(col => /^M\d+$/i.test(col));
      const nonMColumns = exportOrder.filter(col => !/^M\d+$/i.test(col));
      
      if (mColumns.length > 0) {
        mColumns.sort((a, b) => {
          // Extract number: M007 -> 7, M0019 -> 19, M00118 -> 118
          const getNum = (str) => {
            const match = str.match(/^M(\d+)$/i);
            return match ? parseInt(match[1], 10) : 0;
          };
          return getNum(a) - getNum(b);
        });
        
        // Find where first M column was in original order
        const firstMIndex = exportOrder.findIndex(col => /^M\d+$/i.test(col));
        // Rebuild: non-M columns before first M + sorted M columns + remaining non-M columns
        const beforeM = nonMColumns.filter((col, idx) => exportOrder.indexOf(col) < firstMIndex);
        const afterM = nonMColumns.filter((col, idx) => exportOrder.indexOf(col) > firstMIndex);
        exportOrder = [...beforeM, ...mColumns, ...afterM];
        console.log(`🔢 Sorted ${mColumns.length} M columns numerically: ${mColumns.slice(0, 10).join(', ')}${mColumns.length > 10 ? '...' : ''}`);
      }
      
      // CRITICAL FIX: If MOD exists and ICD exists, ensure MOD comes immediately after ICD
      const icdIdx = exportOrder.findIndex(h => String(h).toUpperCase() === 'ICD');
      const modIdx = exportOrder.findIndex(h => String(h).toUpperCase() === 'MOD');
      
      if (icdIdx !== -1 && modIdx !== -1 && modIdx !== icdIdx + 1) {
        // Remove MOD from current position
        exportOrder = exportOrder.filter(h => String(h).toUpperCase() !== 'MOD');
        // Insert MOD right after ICD
        const modColumn = uploadHeaders.find(h => String(h).toUpperCase() === 'MOD');
        if (modColumn) {
          const newIcdIdx = exportOrder.findIndex(h => String(h).toUpperCase() === 'ICD');
          exportOrder.splice(newIcdIdx + 1, 0, modColumn);
          console.log(`🔧 Fixed MOD position: placed after ICD at position ${newIcdIdx + 1}`);
        }
      }
      
      console.log(`✅ Final column order (${exportOrder.length} columns):`);
      console.log(`   First 20: ${exportOrder.slice(0, 20).join(', ')}`);
      // Find and log ICD and MOD positions
      const finalIcdIdx = exportOrder.findIndex(h => String(h).toUpperCase() === 'ICD');
      const finalModIdx = exportOrder.findIndex(h => String(h).toUpperCase() === 'MOD');
      if (finalIcdIdx !== -1 && finalModIdx !== -1) {
        console.log(`   🎯 ICD at position ${finalIcdIdx}, MOD at position ${finalModIdx} (should be ${finalIcdIdx + 1})`);
      }

      if (jobId) updateProgress(jobId, { percent: 90, message: "Generating Excel..." });
      await generateExcelFile(updateRecords, columnCounts, count2Columns, mSheets, orig, exportOrder, recordFields, selectedMeasures, jobId, database_name);
    }

    await deleteFileIfExists(filePath);

    return {
      dbConnection,
      response: res.status(200).json({
        message:
          "File uploaded, data inserted, and Excel file generated successfully",
        insertedCount: result.insertedCount,
        database: database_name,
        excelFilePath: `./output/${originalName}`,
      })
    };
  } catch (error) {
    console.error("Error processing file:", error);

    if (!res.headersSent) {
      res.status(500).json({ message: "Error processing file" });
    }
    return { dbConnection, error };
  }
}

function transformData(data) {
  return data.map((item) => {
    const transformedItem = {};
    for (const key in item) {
      if (item.hasOwnProperty(key)) {
        let value = item[key];
        const normalizedKey =
          key.toUpperCase() === "ICD" || key.toUpperCase() === "CPT"
            ? key.toUpperCase()
            : key;

        if (normalizedKey === "ICD" || normalizedKey === "CPT") {
          value = String(value).replace(/\./g, "");
        }

        if (normalizedKey === "DOS" || normalizedKey === "DOB") {
          value = formatDate(value);
        }

        if (normalizedKey === "AGE" && !isNaN(value)) {
          value = Number(value);
        }

        if (
          ["TICKET NO", "NAME", "GEN", "ICD", "CPT", "MOD", "PROV"].includes(
            normalizedKey
          )
        ) {
          value = String(value).trim();
        }

        if (normalizedKey === "POS" && !isNaN(value)) {
          value = Number(value);
        }

        transformedItem[normalizedKey] = value;
      }
    }
    return transformedItem;
  });
}

function formatDate(dateValue) {
  if (typeof dateValue === "number") {
    const baseDate = new Date(1899, 11, 30);
    const date = new Date(baseDate.getTime() + dateValue * 24 * 60 * 60 * 1000);
    const day = ("0" + date.getDate()).slice(-2);
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
  return dateValue;
}

async function connectToDatabase(database_name) {
  const dbConnection = mongoose.createConnection(
    `mongodb://127.0.0.1:27017/${database_name}`,
    {
      maxPoolSize: 20,
      minPoolSize: 2,
      socketTimeoutMS: 0, // No timeout for long-running operations
      serverSelectionTimeoutMS: 60000, // 60s to initially connect (was 30s)
      connectTimeoutMS: 60000, // 60s connection timeout
      heartbeatFrequencyMS: 10000, // Keep connection alive
      retryWrites: true,
      retryReads: true,
    }
  );
  return new Promise((resolve, reject) => {
    dbConnection.once("open", () => {
      console.log(`✅ Connected to database: ${database_name}`);
      resolve(dbConnection);
    });
    dbConnection.on("error", (err) => {
      console.error(`❌ Database connection error: ${err.message}`);
      reject(err);
    });
  });
}

async function processRecordsInChunks(collection, cursor, columns, onBatchProcessed = null) {
  const BATCH_SIZE = 5000;
  let batch = [];
  let batchCount = 0;
  // Try to get jobId from columns if present (hack: pass as property)
  let jobId = null;
  if (columns && typeof columns === 'object' && columns.jobId) {
    jobId = columns.jobId;
    columns = columns.columns;
  }
  // OPTIMIZED: Count using countDocuments instead of iterating twice
  let totalDocs = 0;
  try {
    totalDocs = await collection.countDocuments();
  } catch (err) {
    console.error("Error counting documents:", err);
    // Fallback to cursor count if countDocuments fails
    for await (const _ of cursor) totalDocs++;
    cursor.rewind && cursor.rewind();
  }
  
  console.log(`🔄 Processing ${totalDocs} records in batches...`);
  if (jobId) {
    updateProgress(jobId, { percent: 15, message: `Processing ${totalDocs} records in batches of ${BATCH_SIZE}...` });
  }
  
  let processedDocs = 0;
  for await (const doc of cursor) {
    batch.push(doc);
    processedDocs++;
    if (batch.length === BATCH_SIZE) {
      batchCount++;
      const batchStartTime = Date.now();
      await processBatch(collection, batch, batchCount, columns);
      const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
      console.log(`⚡ Batch ${batchCount}/${Math.ceil(totalDocs / BATCH_SIZE)} completed in ${batchTime}s (${processedDocs}/${totalDocs} records)`);
      
      if (jobId) {
        const percent = Math.round((processedDocs / totalDocs) * 60) + 15; // 15-75%
        updateProgress(jobId, { percent, message: `Batch ${batchCount}/${Math.ceil(totalDocs / BATCH_SIZE)} done in ${batchTime}s (${processedDocs}/${totalDocs})` });
      }
      if (onBatchProcessed) await onBatchProcessed(batchCount);
      batch = [];
      
      // Force garbage collection after each batch for large files
      if (totalDocs > 50000 && global.gc) {
        global.gc();
      }
    }
  }
  if (batch.length > 0) {
    batchCount++;
    const batchStartTime = Date.now();
    await processBatch(collection, batch, batchCount, columns);
    const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
    console.log(`⚡ Batch ${batchCount}/${Math.ceil(totalDocs / BATCH_SIZE)} completed in ${batchTime}s (${processedDocs}/${totalDocs} records)`);
    
    if (jobId) {
      const percent = Math.round((processedDocs / totalDocs) * 60) + 15;
      updateProgress(jobId, { percent, message: `Batch ${batchCount}/${Math.ceil(totalDocs / BATCH_SIZE)} done in ${batchTime}s (${processedDocs}/${totalDocs})` });
    }
    if (onBatchProcessed) await onBatchProcessed(batchCount);
  }
  
  console.log(`✅ All ${totalDocs} records processed in ${batchCount} batches`);
}

async function processBatch(collection, batch, batchCount, columns) {
  // ALWAYS run all measure functions to populate Sheet1 with complete data
  // Excel filtering happens later based on selectedMeasures
  const selectedFunctions = Object.values(functionMapping);
  if (!selectedFunctions.length) {
    return;
  }
  const runAllMeasures = async () =>
    Promise.all(
      selectedFunctions.map((funcName) => {
        if (typeof Measures[funcName] === "function") {
          return limit(() => Measures[funcName](collection, batch));
        }
      })
    );
  try {
    await runAllMeasures();
  } catch (err) {
    const transient = ["ECONNRESET", "ETIMEDOUT", "MongoNetworkError", "PoolClearedError"].some((token) =>
      String(err?.code || err?.name || err?.message || "").includes(token)
    );
    if (transient) {
      console.warn(`Batch ${batchCount} transient DB error, retrying once: ${err.message}`);
      await runAllMeasures();
      return;
    }
    throw err;
  }
}

async function fetchUpdateRecords(collection, jobId = null, totalDocs = null) {
  const updateRecords = [];
  
  // OPTIMIZED: Use native MongoDB cursor (no Mongoose overhead)
  const updateCursor = collection.find();
  
  let count = 0;
  const BATCH_SIZE = 10000; // Increased from 5000 to reduce progress overhead
  
  for await (const doc of updateCursor) {
    updateRecords.push(doc);
    count++;
    
    // Periodic progress update and memory hint
    if (count % BATCH_SIZE === 0) {
      console.log(`📥 Fetched ${count} records...`);
      if (jobId) {
        let percent = 75;
        if (totalDocs && totalDocs > 0) {
          percent = 75 + Math.min(5, Math.floor((count / totalDocs) * 5 * 100) / 100);
        }
        updateProgress(jobId, { percent, message: `Fetching records ${count}${totalDocs ? `/` + totalDocs : ''}...` });
      }
      // Give Node.js a chance to garbage collect for large files
      if (count > 50000 && global.gc) {
        global.gc();
      }
    }
  }
  
  console.log(`✅ Total records fetched: ${count}`);
  if (jobId) updateProgress(jobId, { percent: 80, message: `Fetched ${count} records` });
  return updateRecords;
}

function processExcelData(updateRecords, uploadHeaders = [], selectedMeasures = []) {
  const columnCounts = {};
  const count2Columns = {};
  const mSheets = {};

  // Use upload headers for M-Records sheets (filter out measure columns like M001, M005, etc.)
  const recordFields = uploadHeaders.filter((h) => {
    const headerStr = String(h).toUpperCase();
    // Exclude columns that start with M followed by numbers (measure columns)
    // but keep MOD if it exists in upload
    return !(headerStr.startsWith('M') && /^M\d+/.test(headerStr));
  });

  for (const record of updateRecords) {
    const filteredRecord = {};
    // Only include fields that were in the original upload
    for (const field of recordFields) {
      if (record.hasOwnProperty(field)) {
        filteredRecord[field] = record[field];
      }
    }

    for (const key in record) {
      if (/^M\d+$/i.test(key)) {
        if (!columnCounts[key]) columnCounts[key] = 0;
        if (record[key] == 1) {
          columnCounts[key]++;
          // Only add to mSheets if this measure was selected AND measures were actually selected
          const shouldInclude = selectedMeasures.length > 0 && selectedMeasures.includes(key.toUpperCase());
          if (shouldInclude) {
            if (!mSheets[key]) mSheets[key] = [];
            mSheets[key].push(filteredRecord);
          }
        }
      }

      if (key.startsWith("IC") && key !== "ICD") {
        if (!count2Columns[key]) count2Columns[key] = 0;
        if (record[key] == 1) count2Columns[key]++;
      }
      if (key.startsWith("CP") && key !== "CPT") {
        if (!count2Columns[key]) count2Columns[key] = 0;
        if (record[key] == 1) count2Columns[key]++;
      }
    }
  }

  return { columnCounts, count2Columns, mSheets };
}

async function generateExcelFile(
  updateRecords,
  columnCounts,
  count2Columns,
  mSheets,
  orig,
  columnsOrder = null,
  recordFields = null,
  selectedMeasures = [],
  jobId = null,
  database_name = null
) {
  try {
    const recordCount = updateRecords.length;
    console.log(`📊 Starting Excel generation for ${recordCount} records...`);
    console.log(`📋 Selected measures: ${selectedMeasures.length > 0 ? selectedMeasures.join(', ') : 'None'}`);
    
    // Create a new workbook
    const outputWorkbook = XLSX.utils.book_new();

    // Build Sheet1 with live progress updates
    console.log(`📄 Step 1/5: Creating Sheet1 with ${updateRecords.length} records...`);
    if (jobId) updateProgress(jobId, { percent: 91, message: `Step 1/5: Preparing ${updateRecords.length} records...` });    const sheetStartTime = Date.now();
    let mainWorksheet;
    const large = updateRecords.length > 50000;
    
    // CRITICAL: We MUST enforce column order by creating worksheet with explicit header
    // json_to_sheet uses first object's key order which is unpredictable from MongoDB
    if (columnsOrder && Array.isArray(columnsOrder) && columnsOrder.length > 0) {
      console.log(`   📝 Enforcing column order (${columnsOrder.length} columns)...`);
      if (jobId) updateProgress(jobId, { percent: 92, message: `Enforcing column order...` });

      // Create worksheet with EXPLICIT header row to force column order
      mainWorksheet = XLSX.utils.aoa_to_sheet([columnsOrder]); // First row = headers
      
      // Append data rows with columns in exact order
      if (!large) {
        // For small files, use array_of_arrays for guaranteed order
        const dataRows = updateRecords.map(rec => 
          columnsOrder.map(col => {
            if (rec[col] !== undefined && rec[col] !== null) {
              return rec[col];
            } else {
              // Universal fix: Default to 0 for measure/indicator columns, empty string for text columns
              const colUpper = String(col).toUpperCase();
              // Check if it's a measure/indicator column (M*, CPT*, ICD*, IC*, CP*, E*)
              const isNumericColumn = /^(M|CPT|ICD|IC|CP|E)\d+/i.test(colUpper) || 
                                       /^(M|CPT|ICD|IC|CP|E)0+\d+/i.test(colUpper);
              return isNumericColumn ? 0 : '';
            }
          })
        );
        XLSX.utils.sheet_add_aoa(mainWorksheet, dataRows, { origin: 1 }); // Start from row 2
        console.log(`   ✓ Column order enforced with array-of-arrays`);
      } else {
        // For large files, still use json but with pre-ordered objects
        console.log(`   ⚡ Fast mode: Large file (${updateRecords.length} records), using optimized approach...`);
        const orderedRecords = updateRecords.map(rec => {
          const ordered = {};
          columnsOrder.forEach(col => {
            // Universal fix: Handle all undefined/null values
            if (rec[col] !== undefined && rec[col] !== null) {
              ordered[col] = rec[col];
            } else {
              // Default to 0 for measure/indicator columns, empty string for text columns
              const colUpper = String(col).toUpperCase();
              const isNumericColumn = /^(M|CPT|ICD|IC|CP|E)\d+/i.test(colUpper) || 
                                       /^(M|CPT|ICD|IC|CP|E)0+\d+/i.test(colUpper);
              ordered[col] = isNumericColumn ? 0 : '';
            }
          });
          return ordered;
        });
        XLSX.utils.sheet_add_json(mainWorksheet, orderedRecords, { 
          skipHeader: true, // We already added header
          origin: 1 // Start from row 2
        });
        console.log(`   ✓ Large file column order enforced`);
      }
      
      if (jobId) updateProgress(jobId, { percent: 95, message: `Building Sheet1...` });
    } else {
      // Fallback: no column order specified
      if (large) {
        console.log(`   ⚠️  No column order specified for large dataset`);
      }
      mainWorksheet = XLSX.utils.json_to_sheet(updateRecords);
    }
    
    const sheetTime = ((Date.now() - sheetStartTime) / 1000).toFixed(1);
    console.log(`✅ Sheet1 created in ${sheetTime}s`);
    if (jobId) updateProgress(jobId, { percent: 96, message: `Step 2/5: Sheet1 done (${sheetTime}s)` });
    XLSX.utils.book_append_sheet(outputWorkbook, mainWorksheet, "Sheet1");

    // Sheet 2: Column Counts
    console.log(`📄 Step 2/5: Creating Counts sheet (${Object.keys(columnCounts).length} columns)...`);
    const countsData = Object.entries(columnCounts)
      .sort((a, b) => {
        // Sort M columns numerically: M001, M005, M006, M007, M019, M024, M047...
        // Extract number: M007 -> 7, M0019 -> 19, M00118 -> 118
        const getNum = (str) => {
          const match = str.match(/^M(\d+)$/i);
          return match ? parseInt(match[1], 10) : 0;
        };
        const numA = getNum(a[0]);
        const numB = getNum(b[0]);
        // Debug: Log problematic comparisons
        if ((a[0].includes('65') || a[0].includes('66') || a[0].includes('116') || a[0].includes('118')) &&
            (b[0].includes('65') || b[0].includes('66') || b[0].includes('116') || b[0].includes('118'))) {
          console.log(`   🔍 Comparing: ${a[0]} (${numA}) vs ${b[0]} (${numB}) = ${numA - numB}`);
        }
        return numA - numB;
      })
      .map(([column, count]) => ({
        Column: column,
        Count: count,
      }));
    const countsWorksheet = XLSX.utils.json_to_sheet(countsData);
    XLSX.utils.book_append_sheet(outputWorkbook, countsWorksheet, "Counts");
    console.log(`   ✅ Counts sheet created`);
    if (jobId) updateProgress(jobId, { percent: 97, message: `Step 3/5: Counts sheet done` });

    // ✅ Add Count 2 Columns as a New Sheet (if exists)
    if (count2Columns && Object.keys(count2Columns).length > 0) {
      console.log(`📄 Step 3/5: Creating Count2 sheet (${Object.keys(count2Columns).length} columns)...`);
      const count2Data = Object.entries(count2Columns)
        .sort((a, b) => {
          // Sort IC/CP columns numerically: IC001, IC002, CP001, CP002...
          const getNum = (str) => {
            const match = str.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          };
          const numA = getNum(a[0]);
          const numB = getNum(b[0]);
          // If numbers are equal, sort by prefix (CP before IC)
          if (numA === numB) return a[0].localeCompare(b[0]);
          return numA - numB;
        })
        .map(([column, count]) => ({
          Column: column,
          Count: count,
        }));
      const count2Worksheet = XLSX.utils.json_to_sheet(count2Data);
      XLSX.utils.book_append_sheet(outputWorkbook, count2Worksheet, "Count2");
      console.log(`   ✅ Count2 sheet created`);
      if (jobId) updateProgress(jobId, { percent: 97, message: `Step 3/5: Count2 sheet done` });
    }

    // Always create M-Records sheets for each selected measure (if any)
    if (Array.isArray(selectedMeasures) && selectedMeasures.length > 0) {
      console.log(`📝 Step 4/5: Creating M-Records sheets for selected measures...`);
      let createdSheets = 0;
      selectedMeasures.forEach((measure, idx) => {
        const records = mSheets[measure] || [];
        // Only create sheet if there are actual records (not empty)
        if (records.length > 0) {
          console.log(`   Creating ${measure} Records (${records.length} records)...`);
          const mWorksheet = XLSX.utils.json_to_sheet(records);
          XLSX.utils.book_append_sheet(
            outputWorkbook,
            mWorksheet,
            `${measure} Records`
          );
          createdSheets++;
          console.log(`   ✅ ${measure} sheet created (${createdSheets} sheets)`);
        } else {
          console.log(`   ⏭️  Skipping ${measure} - no records found`);
        }
        if (jobId) updateProgress(jobId, { percent: Math.min(98, 97 + Math.floor(((idx + 1) / selectedMeasures.length) * 1)), message: `Step 4/5: Processing measures (${idx + 1}/${selectedMeasures.length})` });
      });
      console.log(`📊 Created ${createdSheets} M-Records sheets (skipped ${selectedMeasures.length - createdSheets} empty measures)`);
    }

    const outputDir = "./output";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Write the Excel file
    console.log(`💾 Step 5/5: Writing Excel file to disk...`);
    if (jobId) updateProgress(jobId, { percent: 98, message: `Step 5/5: Writing Excel file...` });
    const writeStartTime = Date.now();
    const excelFilePath = `./output/${orig} Implemented.xlsx`;
    
    // For large files, skip compression to save time (file size vs speed tradeoff)
    const writeOptions = updateRecords.length > 50000 
      ? { bookSST: false, compression: false } // Fast write for large files
      : { bookSST: true, compression: true };   // Optimize size for small files
    
    if (updateRecords.length > 50000) {
      console.log(`   Fast write mode (no compression) for large file...`);
    } else {
      console.log(`   Applying compression and shared string table optimization...`);
    }
    
    XLSX.writeFile(outputWorkbook, excelFilePath, writeOptions);
    
    const writeTime = ((Date.now() - writeStartTime) / 1000).toFixed(1);
    
    // Get file size
    const stats = fs.statSync(excelFilePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Excel file written in ${writeTime}s`);
    console.log(`   File: ${excelFilePath}`);
    console.log(`   Size: ${fileSizeMB} MB`);
    if (jobId) updateProgress(jobId, { percent: 99, message: `Excel ready in ${writeTime}s (${fileSizeMB} MB)` });
    
    // Clear large objects to help GC
    if (global.gc) {
      global.gc();
    }
  } catch (error) {
    console.error("❌ Error generating Excel file:", error);
    throw error; // Re-throw to be caught by caller
  }
}

async function deleteFileIfExists(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`File deleted: ${filePath}`);
  } catch (err) {
    console.log(`File not found: ${filePath}`);
  }
}

// Streaming Excel generator for large datasets using ExcelJS
async function generateExcelFileStreaming(collection, uploadHeaders, recordFields, orig, selectedMeasures = [], jobId = null) {
  try {
    const totalDocs = await collection.countDocuments();
    console.log(`📊 [Stream] Generating Excel for ${totalDocs} records...`);
    console.log(`📋 Upload headers order: ${uploadHeaders.join(', ')}`);
    if (jobId) updateProgress(jobId, { percent: 85, message: `Streaming: analyzing ${totalDocs} records...` });

    // First pass: determine ALL columns in records (preserving upload order) and compute counts
    const allKeysMap = new Map(); // Use Map to preserve insertion order
    const columnCounts = {};
    const count2Columns = {};
    
    // Initialize with upload headers first (preserve exact order)
    uploadHeaders.forEach(h => {
      allKeysMap.set(h, true);
    });

    let processed = 0;
    for await (const doc of collection.find()) {
      processed++;
      // Add any new keys not in upload headers (these are generated columns like M001, IC*, CP*, etc.)
      // BUT skip MongoDB's _id field as it wasn't in original upload
      for (const k of Object.keys(doc)) {
        if (k !== '_id' && !allKeysMap.has(k)) {
          allKeysMap.set(k, true);
        }
      }
      // counts
      for (const key in doc) {
        if (/^M\d+$/i.test(key)) {
          if (!columnCounts[key]) columnCounts[key] = 0;
          if (doc[key] == 1) columnCounts[key]++;
        }
        if ((key.startsWith('IC') && key !== 'ICD') || (key.startsWith('CP') && key !== 'CPT')) {
          if (!count2Columns[key]) count2Columns[key] = 0;
          if (doc[key] == 1) count2Columns[key]++;
        }
      }
      if (jobId && processed % 10000 === 0) {
        const base = 85;
        const p = base + Math.min(3, Math.floor((processed / Math.max(1, totalDocs)) * 3 * 100) / 100);
        updateProgress(jobId, { percent: p, message: `Streaming analysis ${processed}/${totalDocs}...` });
      }
    }

    // Build export order: EXACTLY preserve upload headers order, then append any new columns
    let exportOrder = Array.from(allKeysMap.keys());
    
    // Sort M columns numerically (M001, M005, M006...) while keeping other columns in place
    const mColumns = exportOrder.filter(col => /^M\d+$/i.test(col));
    const nonMColumns = exportOrder.filter(col => !/^M\d+$/i.test(col));
    
    if (mColumns.length > 0) {
      mColumns.sort((a, b) => {
        // Extract number: M007 -> 7, M0019 -> 19, M00118 -> 118
        const getNum = (str) => {
          const match = str.match(/^M(\d+)$/i);
          return match ? parseInt(match[1], 10) : 0;
        };
        return getNum(a) - getNum(b);
      });
      
      // Find where first M column was in original order
      const firstMIndex = exportOrder.findIndex(col => /^M\d+$/i.test(col));
      // Rebuild: non-M columns before first M + sorted M columns + remaining non-M columns
      const beforeM = nonMColumns.filter((col, idx) => exportOrder.indexOf(col) < firstMIndex);
      const afterM = nonMColumns.filter((col, idx) => exportOrder.indexOf(col) > firstMIndex);
      exportOrder = [...beforeM, ...mColumns, ...afterM];
      console.log(`🔢 [Stream] Sorted ${mColumns.length} M columns numerically: ${mColumns.slice(0, 10).join(', ')}${mColumns.length > 10 ? '...' : ''}`);
    }
    
    // CRITICAL FIX: If MOD exists and ICD exists, ensure MOD comes immediately after ICD
    const icdIdx = exportOrder.findIndex(h => String(h).toUpperCase() === 'ICD');
    const modIdx = exportOrder.findIndex(h => String(h).toUpperCase() === 'MOD');
    
    if (icdIdx !== -1 && modIdx !== -1 && modIdx !== icdIdx + 1) {
      // Remove MOD from current position
      exportOrder = exportOrder.filter(h => String(h).toUpperCase() !== 'MOD');
      // Insert MOD right after ICD
      const modColumn = uploadHeaders.find(h => String(h).toUpperCase() === 'MOD');
      if (modColumn) {
        const newIcdIdx = exportOrder.findIndex(h => String(h).toUpperCase() === 'ICD');
        exportOrder.splice(newIcdIdx + 1, 0, modColumn);
        console.log(`🔧 [Stream] Fixed MOD position: placed after ICD at position ${newIcdIdx + 1}`);
      }
    }
    
    console.log(`✅ [Stream] Final column order (${exportOrder.length} columns):`);
    console.log(`   First 20: ${exportOrder.slice(0, 20).join(', ')}`);
    const finalIcdIdx = exportOrder.findIndex(h => String(h).toUpperCase() === 'ICD');
    const finalModIdx = exportOrder.findIndex(h => String(h).toUpperCase() === 'MOD');
    if (finalIcdIdx !== -1 && finalModIdx !== -1) {
      console.log(`   🎯 ICD at position ${finalIcdIdx}, MOD at position ${finalModIdx} (should be ${finalIcdIdx + 1})`);
    }

    if (jobId) updateProgress(jobId, { percent: 90, message: `Streaming: writing Excel...` });

    // Create streaming workbook
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const excelFilePath = path.join(outputDir, `${orig} Implemented.xlsx`);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: excelFilePath,
      useStyles: false,
      useSharedStrings: false
    });

    // Main sheet
    const sheet1 = workbook.addWorksheet('Sheet1');
    sheet1.addRow(exportOrder).commit();

    // Optional M-Records sheets (only if measures selected)
    // Don't create sheets upfront - create them lazily when first record is found
    const measureSheets = {};

    // Second pass: write rows in export order; also stream selected measure rows
    let written = 0;
    for await (const doc of collection.find()) {
      // Universal fix: Map columns with proper default values
      const row = exportOrder.map((k) => {
        if (doc[k] !== undefined && doc[k] !== null) {
          return doc[k];
        } else {
          // Default to 0 for measure/indicator columns, empty string for text columns
          const colUpper = String(k).toUpperCase();
          const isNumericColumn = /^(M|CPT|ICD|IC|CP|E)\d+/i.test(colUpper) || 
                                   /^(M|CPT|ICD|IC|CP|E)0+\d+/i.test(colUpper);
          return isNumericColumn ? 0 : '';
        }
      });
      sheet1.addRow(row).commit();

      // Stream measure rows - create sheet only when first record is found
      if (Array.isArray(selectedMeasures) && selectedMeasures.length > 0) {
        const filtered = {};
        for (const f of recordFields) {
          if (doc.hasOwnProperty(f)) filtered[f] = doc[f];
        }
        for (const m of selectedMeasures) {
          const mValue = doc[m];
          if (mValue == 1) {
            // Lazy create: only create worksheet when we find the first record
            if (!measureSheets[m]) {
              const ws = workbook.addWorksheet(`${m} Records`);
              ws.addRow(recordFields).commit();
              measureSheets[m] = ws;
              console.log(`   📝 Created ${m} Records sheet (found first record with ${m}=1)`);
            }
            const ws = measureSheets[m];
            ws.addRow(recordFields.map((f) => filtered[f])).commit();
          }
        }
      }

      written++;
      if (jobId && written % 10000 === 0) {
        const percent = 90 + Math.min(8, Math.floor((written / Math.max(1, totalDocs)) * 8 * 100) / 100);
        updateProgress(jobId, { percent, message: `Streaming: ${written}/${totalDocs} rows written...` });
        if (global.gc) global.gc();
      }
    }

    // Log M-Records sheet summary
    if (Array.isArray(selectedMeasures) && selectedMeasures.length > 0) {
      const createdCount = Object.keys(measureSheets).length;
      const skippedMeasures = selectedMeasures.filter(m => !measureSheets[m]);
      console.log(`📊 [Stream] Created ${createdCount} M-Records sheets (skipped ${skippedMeasures.length} empty: ${skippedMeasures.join(', ')})`);
    }

    // Counts sheet
    const countsWs = workbook.addWorksheet('Counts');
    countsWs.addRow(['Column', 'Count']).commit();
    // Sort M columns numerically before adding rows
    const sortedCounts = Object.entries(columnCounts).sort((a, b) => {
      // Extract number: M007 -> 7, M0019 -> 19, M00118 -> 118
      const getNum = (str) => {
        const match = str.match(/^M(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getNum(a[0]) - getNum(b[0]);
    });
    for (const [k, v] of sortedCounts) {
      countsWs.addRow([k, v]).commit();
    }

    // Count2 sheet
    if (Object.keys(count2Columns).length > 0) {
      const count2Ws = workbook.addWorksheet('Count2');
      count2Ws.addRow(['Column', 'Count']).commit();
      // Sort IC/CP columns numerically before adding rows
      const sortedCount2 = Object.entries(count2Columns).sort((a, b) => {
        const getNum = (str) => {
          const match = str.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        };
        const numA = getNum(a[0]);
        const numB = getNum(b[0]);
        if (numA === numB) return a[0].localeCompare(b[0]);
        return numA - numB;
      });
      for (const [k, v] of sortedCount2) {
        count2Ws.addRow([k, v]).commit();
      }
    }

    await workbook.commit();

    // Progress and size
    const stats = fs.statSync(excelFilePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ [Stream] Excel written: ${excelFilePath} (${fileSizeMB} MB)`);
    if (jobId) updateProgress(jobId, { percent: 99, message: `Excel ready (${fileSizeMB} MB)` });

  } catch (err) {
    console.error('❌ Error in generateExcelFileStreaming:', err);
    throw err;
  }
}
app.get("/files/:fileName", (req, res) => {
  const { fileName } = req.params;
  const folder = req.query.value === "down" ? "output1" : "output";
  const filePath = path.join(__dirname, folder, fileName);

  console.log("Requested file:", fileName);
  console.log("Selected folder:", folder);
  console.log("Full file path:", filePath);
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return res.status(404).send("File not found");
  }

  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === ".xlsx"
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/octet-stream";
  res.setHeader("Content-Type", contentType);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("error", (err) => {
    console.error("Error reading file:", err);
    if (!res.headersSent) {
      res.status(500).send("Error reading file");
    }
  });

  fileStream.on("end", () => {
    console.log("File download complete:", fileName);
  });
});

app.delete("/files/:fileName", async (req, res) => {
  const { fileName } = req.params;

  const folder = req.query.value === "feedback" ? "output1" : "output";
  console.log("folder????", folder);

  const filePath = path.join(__dirname, folder, fileName);

  const db = fileName.split(" ");
  const databaseName = db[0] + "_database";

  try {
    fs.unlinkSync(filePath);

    const dbConnection = mongoose.createConnection(
      `mongodb://127.0.0.1:27017/${databaseName}`
    );

    await dbConnection.dropDatabase();

    await dbConnection.close();

    res.status(200).send({
      message: `File deleted successfully.`,
    });
  } catch (error) {
    console.error("Error during deletion process:", error);
    res.status(500).send({ message: "Error deleting file or database." });
  }
});

app.post("/calculate", upload.single("file"), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send("No file uploaded");
  }

  if (path.extname(file.originalname) !== ".csv") {
    return res.status(400).send("Only .csv files are allowed");
  }

  const { startDate, endDate, columns } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).send("Start date and end date are required");
  }

  const columnsArray = columns ? columns.split(",") : [];
  if (columnsArray.length === 0) {
    return res
      .status(400)
      .json({ message: "No columns specified for processing" });
  }

  try {
    const filePath = path.join(__dirname, "uploads", file.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(400).send("File does not exist");
    }

    const filtered = [];
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const date = new Date(row["DOS"]);
        if (date >= startDateObj && date <= endDateObj) {
          filtered.push(row);
        }
      })
      .on("end", async () => {
        try {
          let columnResults = columnsArray.map((column) => {
            const totalOnes = filtered.reduce((count, row) => {
              return count + (row[column] === "1" ? 1 : 0);
            }, 0);

            let cleanedColumn = column.replace(/^M/, "").replace(/^0+/, "");

            return {
              "Practice Name": path.basename(file.originalname, ".csv"),
              "Quality Measure ID": `Quality ID #${cleanedColumn}`,
              Denominators: totalOnes,
            };
          });

          const providerResults = {};
          filtered.forEach((row) => {
            const provider = row["PROV"];
            if (!providerResults[provider]) {
              providerResults[provider] = {};
            }
            columnsArray.forEach((col) => {
              if (row[col] === "1") {
                if (!providerResults[provider][col]) {
                  providerResults[provider][col] = 0;
                }
                providerResults[provider][col]++;
              } else {
                if (!providerResults[provider][col]) {
                  providerResults[provider][col] = 0;
                }
              }
            });
          });

          const columnResults2 = [];
          Object.keys(providerResults).forEach((provider) => {
            const rowCounts = providerResults[provider];
            columnsArray.forEach((col) => {
              columnResults2.push({
                "Practice Name": path.basename(file.originalname, ".csv"),
                "Provider Names": provider,
                "Quality Measure ID": `Quality ID #${col
                  .replace(/^M/, "")
                  .replace(/^0+/, "")}`,
                Denominators: rowCounts[col] || 0,
                "Measure Type": "",
                Met: "",
                "Not Met": "",
                "Reporting Rate": "",
                "Performance Rate": "",
                Point: "",
              });
            });
          });

          columnResults.sort((a, b) => {
            return (
              extractQualityIdNumber(a["Quality Measure ID"]) -
              extractQualityIdNumber(b["Quality Measure ID"])
            );
          });

          columnResults2.sort((a, b) => {
            return (
              extractQualityIdNumber(a["Quality Measure ID"]) -
              extractQualityIdNumber(b["Quality Measure ID"])
            );
          });

          const blankRows = [{}, {}, {}];
          const results2Header = [
            {
              "Practice Name": "Practice Name",
              "Quality Measure ID": "Quality Measure ID",
              "Provider Names": "Provider Names",
              Denominators: "Denominators",
              "Measure Type": "Measure Type",
              Met: "Met",
              "Not Met": "Not Met",
              "Reporting Rate": "Reporting Rate",
              "Performance Rate": "Performance Rate",
              Point: "Point",
            },
          ];

          const combinedData = [
            ...columnResults,
            ...blankRows,
            {},
            ...results2Header,
            ...columnResults2,
          ];

          const combinedSheet = XLSX.utils.json_to_sheet(combinedData);

          const resultWorkbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(
            resultWorkbook,
            combinedSheet,
            "Results"
          );
          // Format the date to only keep the YYYY-MM-DD part
          const formattedStartDate = new Date(startDate)
            .toISOString()
            .split("T")[0]; // '2024-02-20'
          const formattedEndDate = new Date(endDate)
            .toISOString()
            .split("T")[0]; // '2025-01-07'

          const resultFilePath = path.join(
            __dirname,
            "output1",
            `${path.basename(
              file.originalname,
              path.extname(file.originalname)
            )} FR ${formattedStartDate}--${formattedEndDate}.xlsx`
          );

          XLSX.writeFile(resultWorkbook, resultFilePath);

          res.status(200).json({
            status: 200,
            message: "File processed successfully",
            results: columnResults,
          });
        } catch (err) {
          console.error("Error generating XLSX file:", err);
          res.status(500).send("An error occurred while processing data");
        }
      })
      .on("error", (err) => {
        console.error("Error reading CSV file:", err);
        res.status(500).send("An error occurred while reading the CSV file");
      });
  } catch (err) {
    console.error("Error processing file:", err);
    res.status(500).send("An error occurred while processing the file");
  }
});

function extractQualityIdNumber(qualityId) {
  const match = qualityId.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

const PORT = process.env.PORT || 4700;
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
// Disable server timeout (no timeout for long uploads/processing)
server.setTimeout(0);
