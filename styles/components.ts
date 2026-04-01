// ─── styles/components.ts ───────────────────────────────────────────────────
// Styles des composants réutilisables (cards, badges, boutons, inputs...).
// Usage : const components = createComponentStyles(theme);

import { StyleSheet } from "react-native";
import type { Theme } from "@/styles/theme";

export function createComponentStyles(t: Theme) {
  return StyleSheet.create({
    // ── Cards ──────────────────────────────────────────────────────────────
    card: {
      backgroundColor: t.colors.surface,
      borderRadius:    t.radius.lg,
      padding:         t.spacing[4],
      shadowColor:     t.colors.shadow,
      ...t.shadow.sm,
    },
    cardElevated: {
      backgroundColor: t.colors.surface,
      borderRadius:    t.radius.lg,
      padding:         t.spacing[5],
      shadowColor:     t.colors.shadow,
      ...t.shadow.md,
    },
    cardOutlined: {
      backgroundColor: t.colors.background,
      borderRadius:    t.radius.lg,
      padding:         t.spacing[4],
      borderWidth:     1,
      borderColor:     t.colors.border,
    },

    // ── Boutons ────────────────────────────────────────────────────────────
    btnPrimary: {
      backgroundColor: t.colors.primary,
      borderRadius:    t.radius.md,
      paddingVertical:   t.spacing[4],
      paddingHorizontal: t.spacing[6],
      alignItems:      "center",
      justifyContent:  "center",
    },
    btnSecondary: {
      backgroundColor: t.colors.surface,
      borderRadius:    t.radius.md,
      paddingVertical:   t.spacing[4],
      paddingHorizontal: t.spacing[6],
      alignItems:      "center",
      justifyContent:  "center",
      borderWidth:     1,
      borderColor:     t.colors.border,
    },
    btnDanger: {
      backgroundColor: t.colors.danger,
      borderRadius:    t.radius.md,
      paddingVertical:   t.spacing[4],
      paddingHorizontal: t.spacing[6],
      alignItems:      "center",
      justifyContent:  "center",
    },
    btnIcon: {
      width:           44,
      height:          44,
      borderRadius:    t.radius.md,
      backgroundColor: t.colors.surface,
      alignItems:      "center",
      justifyContent:  "center",
    },

    // ── Textes de boutons ──────────────────────────────────────────────────
    btnPrimaryText: {
      ...t.typography.label,
      color: t.colors.primaryForeground,
    },
    btnSecondaryText: {
      ...t.typography.label,
      color: t.colors.text.primary,
    },

    // ── Badges ────────────────────────────────────────────────────────────
    badge: {
      paddingVertical:   t.spacing[0] + 2,
      paddingHorizontal: t.spacing[2],
      borderRadius:      t.radius.full,
      alignSelf:         "flex-start",
    },
    badgeSuccess: {
      backgroundColor: t.colors.success + "22",
    },
    badgeWarning: {
      backgroundColor: t.colors.warning + "22",
    },
    badgeDanger: {
      backgroundColor: t.colors.danger + "22",
    },
    badgeNeutral: {
      backgroundColor: t.colors.surface,
    },
    badgeText: {
      ...t.typography.caption,
    },
    badgeSuccessText: {
      color: t.colors.success,
    },
    badgeWarningText: {
      color: t.colors.warning,
    },
    badgeDangerText: {
      color: t.colors.danger,
    },

    // ── Inputs ─────────────────────────────────────────────────────────────
    input: {
      backgroundColor:   t.colors.surface,
      borderRadius:      t.radius.md,
      paddingVertical:   t.spacing[3],
      paddingHorizontal: t.spacing[4],
      borderWidth:       1,
      borderColor:       t.colors.border,
      ...t.typography.body,
      color:             t.colors.text.primary,
    },
    inputFocused: {
      borderColor: t.colors.accent.primary,
    },

    // ── Textes courants ────────────────────────────────────────────────────
    title: {
      ...t.typography.heading1,
      color: t.colors.text.primary,
    },
    subtitle: {
      ...t.typography.subtitle,
      color: t.colors.text.primary,
    },
    body: {
      ...t.typography.body,
      color: t.colors.text.primary,
    },
    caption: {
      ...t.typography.caption,
      color: t.colors.text.secondary,
    },
    sectionTitle: {
      ...t.typography.heading3,
      color: t.colors.text.primary,
    },
    sectionLink: {
      ...t.typography.label,
      color: t.colors.accent.primary,
    },

    // ── État vide ──────────────────────────────────────────────────────────
    emptyState: {
      alignItems:     "center",
      justifyContent: "center",
      paddingVertical: t.spacing[12],
      gap:             t.spacing[3],
    },
    emptyStateText: {
      ...t.typography.body,
      color:     t.colors.text.secondary,
      textAlign: "center",
    },
  });
}
