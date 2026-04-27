/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "../../",
  testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/tests/integration/test-app/",
  ],
  globalSetup: "<rootDir>/tests/integration/global-setup.ts",
  globalTeardown: "<rootDir>/tests/integration/global-teardown.ts",
  testTimeout: 120_000,
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          target: "es2020",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          resolveJsonModule: true,
          skipLibCheck: true,
          strict: false,
        },
      },
    ],
  },
};
