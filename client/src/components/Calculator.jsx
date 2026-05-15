import React, { useState } from "react";
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
  Paper,
  Divider,
  Stack,
  InputAdornment,
} from "@mui/material";
import { calendarIcon } from "../assets";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import axios from "axios";
import PageShell from "./PageShell";

const Calculator = () => {
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // const checkboxes = [
  //   "M001",
  //   "M005",
  //   "M006",
  //   "M008",
  //   "M019",
  //   "M039",
  //   "M047",
  //   "M048",
  //   "M050",
  //   "M117",
  //   "M126",
  //   "M127",
  //   "M130",
  //   "M134",
  //   "M141",
  //   "M185",
  //   "M191",
  //   "M217",
  //   "M218",
  //   "M219",
  //   "M220",
  //   "M221",
  //   "M222",
  //   "M226",
  //   "M236",
  //   "M238",
  //   "M279",
  //   "M282",
  //   "M286",
  //   "M288",
  //   "M293",
  //   "M317",
  //   "M320",
  //   "M326",
  //   "M331",
  //   "M358",
  //   "M404",
  //   "M410",
  //   "M430",
  // ];
  //updated list
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
    "M254",
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
    "M394",
    "M395",
    "M396",
    "M397",
    "M398",
    "M404",
    "M405",
    "M410",
    "M415",
    "M416",
    "M418",
    "M430",
    "M431",
    "M436",
    "M438",
    "M440",
    "M441",
    "M450",
    "M453",
    "M457",
    "M463",
    "M464",
    "M470",
    "M477",
    "M478",
    "M485",
    "M486",
    "M488",
    "M489",
    "M491",
    "M497",
    "M499",
  ];

  const handleCheckboxChange = (value) => {
    setSelectedColumns((prev) =>
      prev.includes(value)
        ? prev.filter((num) => num !== value)
        : [...prev, value]
    );
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("Processing, please wait...");

    const formData = new FormData();
    formData.append("columns", selectedColumns.join(","));

    if (startDate) {
      formData.append("startDate", startDate.toISOString());
    } else {
      formData.append("startDate", null);
    }

    if (endDate) {
      formData.append("endDate", endDate.toISOString());
    } else {
      formData.append("endDate", null);
    }

    if (file) {
      formData.append("file", file);
    } else {
      console.error("No file selected");
      setLoading(false);
      setMessage("Please select a file.");
      setOpenSnackbar(true);
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:4700/calculate",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response.status === 200) {
        setLoading(false);
        setMessage("Data processed successfully!");
        setOpenSnackbar(true);
        setSelectedColumns([]);
        setStartDate(null);
        setEndDate(null);
      } else {
        setLoading(false);
        setMessage("Processing failed!");
      }
    } catch (error) {
      setLoading(false);
      setMessage(error.response?.data || "Error processing the data.");
      setOpenSnackbar(true);
      console.error("Calculate request failed:", error);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const measureCheckSx = {
    m: 0,
    mx: 0,
    pr: 0.5,
    minHeight: 32,
    alignItems: "center",
    "& .MuiCheckbox-root": { padding: "6px" },
    "& .MuiFormControlLabel-label": {
      fontSize: "0.8125rem",
      fontWeight: 600,
      lineHeight: 1.25,
    },
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <PageShell maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
            <Typography variant="h5" component="h1" sx={{ color: "primary.main", fontWeight: 700 }}>
              Feedback report
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {selectedColumns.length} selected
            </Typography>
          </Stack>

          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: (theme) => theme.palette.grey[50],
              p: { xs: 1, sm: 1.25 },
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Box
              role="group"
              aria-label="Select quality measures and options"
              sx={{
                maxHeight: { xs: 220, sm: 280 },
                overflowY: "auto",
                overflowX: "hidden",
                pr: 0.5,
                mr: -0.25,
                scrollbarGutter: "stable",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                bgcolor: "background.paper",
                p: 1,
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
                  columnGap: 0.75,
                  rowGap: 0.35,
                }}
              >
                {checkboxes.map((num) => (
                  <FormControlLabel
                    key={num}
                    control={
                      <Checkbox
                        checked={selectedColumns.includes(num)}
                        onChange={() => handleCheckboxChange(num)}
                      />
                    }
                    label={num}
                    sx={measureCheckSx}
                  />
                ))}
              </Box>
            </Box>

            <Divider />

            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <img className="side-bar-icon" src={calendarIcon} alt="" />
                          </InputAdornment>
                        ),
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="End"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <img className="side-bar-icon" src={calendarIcon} alt="" />
                          </InputAdornment>
                        ),
                      },
                    },
                  }}
                />
              </Grid>
            </Grid>

            <Divider />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ sm: "center" }}
              flexWrap="wrap"
              sx={{ minWidth: 0 }}
            >
              <input type="file" onChange={handleFileChange} style={{ display: "none" }} id="file-upload-calc" />
              <label htmlFor="file-upload-calc" style={{ cursor: loading ? "default" : "pointer" }}>
                <Button variant="contained" component="span" color="primary" size="small" startIcon={<CloudUploadIcon />} disabled={loading}>
                  Choose Excel file
                </Button>
              </label>
              {file && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontWeight: 500,
                    minWidth: 0,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.name}
                </Typography>
              )}
            </Stack>

            <Button
              variant="contained"
              color="secondary"
              size="medium"
              onClick={handleSubmit}
              disabled={loading}
              fullWidth
              sx={{ py: 1.1, fontWeight: 700 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1.5 }} />
                  Processing…
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </Box>

          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 3, gap: 2 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                {message}
              </Typography>
            </Box>
          )}
        </Paper>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={message.includes("success") ? "success" : "error"}
            variant="filled"
            sx={{ minWidth: 280, fontWeight: 600 }}
          >
            {message}
          </Alert>
        </Snackbar>
      </PageShell>
    </LocalizationProvider>
  );
};

export default Calculator;
