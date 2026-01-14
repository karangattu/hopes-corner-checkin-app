import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom rule overrides for migrated codebase
  {
    rules: {
      // Downgrade 'any' warnings to off for migrated code - can be fixed incrementally
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow anonymous default exports for utility files
      "import/no-anonymous-default-export": "off",
      // Use @ts-expect-error instead of @ts-ignore
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": "allow-with-description",
      }],
      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
      }],
    },
  },
]);

export default eslintConfig;
