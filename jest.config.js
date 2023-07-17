const esModules = ['lodash-es', '@datorama/akita'].join('|');

module.exports = {
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
    globalSetup: 'jest-preset-angular/global-setup',
    testMatch: ['<rootDir>/src/**/*.spec.ts'],
    transformIgnorePatterns: [`/node_modules/(?!(${esModules}|.*.mjs$))`],
};
