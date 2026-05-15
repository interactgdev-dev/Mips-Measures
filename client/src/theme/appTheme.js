import { createTheme } from "@mui/material/styles";

/**
 * Light, clinical-tool aesthetic: restrained blues, readable type, soft surfaces.
 */
const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1e3a5f",
      light: "#2d4a73",
      dark: "#152a45",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#0f766e",
      light: "#14b8a6",
      dark: "#0d5c56",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f0f4f8",
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
    },
    divider: "rgba(15, 23, 42, 0.08)",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", system-ui, -apple-system, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h5: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      letterSpacing: "0.02em",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#cbd5e1 transparent",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 10,
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});

export default appTheme;
