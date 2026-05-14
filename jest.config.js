module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', 'src/app/app.spec.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,
      tsconfig: {
        rootDir: '.',
        strict: false,
        skipLibCheck: true,
        esModuleInterop: true,
        target: 'ES2022',
        module: 'CommonJS',
        moduleResolution: 'node',
        types: ['jest', 'node'],
      },
    }],
  },
  moduleNameMapper: {
    '@angular/core$': '<rootDir>/src/__mocks__/@angular/core.ts',
    '@angular/core/rxjs-interop': '<rootDir>/src/__mocks__/@angular/core/rxjs-interop.ts',
    '@angular/common/http': '<rootDir>/src/__mocks__/@angular/common/http.ts',
    '@angular/router': '<rootDir>/src/__mocks__/@angular/router.ts',
    '@auth0/auth0-angular': '<rootDir>/src/__mocks__/@auth0/auth0-angular.ts',
    '@env': '<rootDir>/src/environments/environment.development.ts',
  },
};
