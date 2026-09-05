// Minimal ESLint flat config for Sonora's zero-dependency, no-build vanilla
// JS (ES modules). Only catches syntax errors / obvious mistakes — no
// opinionated style rules.
export default [
  {
    files: ["www/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        indexedDB: "readonly",
        URL: "readonly",
        Blob: "readonly",
        Audio: "readonly",
        MediaMetadata: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        DataView: "readonly",
        history: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        location: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "off",
    },
  },
];
