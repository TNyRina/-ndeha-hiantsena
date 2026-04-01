import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/styles/theme";
import { createLayoutStyles } from "@/styles/layout";
import { createComponentStyles } from "@/styles/components";
import { useTranslation } from "react-i18next";
import { ThemeProvider, useAppTheme } from "@/styles/themeContext";

export default function SettingsScreen() {
    const theme = useTheme();
    const layout = createLayoutStyles(theme);
    const comp = createComponentStyles(theme);

    const { t, i18n } = useTranslation();

    const { toggleTheme } = useAppTheme(); 
    const [currentLang, setCurrentLang] = useState(i18n.language);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setCurrentLang(lng);
    };

    

    return (
        <ThemeProvider>
            <View style={layout.screen}>
            <View style={layout.header}>
                <Text style={comp.title}>{i18n.t("settings.title")}</Text>
            </View>

            <View style={{ padding: 20 }}>
                {/* Section Thème */}
                <Text style={[comp.title, { marginBottom: 10 }]}>{i18n.t("settings.theme")}</Text>
                <TouchableOpacity
                onPress={toggleTheme}
                style={{
                    backgroundColor: theme.colors.primary,
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 20,
                }}
                >
                <Text style={{ color: theme.colors.text, textAlign: "center" }}>
                    {theme.isDark ? "Passer en clair" : "Passer en sombre"}
                </Text>
                </TouchableOpacity>

                {/* Section Langue */}
                <Text style={[comp.title, { marginBottom: 10 }]}>Langue</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {["fr", "mg", "en"].map((lng) => (
                    <TouchableOpacity
                    key={lng}
                    onPress={() =>{changeLanguage(lng)} }
                    style={{
                        backgroundColor: currentLang === lng ? theme.colors.primary : theme.colors.border,
                        padding: 10,
                        borderRadius: 8,
                        flex: 1,
                        marginHorizontal: 5,
                    }}
                    >
                    <Text style={{ color: theme.colors.text, textAlign: "center" }}>
                        {lng.toUpperCase()}
                    </Text>
                    </TouchableOpacity>
                ))}
                </View>
            </View>
            </View>
        </ThemeProvider>
        
    );
}