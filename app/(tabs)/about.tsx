import { Text, View, useColorScheme } from 'react-native';
import { useTheme } from "@/styles/theme";
import { createLayoutStyles } from "@/styles/layout";
import { createComponentStyles } from "@/styles/components";
import { useTranslation } from 'react-i18next';

export default function AboutScreen() {
    const theme = useTheme();
    const layout = createLayoutStyles(theme);
    const comp   = createComponentStyles(theme);

    const { t, i18n } = useTranslation();

    return (
        <View style={layout.screen}>
            <View style={layout.header}>
                <Text style={comp.title}>
                    { i18n.t("about.title") }
                </Text>
            </View>
        </View>
    );
}

