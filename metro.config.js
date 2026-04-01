const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// ── Fichiers .sql traités comme source texte (pour Drizzle migrations) ─────
config.resolver.assetExts = config.resolver.assetExts.filter(e => e !== "sql");
config.resolver.sourceExts = [...config.resolver.sourceExts, "sql"];
config.transformer.babelTransformerPath = path.resolve(__dirname, "metro.sql-transformer.js");

// ── Exclure les fichiers .wasm que Metro ne sait pas gérer ────────────────
config.resolver.assetExts = [...config.resolver.assetExts, "wasm"];

module.exports = config;
// Redirige expo-sqlite vers un mock vide sur la plateforme web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "expo-sqlite") {
    return { type: "empty" };
  }
  return context.resolveRequest(context, moduleName, platform);
};
