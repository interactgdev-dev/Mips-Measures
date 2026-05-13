const express = require("express");
const moment = require("moment");
const mongoose = require("mongoose");
const path = require("path");
const XLSX = require("xlsx");
const debug = require("debug")("app:server");
const debugError = require("debug")("app:error");
let limit;
(async () => {
  const pLimit = (await import("p-limit")).default;
  limit = pLimit(3);
})();

const csv = require("csv-parser");

const fs = require("fs");
const fsPromises = require("fs").promises;
const app = express();
const cors = require("cors");
const Measures = require("./utils/processing");
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

const upload = multer({ storage });

app.use(express.json());

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
  M001: "measure1",
  M005: "measure5",
  M006: "measure6",
  M007: "measure7",
  M008: "measure8",
  M019: "measure19",
  // M024: "measure24",
  M039: "measure39",
  M047: "measure47",
  M048: "measure48",
  M050: "measure50",
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
  M326: "measure326",
  M331: "measure331",
  M338: "measure338",
  M350: "measure350",
  M351: "measure351",
  M354: "measure354",
  M355: "measure355",
  M356: "measure356",
  M357: "measure357",
  M358: "measure358",
  M360: "measure360",
  M364: "measure364",
  M384: "measure384",
  M385: "measure385",
  M394: "measure394",
  M395: "measure395",
  M396: "measure396",
  M397: "measure397",
  M398: "measure398",
  M404: "measure404",
  M405: "measure405",
  M410: "measure410",
  M415: "measure415",
  M416: "measure416",
  M418: "measure418",
  M430: "measure430",
  M431: "measure431",
  M438: "measure438",
  M440: "measure440",
  M441: "measure441",
  M450: "measure450",
  M453: "measure453",
  M457: "measure457",
  M463: "measure463",
  M464: "measure464",
  M470: "measure470",
  M477: "measure477",
  M478: "measure478",
  M485: "measure485",
  M486: "measure486",
  M488: "measure488",
  M489: "measure489",
  M491: "measure491",
  M497: "measure497",
  M499: "measure499",
};

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { columns, isSelected } = req.body;
    const file = req.file;
    console.log("Columns............................", columns);
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

    await processUploadedFile(file.path, fileName, columns, res);
  } catch (error) {
    console.error("Unexpected error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Unexpected error occurred" });
    }
  }
});

async function processUploadedFile(filePath, fileName, columns, res) {
  try {
    console.log("Processing uploaded file:", fileName);
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

    const dbConnection = await connectToDatabase(database_name);
    const collection = dbConnection.collection(table_name);
    const result = await collection.insertMany(data);
    console.log(`Inserted ${result.insertedCount} documents.`);

    await processRecordsInChunks(collection, collection.find(), columns);
    const updateRecords = await fetchUpdateRecords(collection);

    const { columnCounts, count2Columns, mSheets } = await processExcelData(
      updateRecords
    );

    generateExcelFile(
      updateRecords,
      columnCounts,
      count2Columns,
      mSheets,
      orig
    );

    await deleteFileIfExists(filePath);

    return res.status(200).json({
      message:
        "File uploaded, data inserted, and Excel file generated successfully",
      insertedCount: result.insertedCount,
      database: database_name,
      excelFilePath: `./output/${originalName}`,
    });
  } catch (error) {
    console.error("Error processing file:", error);

    if (!res.headersSent) {
      return res.status(500).json({ message: "Error processing file" });
    }
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
    `mongodb://localhost:27017/${database_name}`
  );
  return new Promise((resolve, reject) => {
    dbConnection.once("open", () => resolve(dbConnection));
    dbConnection.on("error", (err) => reject(err));
  });
}

async function processRecordsInChunks(collection, cursor, columns) {
  const BATCH_SIZE = 800;
  let batch = [];
  let batchCount = 0;

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length === BATCH_SIZE) {
      batchCount++;
      await processBatch(collection, batch, batchCount, columns);
      batch = [];
    }
  }

  if (batch.length > 0) {
    batchCount++;
    await processBatch(collection, batch, batchCount, columns);
  }
}

async function processBatch(collection, batch, batchCount, columns) {
  try {
    console.log("Functions colums...................", columns);
    console.log(`Processing batch ${batchCount}`);
    const selectedFunctions = columns
      ? columns
          .split(",")
          .map((column) => functionMapping[column])
          .filter(Boolean)
      : Object.values(functionMapping);

    if (!selectedFunctions.length) {
      console.warn("No valid functions selected for processing.");
      return;
    }
    console.log("Selected Functions????..........", selectedFunctions);
    await Promise.all(
      selectedFunctions.map((funcName) => {
        if (typeof Measures[funcName] === "function") {
          return Measures[funcName](collection, batch);
        } else {
          console.warn(`Function ${funcName} is not defined in Measures.`);
        }
      })
    );
    console.log("Selected functions...........", selectedFunctions);
    console.log(`Batch ${batchCount} processed successfully`);
  } catch (err) {
    console.error(`Error processing batch ${batchCount}: ${err}`);
  }
}

async function fetchUpdateRecords(collection) {
  const updateRecords = [];
  const updateCursor = collection.find();
  for await (const doc of updateCursor) {
    updateRecords.push(doc);
  }
  return updateRecords;
}

function processExcelData(updateRecords) {
  const columnCounts = {};
  const count2Columns = {};
  const mSheets = {};

  const requiredFields = [
    "DOS",
    "TICKET NO",
    "NAME",
    "GEN",
    "AGE",
    "DOB",
    "CPT",
    "ICD",
    "MOD",
    "POS",
    "PROV",
  ];

  for (const record of updateRecords) {
    const filteredRecord = {};
    for (const field of requiredFields) {
      if (record.hasOwnProperty(field)) {
        filteredRecord[field] = record[field];
      }
    }

    for (const key in record) {
      if (key.startsWith("M") && key !== "MOD") {
        if (!columnCounts[key]) columnCounts[key] = 0;
        if (record[key] == 1) {
          columnCounts[key]++;
          if (!mSheets[key]) mSheets[key] = [];

          mSheets[key].push(filteredRecord);
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

function generateExcelFile(
  updateRecords,
  columnCounts,
  count2Columns,
  mSheets,
  orig
) {
  try {
    // Create a new workbook
    const outputWorkbook = XLSX.utils.book_new();

    // Sheet 1: Main Data
    const mainWorksheet = XLSX.utils.json_to_sheet(updateRecords);
    XLSX.utils.book_append_sheet(outputWorkbook, mainWorksheet, "Sheet1");

    // Sheet 2: Column Counts
    const countsData = Object.entries(columnCounts).map(([column, count]) => ({
      Column: column,
      Count: count,
    }));
    const countsWorksheet = XLSX.utils.json_to_sheet(countsData);
    XLSX.utils.book_append_sheet(outputWorkbook, countsWorksheet, "Counts");

    // ✅ Add Count 2 Columns as a New Sheet (if exists)
    if (count2Columns && Object.keys(count2Columns).length > 0) {
      const count2Data = Object.entries(count2Columns).map(
        ([column, count]) => ({
          Column: column,
          Count: count,
        })
      );
      const count2Worksheet = XLSX.utils.json_to_sheet(count2Data);
      XLSX.utils.book_append_sheet(outputWorkbook, count2Worksheet, "Count2");
    }

    Object.entries(mSheets).forEach(([key, records]) => {
      const mWorksheet = XLSX.utils.json_to_sheet(records);
      XLSX.utils.book_append_sheet(
        outputWorkbook,
        mWorksheet,
        `${key} Records`
      );
    });

    const outputDir = "./output";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Write the Excel file
    const excelFilePath = `./output/${orig} Implemented.xlsx`;
    XLSX.writeFile(outputWorkbook, excelFilePath);
    console.log(`Excel file written successfully: ${excelFilePath}`);
  } catch (error) {
    console.error("Error generating Excel file:", error);
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
  res.setHeader("Content-Type", "application/octet-stream");

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
      `mongodb://localhost:27017/${databaseName}`
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
