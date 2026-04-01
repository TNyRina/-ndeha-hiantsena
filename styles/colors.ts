// ─── constants/colors.ts ────────────────────────────────────────────────────
// Source unique de vérité pour toutes les couleurs de l'application.

export const Colors = {
  light: {
    // Arrière-plans
    background: "#FFFFFF",
    backgroundMuted: "#F7F7FA",
    surface: "#F0F0F5",

    // Texte
    text: {
      primary: "#1A1A2E",
      secondary: "#6B6B85",
      muted: "#C0C0D0",
    },

    // Bordures
    border: "#F0F0F0",
    borderStrong: "#D8D8E8",

    // Accent / marque
    primary: "#1A1A2E",
    primaryForeground: "#FFFFFF",

    accent: {
      primary: "#5A4FD4",
      light: "#7C6AF7",
    },
    accentForeground: "#FFFFFF",

    // États
    success: "#2ECC71",
    warning: "#F39C12",
    danger: "#E74C3C",

    // Inputs / cards (ajoutés pour cohérence)
    card: "#FFFFFF",
    cardBorder: "#E5E5EF",
    input: "#F7F7FA",
    inputBorder: "#D8D8E8",

    // Tab bar
    tab: {
      background: "#FFFFFF",
      border: "#F0F0F0",
      active: "#1A1A2E",
      inactive: "#A0A0B0",
      indicator: "#1A1A2E",
    },

    shadow: "#000000",
  },

  dark: {
    // Arrière-plans
    background: "#0F0F1A",
    backgroundMuted: "#13131F",
    surface: "#1E1E2E",

    // Texte
    text: {
      primary: "#E8E8F0",
      secondary: "#8888AA",
      muted: "#3A3A5A",
    },

    // Bordures
    border: "#1E1E2E",
    borderStrong: "#2E2E4E",

    // Accent / marque
    primary: "#E8E8F0",
    primaryForeground: "#0F0F1A",

    accent: {
      primary: "#7C6AF7",
      light: "#9B8CFF",
    },
    accentForeground: "#FFFFFF",

    // États
    success: "#27AE60",
    warning: "#E67E22",
    danger: "#C0392B",

    // Inputs / cards
    card: "#1A1A2B",
    cardBorder: "#2A2A4A",
    input: "#13131F",
    inputBorder: "#2E2E4E",

    // Tab bar
    tab: {
      background: "#13131F",
      border: "#1E1E2E",
      active: "#E8E8F0",
      inactive: "#4A4A6A",
      indicator: "#7C6AF7",
    },

    shadow: "#000000",
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ColorToken = keyof typeof Colors.light;
