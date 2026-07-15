/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  clearMocks: true,
  moduleFileExtensions: ["js", "ts"],
  testEnvironment: "node",
  // `@actions/github@9` exposes some entry points (e.g. `./lib/utils`) only
  // under the ESM `import` condition, so enable it for Jest's resolver.
  testEnvironmentOptions: {
    customExportConditions: ["node", "import"],
  },
  testMatch: ["**/*.test.ts"],
  testRunner: "jest-circus/runner",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    // enabling the `import` condition makes `dedent` (a CJS dep of jest-circus)
    // resolve to its `.mjs`; pin it to its CommonJS build.
    "^dedent$": "<rootDir>/node_modules/dedent/dist/dedent.js",
    // same for eventemitter3 (a CJS dep of @slack/web-api).
    "^eventemitter3$": "<rootDir>/node_modules/eventemitter3/index.js",
    // allow NodeNext-style `./foo.js` specifiers to resolve to `./foo.ts`
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, diagnostics: { ignoreCodes: [151002] } }],
  },
  verbose: true,
};
