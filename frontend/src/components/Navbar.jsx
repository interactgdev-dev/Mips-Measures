import React from "react";
import { Link } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";

const Navbar = () => {
  return (
    <div style={{ margin: 0, padding: 0 }}>
      <AppBar position="fixed" elevation={0} sx={{
        background: 'linear-gradient(90deg, #232b47 0%, #3a4ca8 100%)',
        backdropFilter: 'blur(8px)',
        borderRadius: '0 0 18px 18px',
        boxShadow: '0 4px 24px 0 rgba(50,60,130,0.18)',
        px: 2,
      }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: 72, px: 2 }}>
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="/"
              sx={{
                mr: 3,
                display: { xs: "none", md: "flex" },
                alignItems: 'center',
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".3rem",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <img src="/logo.png" alt="Logo" style={{ height: 60, marginRight: 16, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))' }} />
            </Typography>

            <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }} />

            <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, gap: 2, alignItems: 'center' }}>
              <Link to="/" style={{ textDecoration: "none" }}>
                <Button sx={{ my: 2, color: "#fff", fontWeight: 500, fontSize: 16, px: 2, borderRadius: 2, textTransform: 'none', transition: 'background 0.2s', border: '2px solid #646cff', boxShadow: '0 2px 8px 0 rgba(100,108,255,0.10)', '&:hover': { background: '#535bf2', color: '#fff', borderColor: '#535bf2' } }}>
                  Upload File
                </Button>
              </Link>
              <Link to="/files" style={{ textDecoration: "none" }}>
                <Button sx={{ my: 2, color: "#fff", fontWeight: 500, fontSize: 16, px: 2, borderRadius: 2, textTransform: 'none', transition: 'background 0.2s', '&:hover': { background: '#232b47', color: '#646cff' } }}>
                  Files List
                </Button>
              </Link>
              <Link to="/calculate" style={{ textDecoration: "none" }}>
                <Button sx={{ my: 2, color: "#fff", fontWeight: 500, fontSize: 16, px: 2, borderRadius: 2, textTransform: 'none', transition: 'background 0.2s', '&:hover': { background: '#232b47', color: '#646cff' } }}>
                  Calculate
                </Button>
              </Link>
              <Link to="/feedback-files" style={{ textDecoration: "none" }}>
                <Button sx={{ my: 2, color: "#fff", fontWeight: 500, fontSize: 16, px: 2, borderRadius: 2, textTransform: 'none', transition: 'background 0.2s', '&:hover': { background: '#232b47', color: '#646cff' } }}>
                  Feedback Files
                </Button>
              </Link>
            </Box>

          </Toolbar>
        </Container>
      </AppBar>
    </div>
  );
};

export default Navbar;
