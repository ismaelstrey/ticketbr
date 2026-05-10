import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "prisma/generated/**",
      "tsconfig.tsbuildinfo",
      "next-env.d.ts",
      "*.config.js",
      "*.config.cjs",
      "*.config.mjs",
      "Evolution API - v2.0.postman_collection.json"
    ]
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      "prefer-const": "warn",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "no-console": [
        "warn",
        {
          "allow": ["warn", "error"]
        }
      ]
    }
  }
];

export default config;
