// ─── constants/typography.ts ────────────────────────────────────────────────
// Échelle typographique cohérente sur toute l'application.

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 34,
} as const;

export const FontWeight = {
  regular:   "400",
  medium:    "500",
  semibold:  "600",
  bold:      "700",
  extrabold: "800",
} as const;

export const LineHeight = {
  tight:   1.2,
  normal:  1.5,
  relaxed: 1.75,
} as const;

export const LetterSpacing = {
  tight:  -0.5,
  normal:  0,
  wide:    0.3,
  wider:   0.8,
} as const;

// ─── Styles de texte prédéfinis ─────────────────────────────────────────────
// Utilisables directement : style={Typography.heading1}
export const Typography = {
  heading1: {
    fontSize:      FontSize["3xl"],
    fontWeight:    FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  heading2: {
    fontSize:      FontSize["2xl"],
    fontWeight:    FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  heading3: {
    fontSize:      FontSize.xl,
    fontWeight:    FontWeight.semibold,
    letterSpacing: LetterSpacing.normal,
  },
  subtitle: {
    fontSize:      FontSize.lg,
    fontWeight:    FontWeight.medium,
    letterSpacing: LetterSpacing.normal,
  },
  body: {
    fontSize:      FontSize.md,
    fontWeight:    FontWeight.regular,
    letterSpacing: LetterSpacing.normal,
  },
  bodySmall: {
    fontSize:      FontSize.sm,
    fontWeight:    FontWeight.regular,
    letterSpacing: LetterSpacing.normal,
  },
  caption: {
    fontSize:      FontSize.xs,
    fontWeight:    FontWeight.medium,
    letterSpacing: LetterSpacing.wide,
  },
  label: {
    fontSize:      FontSize.sm,
    fontWeight:    FontWeight.semibold,
    letterSpacing: LetterSpacing.wide,
  },
} as const;
