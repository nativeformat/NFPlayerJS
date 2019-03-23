module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/demo'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageReporters: ['json', 'text', 'lcov', 'cobertura']
  // Someday :D
  // "coverageThreshold": {
  //   "global": {
  //     "branches": 60,
  //     "functions": 60,
  //     "lines": 60,
  //     "statements": 60
  //   }
  // }
};
