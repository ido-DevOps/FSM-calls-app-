// ESLint 8 (eslintrc) — matches eslint-config-expo 7.x, which is the version
// paired with Expo SDK 51.
module.exports = {
  root: true,
  extends: ["expo"],
  ignorePatterns: [
    "node_modules/",
    ".expo/",
    "dist/",
    "web-build/",
    "supabase/",
    "scripts/",
    "*.config.js",
  ],
  rules: {
    // Unused code is usually a leftover from a half-finished change, and this
    // project has already shipped one dead-code-shaped bug. Underscore-prefixed
    // args stay allowed for intentionally-ignored callback params.
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    // The exhaustive-deps rule earns its keep here: the auth listener and the
    // realtime subscription both depend on effect deps being correct.
    "react-hooks/exhaustive-deps": "warn",
  },
};
