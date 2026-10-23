import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
export default defineConfig([
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
  {files:["**/*.ts", "**/*.tsx"], extends:[js.configs.recommended, ...tseslint.configs.recommended, hooks.configs.flat.recommended], languageOptions:{globals:{React:"readonly", crypto:"readonly", File:"readonly", localStorage:"readonly", setTimeout:"readonly", clearTimeout:"readonly", Blob:"readonly", URL:"readonly", document:"readonly", window:"readonly"}}},
]);
