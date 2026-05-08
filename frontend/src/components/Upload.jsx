import React, { useState } from "react";
import {
  Button,
  Box,
  Typography,
  Snackbar,
  Alert,
  FormGroup,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Grid,
  Paper,
  InputAdornment,
  TextField,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import axios from "axios";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [procPercent, setProcPercent] = useState(0);
  const [procEta, setProcEta] = useState(null);
  const [procMessage, setProcMessage] = useState("");
  // Simulated progress for CPU-bound steps (like json_to_sheet) where SSE can't tick
  const simTimerRef = React.useRef(null);
  const [simPercent, setSimPercent] = useState(0);
  const [procLogs, setProcLogs] = useState([]); // rolling live logs

  // Use refs to track upload metrics
  const startTimeRef = React.useRef(null);
  const lastLoadedRef = React.useRef(0);
  const lastTimeRef = React.useRef(0);
  const emaSpeedRef = React.useRef(0);
  const totalBytesRef = React.useRef(0);
  const processingIntervalRef = React.useRef(null);
  const evtSourceRef = React.useRef(null);

  const checkboxes = [
    "M001",
  
"M005",
    "M006",
    "M007",
    "M008",
    "M024",
    "M039",
    "M047",
    "M048",
    "M050",
    "M052",
    "M065",
    "M066",
    "M116",
    "M117",
    "M118",
    "M126",
    "M127",
    "M130",
    "M134",
    "M137",
    "M141",
  "M143",
  "M144",
  "M145",
    "M155",
    "M176",
    "M177",
    "M178",
    "M180",
    "M181",
    "M182",
    "M185",
    "M187",
    "M191",
    "M217",
    "M218",
    "M219",
    "M220",
    "M221",
    "M222",
    "M226",
    "M236",
    "M238",
    "M243",
    "M249",
    "M250",
    "M268",
    "M277",
    "M279",
    "M282",
    "M286",
    "M288",
    "M291",
    "M293",
    "M317",
    "M320",
    "M326",
    "M331",
    "M332",
    "M338",
    "M350",
    "M351",
    "M354",
    "M355",
    "M356",
    "M357",
    "M358",
    "M360",
    "M364",
    "M374",
    "M383",
    "M384",
    "M385",
    "M389",
    "M394",
    "M395",
    "M396",
    "M397",
    "M405",
    "M406",
    "M404",
    "M410",
    "M415",
    "M416",
    "M419",
    "M424",
    "M430",
    "M431",
    "M439",
    "M444",
    "M477",
    "M478",
    "M485",
    "M486",
  "M450",
  ];

  const handleCheckboxChange = (value) => {
    setSelectedColumns((prev) =>
      prev.includes(value)
        ? prev.filter((num) => num !== value)
        : [...prev, value]
    );
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = () => {
    if (!file) {
      setMessage("No file selected!");
      setOpenSnackbar(true);
      return;
    }

    setLoading(true);
    setMessage("Processing please wait...");
  setUploadProgress(0);
  setTimeRemaining(null);
  setUploadSpeed(0);
  setProcPercent(0);
  setProcEta(null);
  setProcMessage("");
  setProcessingStartTime(null);
  setProcessingTime(0);

  const formData = new FormData();
  const jobId = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    formData.append("file", file);
    formData.append("columns", selectedColumns.join(","));

  const isSelected = selectedColumns.length > 0;
    formData.append("isSelected", isSelected);
  formData.append("jobId", jobId);

    // Initialize tracking
  startTimeRef.current = Date.now();
  lastLoadedRef.current = 0;
  lastTimeRef.current = Date.now() / 1000;
  emaSpeedRef.current = 0;
  totalBytesRef.current = file?.size || 0;

    // Open SSE for processing progress
    try {
      evtSourceRef.current = new EventSource(`http://localhost:4700/progress/${jobId}`);
      evtSourceRef.current.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data || '{}');
          if (!payload) return;

          if (payload.phase === 'init') return;

          // Initialize processing timer start on first payload
          if (!processingStartTime) {
            const startTs = payload.ts || Date.now();
            setProcessingStartTime(startTs);
            setProcessingTime(0);
          }

          if (typeof payload.percent === 'number') {
            setProcPercent(Math.max(0, Math.min(100, Math.round(payload.percent))));
          }
          if (typeof payload.etaSeconds === 'number') {
            setProcEta(payload.etaSeconds);
          }
          const newMsg = payload.message || 'Processing...';
          setProcMessage(newMsg);

          // If backend reports a long synchronous step, drive a local progress simulation
          if (/^Building Sheet1 \(/.test(newMsg)) {
            // Parse estimate (~Xs)
            const match = newMsg.match(/~(\d+)s/);
            const est = match ? parseInt(match[1], 10) : 10;
            const start = Math.max(91, payload.percent || procPercent || 91);
            const target = 96; // map Sheet1 build to 91-96%
            const durationMs = Math.max(4000, est * 1000);
            const startTs = Date.now();

            if (simTimerRef.current) clearInterval(simTimerRef.current);
            setSimPercent(start);
            simTimerRef.current = setInterval(() => {
              const t = Date.now() - startTs;
              const p = Math.min(1, t / durationMs);
              const val = Math.round(start + p * (target - start));
              setSimPercent(val);
              if (p >= 1) {
                clearInterval(simTimerRef.current);
                simTimerRef.current = null;
              }
            }, 500);
          } else if (/^Sheet1 created /.test(newMsg)) {
            // Finish simulation immediately
            if (simTimerRef.current) {
              clearInterval(simTimerRef.current);
              simTimerRef.current = null;
            }
            setSimPercent(96);
          }

          // Append to rolling logs when message changes
          if (newMsg) {
            setProcLogs((prev) => {
              const last = prev[prev.length - 1];
              const ts = new Date(payload.ts || Date.now());
              const time = ts.toLocaleTimeString();
              const line = `${time}  ${newMsg}`;
              // avoid duplicates if same as last line
              if (last && last.endsWith(newMsg)) return prev;
              const next = [...prev, line];
              // keep last 200 lines max
              return next.slice(-200);
            });
          }

          // Update elapsed processing time using payload timestamp
          const ts = payload.ts || Date.now();
          setProcessingTime((prev) => {
            const start = processingStartTime || ts;
            return Math.max(0, Math.round((ts - start) / 1000));
          });

          // If processing finished, we can close SSE
          if (payload.percent >= 100 && evtSourceRef.current) {
            try { evtSourceRef.current.close(); } catch {}
            evtSourceRef.current = null;
            if (simTimerRef.current) { clearInterval(simTimerRef.current); simTimerRef.current = null; }
          }
        } catch { /* ignore parse errors */ }
      };
      evtSourceRef.current.onerror = () => { /* auto-reconnect default; ignore */ };
    } catch { /* ignore */ }

    axios
      .post("http://localhost:4700/upload", formData, {
        timeout: 0, // No timeout for large file uploads
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || totalBytesRef.current || file?.size || 0;
          const loaded = progressEvent.loaded || 0;

          const percentCompleted = total > 0 ? Math.min(100, Math.round((loaded * 100) / total)) : 0;
          setUploadProgress(percentCompleted);

          // Calculate smoothed upload speed (EMA) and ETA
          const nowSec = Date.now() / 1000;
          const dt = nowSec - (lastTimeRef.current || nowSec);
          const dBytes = loaded - (lastLoadedRef.current || 0);

          if (dt > 0.1 && dBytes >= 0) {
            const instant = dBytes / dt; // bytes/sec
            const alpha = 0.2; // smoothing factor
            emaSpeedRef.current = emaSpeedRef.current > 0 ? alpha * instant + (1 - alpha) * emaSpeedRef.current : instant;
            setUploadSpeed(emaSpeedRef.current);
            lastTimeRef.current = nowSec;
            lastLoadedRef.current = loaded;
          }

          const speed = emaSpeedRef.current || (loaded > 0 ? loaded / Math.max(1e-3, nowSec - startTimeRef.current / 1000) : 0);
          const bytesRemaining = Math.max(0, total - loaded);
          const secondsRemaining = speed > 0 ? bytesRemaining / speed : null;
          setTimeRemaining(secondsRemaining && isFinite(secondsRemaining) ? secondsRemaining : null);

          // When upload truly reaches 100%, move to processing phase UI
          if (total > 0 && loaded >= total && percentCompleted === 100 && !processingIntervalRef.current) {
            setMessage("File uploaded! Processing data...");
          }
        },
      })
      .then((response) => {
          // Upload and processing complete
          if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current);
          }
        
          setLoading(false);
          setMessage("File processed successfully!");
          setSelectedColumns([]);
          setUploadProgress(0);
          setTimeRemaining(null);
          setUploadSpeed(0);
          setProcessingTime(0);
          setProcLogs([]);
          if (simTimerRef.current) { clearInterval(simTimerRef.current); simTimerRef.current = null; }
      setOpenSnackbar(true);
      setFile("");
      if (evtSourceRef.current) { try { evtSourceRef.current.close(); } catch {} evtSourceRef.current = null; }
      })
      .catch((error) => {
        console.log("Error:", error);
        if (processingIntervalRef.current) {
          clearInterval(processingIntervalRef.current);
        }
        setLoading(false);
        setUploadProgress(0);
        setTimeRemaining(null);
        setUploadSpeed(0);
  setProcessingTime(0);
  setProcLogs([]);

        const errorMessage =
          typeof error.response?.data === "string"
            ? error.response.data
            : "File upload failed!";
        setMessage(errorMessage);

        setOpenSnackbar(true);
        setFile("");
        if (evtSourceRef.current) { try { evtSourceRef.current.close(); } catch {} evtSourceRef.current = null; }
      });
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || seconds === Infinity || isNaN(seconds)) {
      return "Calculating...";
    }
    if (seconds < 1) return "Less than 1 second";
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return "0 KB/s";
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(2)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
  };

  return (
    <Box sx={{ padding: "20px", maxWidth: "900px", margin: "50px auto" }}>
      <Paper elevation={3} sx={{ padding: "30px" }}>
        <Typography
          variant="h4"
          gutterBottom
          align="center"
          sx={{ fontWeight: "bold", color: "#1976d2" }}
        >
          Select Measures
        </Typography>

        <Box
          sx={{
            maxHeight: "200px",
            overflowY: "auto",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "10px",
            mb: 4,
          }}
        >
          <FormGroup row>
            {checkboxes.map((num) => (
              <FormControlLabel
                key={num}
                control={
                  <Checkbox
                    checked={selectedColumns.includes(num)}
                    onChange={() => handleCheckboxChange(num)}
                    sx={{ color: "#1976d2" }}
                  />
                }
                label={<Typography sx={{ fontSize: "14px" }}>{num}</Typography>}
              />
            ))}
          </FormGroup>
        </Box>

        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" sx={{ marginBottom: 2 }}>
            Upload Your File
          </Typography>

          <input
            type="file"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button
              variant="contained"
              component="span"
              color="primary"
              startIcon={<CloudUploadIcon />}
              disabled={loading}
              sx={{ marginBottom: 2 }}
            >
              Choose File
            </Button>
          </label>

          {file && (
            <Typography variant="body1" sx={{ marginBottom: 2 }}>
              Selected File: {file.name}
            </Typography>
          )}
        </Box>

        <Button
          variant="contained"
          color="secondary"
          onClick={handleUpload}
          disabled={loading}
          fullWidth
          sx={{ padding: "10px 0", fontSize: "16px", fontWeight: "bold" }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ marginRight: 2 }} />
          ) : (
            "Upload"
          )}
          {loading && "Processing..."}
        </Button>

        {loading && (
          <Box sx={{ marginTop: 3 }}>
            {/* Speed text removed as requested */}
            
            {/* Upload progress bar removed as requested */}

            {uploadProgress < 100 ? (
              <Typography
                variant="body1"
                sx={{ textAlign: "center", color: "#1976d2", fontWeight: 500, mb: 1 }}
              >
                Estimated Time Remaining: {formatTime(timeRemaining)}
              </Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Processing: {procPercent}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ETA: {formatTime(procEta)}
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', height: 8, backgroundColor: '#e0e0e0', borderRadius: 1, overflow: 'hidden', mb: 2 }}>
                  <Box sx={{ width: `${Math.max(procPercent, simPercent)}%`, height: '100%', backgroundColor: '#2e7d32', transition: 'width 0.3s ease' }} />
                </Box>
                <Typography variant="body1" sx={{ textAlign: 'center', color: '#1976d2', fontWeight: 500, mb: 1 }}>
                  {procMessage || 'Processing...'}
                </Typography>

                {/* Live processing log */}
                <Box sx={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: 12,
                  background: '#fafafa',
                  border: '1px solid #eee',
                  borderRadius: 1,
                  maxHeight: 180,
                  overflowY: 'auto',
                  p: 1,
                  mb: 2,
                }}>
                  {procLogs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Waiting for progress...</Typography>
                  ) : (
                    procLogs.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))
                  )}
                </Box>
              </>
            )}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <CircularProgress sx={{ marginRight: 2 }} />
              <Typography variant="body1">{message}</Typography>
            </Box>
          </Box>
        )}
      </Paper>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={String(message).includes("success") ? "success" : "error"}
          sx={{
            fontWeight: "bold",
            fontSize: "16px",
            padding: "16px 24px",
            borderRadius: "8px",
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
            maxWidth: "400px",
            backgroundColor: message.includes("success")
              ? "#388e3c"
              : "#d32f2f",
            color: "#fff",
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Upload;
