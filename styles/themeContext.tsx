import React, { createContext, useState, useContext, ReactNode } from "react";
import { ColorSchemeName, useColorScheme } from "react-native";

type ThemeContextType = {
    scheme: ColorSchemeName;
    toggleTheme: () => void;
    };

const ThemeContext = createContext<ThemeContextType>({
    scheme: "light",
    toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemScheme = useColorScheme();
    const [scheme, setScheme] = useState<ColorSchemeName>(systemScheme ?? "light");

    const toggleTheme = () => {
        setScheme((prev) => {
            const next = prev === "light" ? "dark" : "light";
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ scheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useAppTheme = () => useContext(ThemeContext);