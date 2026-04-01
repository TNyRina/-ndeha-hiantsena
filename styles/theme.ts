// ─── constants/theme.ts ─────────────────────────────────────────────────────
// Hook central : useTheme() retourne les tokens du thème courant.
// C'est le seul import nécessaire dans les composants.

import { useColorScheme } from "react-native";
import { Colors, type ColorScheme } from "./colors";
import { Typography, FontSize, FontWeight, LetterSpacing } from "./typography";
import { Spacing, Radius, Shadow } from "./spacing";
import { useAppTheme } from "@/styles/themeContext";

export function useTheme() {
    const { scheme } = useAppTheme();
    const colors = Colors[scheme as ColorScheme];
    const isDark = scheme === "dark";

    return {
        isDark,
        scheme,
        colors,
        typography: Typography,
        fontSize:   FontSize,
        fontWeight: FontWeight,
        letterSpacing: LetterSpacing,
        spacing:    Spacing,
        radius:     Radius,
        shadow:     Shadow,
    } as const;
}

export type Theme = ReturnType<typeof useTheme>;
