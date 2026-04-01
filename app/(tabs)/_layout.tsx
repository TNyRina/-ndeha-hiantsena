import { Tabs } from "expo-router";
import { useColorScheme, View, Text, Pressable } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, ShoppingCart, Settings, Info } from "lucide-react-native";
import { useTheme } from "@/styles/theme";
import { useTranslation } from "react-i18next";





// ─── Composant Tab Bar personnalisé ────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { i18n, t } = useTranslation();
    const { colors, spacing, shadow, typography } = useTheme();

    const TABS = [
        {
            name: "index",
            label:  t("home.title"),
            Icon: Home,
        },
        {
            name: "purchase",
            label: t("purchase.title"),
            Icon: ShoppingCart,
        },
        {
            name: "settings",
            label:  t("settings.title"),
            Icon: Settings,
        },
        {
            name: "about",
            label: t("about.title"),
            Icon: Info,
        },
    ];


    return (
        <View
            style={{
            flexDirection:    "row",
            backgroundColor:  colors.tabBackground,
            borderTopWidth:   1,
            borderTopColor:   colors.tabBorder,
            paddingBottom:    spacing[7],
            paddingTop:       spacing[3],
            paddingHorizontal: spacing[2],
            shadowColor:      colors.shadow,
            ...shadow.lg,
        }}
        >
        {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const tab = TABS.find((t) => t.name === route.name);

            if (!tab) return null;
            const { label, Icon } = tab;

            const onPress = () => {
            const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
            }
            };

            return (
                <Pressable
                    key={route.key}
                    onPress={onPress}
                    accessibilityRole="button"
                    accessibilityState={isFocused ? { selected: true } : {}}
                    accessibilityLabel={options.tabBarAccessibilityLabel}
                    style={({ pressed }) => ({
                    flex:           1,
                    alignItems:     "center",
                    justifyContent: "center",
                    gap:            spacing[1],
                    opacity:        pressed ? 0.6 : 1,
                    paddingVertical: spacing[1],
                    })}
                >
                    {isFocused && (
                    <View
                        style={{
                        position:        "absolute",
                        top:             -spacing[3],
                        width:           spacing[8],
                        height:          3,
                        borderRadius:    2,
                        backgroundColor: colors.tabIndicator,
                        }}
                    />
                    )}

                    <Icon
                    size={22}
                    color={isFocused ? colors.tabActive : colors.tabInactive}
                    strokeWidth={isFocused ? 2.2 : 1.6}
                    />

                    <Text
                    style={{
                        ...typography.caption,
                        fontWeight: isFocused ? "600" : "400",
                        color:      isFocused ? colors.tabActive : colors.tabInactive,
                    }}
                    >
                    {label}
                    </Text>
                </Pressable>
                );
        })}
        </View>
    );
}

// ─── Layout principal ───────────────────────────────────────────────────────
export default function TabLayout() {
    return (
        <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
        >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="purchase" />
            <Tabs.Screen name="settings" />
            <Tabs.Screen name="about" />
        </Tabs>
    );
}
