import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
  Paper,
} from "@mui/material";
import { calendarIcon } from "../assets";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { InputAdornment } from "@mui/material";
import axios from "axios";

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
  //   "M389",
  //   "M404",
  //   "M410",
  //   "M419",
  //   "M424",
  //   "M430",
  //   "M439",
  //   "M477",
  //   "M478",
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
    "M279",
    "M282",
    "M286",
    "M288",
    "M290",
    "M291",
    "M293",
    "M317",
    "M320",
    "M322",
    "M331",
    "M332",
    "M338",
    "M340",
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
    "M398",
    "M404",
    "M405",
    "M406",
    "M410",
    "M415",
    "M416",
    "M418",
    "M419",
    "M424",
    "M430",
    "M431",
    "M436",
    "M439",
    "M440",
    "M441",
    "M450",
    "M453",
    "M457",
    "M463",
    "M464",
    "M477",
    "M478",
    "M485",
    "M486",
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
        console.log("API Response:", response.data);
      } else {
        setLoading(false);
        setMessage("Processing failed!");
      }
    } catch (error) {
      setLoading(false);
      console.log("EEEEEEEEEEEEEEror", error);
      setMessage(error.response?.data || "Error processing the data.");
      setOpenSnackbar(true);
      console.error("Error making API request:", error);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ padding: "20px", maxWidth: "900px", margin: "50px auto" }}>
        <Paper elevation={3} sx={{ padding: "30px" }}>
          <Typography
            variant="h4"
            gutterBottom
            align="center"
            sx={{ fontWeight: "bold", color: "#1976d2" }}
          >
            Feedback Report Generators
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
                  label={
                    <Typography sx={{ fontSize: "14px" }}>{num}</Typography>
                  }
                />
              ))}
            </FormGroup>
          </Box>
          <Grid container spacing={12} sx={{ mb: 4 }}>
            <Grid item xs={2} md={6}>
              <DatePicker
                label="Select Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <img
                            className="side-bar-icon"
                            src={calendarIcon}
                            alt="calendar-icon"
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Select End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <img
                            className="side-bar-icon"
                            src={calendarIcon}
                            alt="calendar-icon"
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
          <Box sx={{ textAlign: "center", mb: 4 }}>
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
            onClick={handleSubmit}
            disabled={loading}
            fullWidth
            sx={{ padding: "10px 0", fontSize: "16px", fontWeight: "bold" }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ marginRight: 2 }} />
            ) : (
              "Submit"
            )}
            {loading && "Processing..."}
          </Button>
          {loading && (
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
            severity={message.includes("success") ? "success" : "error"}
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
    </LocalizationProvider>
  );
};

export default Calculator;
