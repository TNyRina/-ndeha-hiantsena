// ─── styles/screens/parametres.ts ───────────────────────────────────────────
// Styles spécifiques à la page Paramètres.
// Usage : const s = createParametresStyles(theme);

import { StyleSheet } from "react-native";
import type { Theme } from "@/styles/theme";

export function createParametresStyles(t: Theme) {
  return StyleSheet.create({
    // ── Profil utilisateur ─────────────────────────────────────────────────
    profileCard: {
      backgroundColor: t.colors.surface,
      borderRadius:    t.radius.xl,
      padding:         t.spacing[5],
      flexDirection:   "row",
      alignItems:      "center",
      gap:             t.spacing[4],
      marginBottom:    t.spacing[6],
      shadowColor:     t.colors.shadow,
      ...t.shadow.sm,
    },
    avatarWrap: {
      width:           56,
      height:          56,
      borderRadius:    t.radius.full,
      backgroundColor: t.colors.accent + "22",
      alignItems:      "center",
      justifyContent:  "center",
    },
    profileName: {
      ...t.typography.subtitle,
      color:        t.colors.text.primary,
      marginBottom: t.spacing[1],
    },
    profileEmail: {
      ...t.typography.bodySmall,
      color: t.colors.text.secondary,
    },

    // ── Groupes de paramètres ──────────────────────────────────────────────
    group: {
      backgroundColor: t.colors.surface,
      borderRadius:    t.radius.lg,
      overflow:        "hidden",
      marginBottom:    t.spacing[4],
      shadowColor:     t.colors.shadow,
      ...t.shadow.sm,
    },
    groupLabel: {
      ...t.typography.caption,
      color:             t.colors.text.secondary,
      marginBottom:      t.spacing[2],
      marginTop:         t.spacing[2],
      paddingHorizontal: t.spacing[1],
      textTransform:     "uppercase",
      letterSpacing:     1,
    },

    // ── Lignes de paramètre ────────────────────────────────────────────────
    row: {
      flexDirection:     "row",
      alignItems:        "center",
      paddingVertical:   t.spacing[4],
      paddingHorizontal: t.spacing[4],
      gap:               t.spacing[3],
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    rowIconWrap: {
      width:           36,
      height:          36,
      borderRadius:    t.radius.md,
      alignItems:      "center",
      justifyContent:  "center",
    },
    rowLabel: {
      ...t.typography.body,
      color: t.colors.text.primary,
      flex:  1,
    },
    rowValue: {
      ...t.typography.bodySmall,
      color: t.colors.text.secondary,
    },
    rowDanger: {
      ...t.typography.body,
      color: t.colors.danger,
      flex:  1,
    },

    // ── Toggle ─────────────────────────────────────────────────────────────
    toggle: {
      width:           48,
      height:          28,
      borderRadius:    t.radius.full,
      padding:         2,
      justifyContent:  "center",
    },
    toggleOn: {
      backgroundColor: t.colors.accent.primary,
    },
    toggleOff: {
      backgroundColor: t.colors.border,
    },
    toggleThumb: {
      width:           24,
      height:          24,
      borderRadius:    t.radius.full,
      backgroundColor: "#FFFFFF",
      shadowColor:     "#000",
      shadowOffset:    { width: 0, height: 1 },
      shadowOpacity:   0.15,
      shadowRadius:    2,
      elevation:       2,
    },

    // ── Version / footer ───────────────────────────────────────────────────
    footer: {
      alignItems:     "center",
      paddingVertical: t.spacing[8],
    },
    footerText: {
      ...t.typography.caption,
      color: t.colors.text.muted,
    },
  });
}
