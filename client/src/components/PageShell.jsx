import { Box, Container } from "@mui/material";

/** Spacing below fixed `Navbar` AppBar — extra gap so content does not sit flush under the bar. */
const TOP_SPACING = 14;

/**
 * Consistent page chrome: full-height background, top padding for fixed header, centered content.
 */
export default function PageShell({ children, maxWidth = "md" }) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        pt: TOP_SPACING,
        pb: 4,
      }}
    >
      <Container maxWidth={maxWidth} sx={{ px: { xs: 2, sm: 3 } }}>
        {children}
      </Container>
    </Box>
  );
}
