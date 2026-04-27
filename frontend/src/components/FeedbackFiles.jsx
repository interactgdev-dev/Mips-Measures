import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

const FeedbackFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [message, setMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await axios.get("http://localhost:4700/files?v=f");
        setFiles(response?.data?.files);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch files. Please try again later.");
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleDownload = async (fileName) => {
    try {
      const response = await axios({
        url: `http://localhost:4700/files/${fileName}?value=down`,
        method: "GET",
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to download the file. Please try again later.");
    }
  };

  const handleDelete = async (fileName) => {
    try {
      const response = await axios.delete(
        `http://localhost:4700/files/${fileName}?value=feedback`
      );
      setMessage(response.data.message || "File deleted successfully");
      setOpenSnackbar(true);
      setFiles((prevFiles) =>
        prevFiles.filter((file) => file.name !== fileName)
      );
    } catch (err) {
      setMessage("Failed to delete the file. Please try again later.");
      setOpenSnackbar(true);
    }
  };

  const handleSortChange = (event) => {
    setSortOrder(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const filteredFiles = files
    .filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === "asc") {
        return a.name.localeCompare(b.name);
      }
      return b.name.localeCompare(a.name);
    });

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", marginTop: "20px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography
        variant="h6"
        sx={{ textAlign: "center", marginTop: "20px", color: "red" }}
      >
        {error}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: "1000px",
        margin: "20px auto",
        padding: "30px",
        backgroundColor: "#f9f9f9",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        align="center"
        sx={{ fontWeight: "bold", color: "#1976d2" }}
      >
        Feedback files
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <TextField
          label="Search Files"
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchChange}
          sx={{
            flex: 1,
            backgroundColor: "#fff",
            borderRadius: "8px",
          }}
        />
        <FormControl sx={{ flex: 1 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortOrder}
            label="Sort By"
            onChange={handleSortChange}
            sx={{
              backgroundColor: "#fff",
              borderRadius: "8px",
            }}
          >
            <MenuItem value="asc">Ascending</MenuItem>
            <MenuItem value="desc">Descending</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: "12px" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#1976d2" }}>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                File Name
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                Size
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                Date
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFiles.map((file) => (
              <TableRow key={file.id} hover>
                <TableCell>{file.name}</TableCell>
                <TableCell>{file.size}</TableCell>
                <TableCell>{file.lastModified}</TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleDownload(file.name)}
                    sx={{ padding: 1 }}
                  >
                    <DownloadIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(file.name)}
                    sx={{ padding: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity={message.includes("Failed") ? "error" : "success"}
          sx={{
            fontWeight: "bold",
            fontSize: "16px",
            color: "#fff",
            padding: "16px 24px",
            borderRadius: "8px",
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
            maxWidth: "400px",
            backgroundColor: message.includes("Failed") ? "#d32f2f" : "#388e3c",
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeedbackFiles;
