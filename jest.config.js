module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/test/mocks/react-native.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', 'plugin/**/*.js'],
};
