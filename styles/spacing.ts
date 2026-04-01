// ─── constants/spacing.ts ───────────────────────────────────────────────────
// Système d'espacement basé sur une grille de 4px.

export const Spacing = {
  0:   0,
  1:   4,
  2:   8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const Radius = {
  none: 0,
  sm:   6,
  md:  10,
  lg:  16,
  xl:  24,
  full: 9999,
} as const;

export const Shadow = {
  // Ombres légères (surfaces, cards)
  sm: {
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     3,
  },
  // Ombres moyennes (modals, dropdowns)
  md: {
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius:  16,
    elevation:     8,
  },
  // Ombres fortes (tab bar, FAB)
  lg: {
    shadowOffset:  { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius:  20,
    elevation:     16,
  },
} as const;
