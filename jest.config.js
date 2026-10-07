const esModules = ['lodash-es', '@datorama/akita', 'nanoid'].join('|');

module.exports = {
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
    testMatch: ['<rootDir>/src/**/*.spec.ts'],
    transformIgnorePatterns: [`/node_modules/(?!(${esModules}|.*.mjs$))`],
    modulePaths: ['<rootDir>'],
};
