// ─── styles/layout.ts ───────────────────────────────────────────────────────
// Styles de mise en page partagés entre toutes les pages.
// Usage : const layout = createLayoutStyles(theme);

import { StyleSheet } from "react-native";
import type { Theme } from "@/styles/theme";

export function createLayoutStyles(t: Theme) {
  return StyleSheet.create({
    // ── Conteneurs principaux ──────────────────────────────────────────────
    screen: {
      flex:            1,
      backgroundColor: t.colors.background,
    },
    screenPadded: {
      flex:            1,
      backgroundColor: t.colors.background,
      paddingHorizontal: t.spacing[5],
    },
    scrollContent: {
      paddingHorizontal: t.spacing[5],
      paddingBottom:     t.spacing[10],
    },

    // ── En-tête de page ────────────────────────────────────────────────────
    header: {
      paddingHorizontal: t.spacing[5],
      paddingTop:        t.spacing[12],
      paddingBottom:     t.spacing[6],
    },
    headerRow: {
      flexDirection:  "row",
      alignItems:     "center",
      justifyContent: "space-between",
    },

    // ── Sections ───────────────────────────────────────────────────────────
    section: {
      marginBottom: t.spacing[6],
    },
    sectionHeader: {
      flexDirection:  "row",
      alignItems:     "center",
      justifyContent: "space-between",
      marginBottom:   t.spacing[3],
    },

    // ── Séparateur ─────────────────────────────────────────────────────────
    divider: {
      height:          1,
      backgroundColor: t.colors.border,
      marginVertical:  t.spacing[4],
    },

    // ── Utilitaires flex ───────────────────────────────────────────────────
    row: {
      flexDirection: "row",
      alignItems:    "center",
    },
    rowBetween: {
      flexDirection:  "row",
      alignItems:     "center",
      justifyContent: "space-between",
    },
    center: {
      alignItems:     "center",
      justifyContent: "center",
    },
    flex1: {
      flex: 1,
    },
  });
}
