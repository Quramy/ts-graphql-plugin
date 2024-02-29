export default {
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        diagnostics: false,
      },
    ],
  },
  testRegex: '(src/.*\\.test)\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '\\.d\\.ts$', 'lib/.*'],
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!**/testing/**'],
  moduleFileExtensions: ['js', 'ts', 'json'],
};
