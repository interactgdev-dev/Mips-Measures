import { Link as RouterLink, NavLink } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { alpha, useTheme } from "@mui/material/styles";

const NAV_ITEMS = [
  { to: "/", label: "Upload", end: true },
  { to: "/files", label: "Files" },
  { to: "/calculate", label: "Calculate" },
  { to: "/feedback-files", label: "Feedback" },
];

const Navbar = () => {
  const theme = useTheme();
  const barBg = alpha(theme.palette.primary.dark, 0.94);

  const navButtonSx = {
    borderRadius: 999,
    px: { xs: 2, sm: 2.25 },
    py: 0.9,
    minWidth: 0,
    fontSize: "0.875rem",
    fontWeight: 600,
    letterSpacing: "0.01em",
    color: alpha(theme.palette.common.white, 0.88),
    textTransform: "none",
    transition: "background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
    border: "1px solid transparent",
    "&:hover": {
      bgcolor: alpha(theme.palette.common.white, 0.12),
      color: theme.palette.common.white,
    },
    "&.active": {
      bgcolor: theme.palette.background.paper,
      color: theme.palette.primary.dark,
      boxShadow: `0 1px 2px ${alpha("#0f172a", 0.08)}, 0 4px 12px ${alpha("#0f172a", 0.06)}`,
      borderColor: alpha(theme.palette.common.white, 0.2),
      "&:hover": {
        bgcolor: theme.palette.background.paper,
        color: theme.palette.primary.dark,
      },
    },
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: barBg,
        backdropFilter: "saturate(160%) blur(14px)",
        WebkitBackdropFilter: "saturate(160%) blur(14px)",
        backgroundImage: "none",
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        boxShadow: `0 1px 0 ${alpha(theme.palette.common.white, 0.06)} inset, 0 8px 32px -12px ${alpha("#000", 0.35)}`,
      }}
    >
      <Container maxWidth="xl" disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
        <Toolbar
          disableGutters
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
            alignItems: "center",
            minHeight: { xs: 72, md: 84 },
            gap: { xs: 1, sm: 2 },
            py: { xs: 0.5, md: 0.75 },
          }}
        >
          <Box sx={{ justifySelf: "start", minWidth: 0 }}>
            <Typography
              variant="h6"
              noWrap
              component={RouterLink}
              to="/"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 0.5,
                px: 0.75,
                borderRadius: 2,
                color: "inherit",
                textDecoration: "none",
                flexShrink: 0,
                transition: "background-color 0.2s ease",
                "&:hover": {
                  bgcolor: alpha(theme.palette.common.white, 0.08),
                },
                "&:focus-visible": {
                  outline: `2px solid ${alpha(theme.palette.common.white, 0.5)}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Box
                component="img"
                src="/logo.png"
                alt="Home"
                sx={{
                  height: { xs: 52, md: 64 },
                  width: "auto",
                  maxHeight: { xs: 52, md: 64 },
                  display: "block",
                  objectFit: "contain",
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.25))",
                }}
              />
            </Typography>
          </Box>

          <Box
            sx={{
              justifySelf: "center",
              display: "flex",
              alignItems: "center",
              flexWrap: { xs: "nowrap", sm: "wrap" },
              justifyContent: "center",
              gap: 0.35,
              px: { xs: 0.5, sm: 0.65 },
              py: 0.5,
              borderRadius: 999,
              bgcolor: alpha(theme.palette.common.white, 0.08),
              border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
              maxWidth: { xs: "min(calc(100vw - 96px), 520px)", sm: "none" },
              overflowX: { xs: "auto", sm: "visible" },
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {NAV_ITEMS.map(({ to, label, end }) => (
              <Button key={to} component={NavLink} to={to} end={end} sx={navButtonSx}>
                {label}
              </Button>
            ))}
          </Box>

          <Box sx={{ minWidth: 0 }} aria-hidden />
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
