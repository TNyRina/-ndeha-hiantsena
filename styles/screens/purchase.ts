// ─── styles/screens/achats.ts ───────────────────────────────────────────────
// Styles spécifiques à la page Achats.
// Usage : const s = createAchatsStyles(theme);

import { StyleSheet } from "react-native";
import type { Theme } from "@/styles/theme";

export function createAchatsStyles(t: Theme) {
  return StyleSheet.create({
    // ── Barre de recherche + filtre ────────────────────────────────────────
    searchRow: {
      flexDirection: "row",
      gap:           t.spacing[2],
      marginBottom:  t.spacing[5],
    },
    searchInput: {
      flex:              1,
      backgroundColor:   t.colors.surface,
      borderRadius:      t.radius.md,
      paddingVertical:   t.spacing[3],
      paddingHorizontal: t.spacing[4],
      flexDirection:     "row",
      alignItems:        "center",
      gap:               t.spacing[2],
    },
    searchText: {
      ...t.typography.body,
      color: t.colors.text.secondary,
      flex:  1,
    },
    filterBtn: {
      width:           46,
      height:          46,
      borderRadius:    t.radius.md,
      backgroundColor: t.colors.surface,
      alignItems:      "center",
      justifyContent:  "center",
    },

    // ── Chips de filtres catégories ────────────────────────────────────────
    chipsRow: {
      flexDirection: "row",
      gap:           t.spacing[2],
      marginBottom:  t.spacing[5],
    },
    chip: {
      paddingVertical:   t.spacing[2],
      paddingHorizontal: t.spacing[3],
      borderRadius:      t.radius.full,
      backgroundColor:   t.colors.surface,
      borderWidth:       1,
      borderColor:       t.colors.border,
    },
    chipActive: {
      backgroundColor: t.colors.primary,
      borderColor:     t.colors.primary,
    },
    chipText: {
      ...t.typography.caption,
      color: t.colors.text.secondary,
    },
    chipTextActive: {
      ...t.typography.caption,
      color: t.colors.primaryForeground,
    },

    // ── Item de liste d'achat ──────────────────────────────────────────────
    listItem: {
      flexDirection:   "row",
      alignItems:      "center",
      backgroundColor: t.colors.surface,
      borderRadius:    t.radius.lg,
      padding:         t.spacing[4],
      marginBottom:    t.spacing[3],
      gap:             t.spacing[3],
      shadowColor:     t.colors.shadow,
      ...t.shadow.sm,
    },
    listItemChecked: {
      opacity: 0.5,
    },
    listItemCheckbox: {
      width:           24,
      height:          24,
      borderRadius:    t.radius.sm,
      borderWidth:     2,
      borderColor:     t.colors.border,
      alignItems:      "center",
      justifyContent:  "center",
    },
    listItemCheckboxDone: {
      backgroundColor: t.colors.success,
      borderColor:     t.colors.success,
    },
    listItemName: {
      ...t.typography.body,
      color: t.colors.text,
      flex:  1,
    },
    listItemNameDone: {
      textDecorationLine: "line-through",
      color:              t.colors.text.primary,
    },
    listItemQty: {
      ...t.typography.caption,
      color: t.colors.text.secondary,
    },
    listItemPrice: {
      ...t.typography.label,
      color: t.colors.text.primary,
    },

    // ── Bouton d'ajout flottant (FAB) ──────────────────────────────────────
    fab: {
      position:        "absolute",
      bottom:          t.spacing[6],
      right:           t.spacing[5],
      width:           56,
      height:          56,
      borderRadius:    t.radius.full,
      backgroundColor: t.colors.primary,
      alignItems:      "center",
      justifyContent:  "center",
      shadowColor:     t.colors.shadow,
      ...t.shadow.md,
    },

    // ── Récapitulatif du bas ───────────────────────────────────────────────
    summaryBar: {
      backgroundColor:   t.colors.surface,
      borderTopWidth:    1,
      borderTopColor:    t.colors.border,
      paddingHorizontal: t.spacing[5],
      paddingVertical:   t.spacing[4],
      flexDirection:     "row",
      justifyContent:    "space-between",
      alignItems:        "center",
    },
    summaryLabel: {
      ...t.typography.bodySmall,
      color: t.colors.text.secondary,
    },
    summaryTotal: {
      ...t.typography.heading3,
      color: t.colors.text.primary,
    },
  });
}
