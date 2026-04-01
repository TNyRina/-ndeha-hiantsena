// ─── styles/screens/home.ts ─────────────────────────────────────────────────
// Styles spécifiques à la page Accueil.
// Usage : const s = createHomeStyles(theme);

import { StyleSheet } from "react-native";
import type { Theme } from "@/styles/theme";

export function createHomeStyles(t: Theme) {
  return StyleSheet.create({
    // ── Carte budget principal ─────────────────────────────────────────────
    budgetCard: {
      backgroundColor: t.colors.primary,
      borderRadius:    t.radius.xl,
      padding:         t.spacing[6],
      marginBottom:    t.spacing[6],
      shadowColor:     t.colors.shadow,
      ...t.shadow.md,
    },
    budgetLabel: {
      ...t.typography.caption,
      color:        t.colors.primaryForeground,
      opacity:      0.7,
      marginBottom: t.spacing[1],
    },
    budgetAmount: {
      ...t.typography.heading1,
      color:        t.colors.primaryForeground,
      marginBottom: t.spacing[4],
    },
    budgetRow: {
      flexDirection: "row",
      gap:           t.spacing[3],
    },
    budgetStat: {
      flex:            1,
      backgroundColor: t.colors.primaryForeground + "15",
      borderRadius:    t.radius.md,
      padding:         t.spacing[3],
    },
    budgetStatLabel: {
      ...t.typography.caption,
      color:        t.colors.primaryForeground,
      opacity:      0.7,
      marginBottom: t.spacing[1],
    },
    budgetStatValue: {
      ...t.typography.subtitle,
      color: t.colors.primaryForeground,
    },

    // ── Barre de progression ───────────────────────────────────────────────
    progressTrack: {
      height:          6,
      backgroundColor: t.colors.border,
      borderRadius:    t.radius.full,
      overflow:        "hidden",
      marginBottom:    t.spacing[2],
    },
    progressFill: {
      height:       6,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.accent.primary,
    },

    // ── Grille de catégories (Bento) ───────────────────────────────────────
    bentoGrid: {
      flexDirection: "row",
      flexWrap:      "wrap",
      gap:           t.spacing[3],
      marginBottom:  t.spacing[6],
    },
    bentoItem: {
      width:           "47%",
      backgroundColor: t.colors.surface,
      borderRadius:    t.radius.lg,
      padding:         t.spacing[4],
      gap:             t.spacing[2],
      shadowColor:     t.colors.shadow,
      ...t.shadow.sm,
    },
    bentoItemWide: {
      width:           "100%",
      backgroundColor: t.colors.surface,
      borderRadius:    t.radius.lg,
      padding:         t.spacing[4],
      gap:             t.spacing[2],
      shadowColor:     t.colors.shadow,
      ...t.shadow.sm,
    },
    bentoIconWrap: {
      width:           36,
      height:          36,
      borderRadius:    t.radius.md,
      backgroundColor: t.colors.accent + "18",
      alignItems:      "center",
      justifyContent:  "center",
    },
    bentoLabel: {
      ...t.typography.caption,
      color: t.colors.text.secondary,
    },
    bentoValue: {
      ...t.typography.heading3,
      color: t.colors.text.primary,
    },

    // ── Transactions récentes ──────────────────────────────────────────────
    transactionItem: {
      flexDirection:   "row",
      alignItems:      "center",
      gap:             t.spacing[3],
      paddingVertical: t.spacing[3],
    },
    transactionIcon: {
      width:           42,
      height:          42,
      borderRadius:    t.radius.md,
      backgroundColor: t.colors.surface,
      alignItems:      "center",
      justifyContent:  "center",
    },
    transactionName: {
      ...t.typography.body,
      color: t.colors.text.primary,
    },
    transactionDate: {
      ...t.typography.caption,
      color: t.colors.text.secondary,
    },
    transactionAmount: {
      ...t.typography.subtitle,
      color: t.colors.text.primary,
    },
    transactionAmountNeg: {
      ...t.typography.subtitle,
      color: t.colors.danger,
    },
  });
}
