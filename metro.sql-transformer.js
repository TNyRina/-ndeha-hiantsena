/**
 * metro.sql-transformer.js
 *
 * Transformer Metro personnalisé pour les fichiers .sql.
 * Au lieu de traiter le SQL comme du JS, il l'exporte
 * comme une simple chaîne de caractères — ce que
 * drizzle-orm/expo-sqlite/migrator attend.
 */
const upstreamTransformer = require("@expo/metro-config/babel-transformer");

module.exports.transform = async function sqlTransformer(props) {
  if (props.filename.endsWith(".sql")) {
    // Échappe les backticks et les backslashes pour une string JS valide
    const escaped = props.src
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");

    const code = `module.exports = \`${escaped}\`;`;

    return upstreamTransformer.transform({
      ...props,
      src: code,
    });
  }
  return upstreamTransformer.transform(props);
};