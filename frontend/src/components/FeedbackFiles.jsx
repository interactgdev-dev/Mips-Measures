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
  Stack,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import PageShell from "./PageShell";

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
        setFiles(response?.data?.files ?? []);
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
      setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
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

  const fileList = Array.isArray(files) ? files : [];

  const filteredFiles = fileList
    .filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === "asc") {
        return a.name.localeCompare(b.name);
      }
      return b.name.localeCompare(a.name);
    });

  if (loading) {
    return (
      <PageShell maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Loading feedback files…
          </Typography>
        </Paper>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "error.light",
            bgcolor: "#fff5f5",
          }}
        >
          <Typography variant="h6" color="error.dark">
            {error}
          </Typography>
        </Paper>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="lg">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <Stack spacing={0.5} sx={{ mb: 3 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.12em" }}>
            Feedback
          </Typography>
          <Typography variant="h4" component="h1" sx={{ color: "primary.main" }}>
            Feedback files
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Download or remove feedback workbooks from the server.
          </Typography>
        </Stack>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            mb: 3,
          }}
        >
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ flex: 1, bgcolor: "background.paper" }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
            <InputLabel>Sort</InputLabel>
            <Select value={sortOrder} label="Sort" onChange={handleSortChange} sx={{ bgcolor: "background.paper" }}>
              <MenuItem value="asc">Name A–Z</MenuItem>
              <MenuItem value="desc">Name Z–A</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: "primary.main", color: "primary.contrastText" }}>
                  File name
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "primary.main", color: "primary.contrastText" }}>Size</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "primary.main", color: "primary.contrastText" }}>Date</TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 700, bgcolor: "primary.main", color: "primary.contrastText", pr: 2 }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFiles.map((file) => (
                <TableRow key={file.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{file.name}</TableCell>
                  <TableCell>{file.size}</TableCell>
                  <TableCell>{file.lastModified}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => handleDownload(file.name)} aria-label="Download">
                      <DownloadIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(file.name)} aria-label="Delete">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity={message.includes("Failed") ? "error" : "success"}
          variant="filled"
          sx={{ fontWeight: 600 }}
        >
          {message}
        </Alert>
      </Snackbar>
    </PageShell>
  );
};

export default FeedbackFiles;
