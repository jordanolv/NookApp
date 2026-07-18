/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  // Le denominateur de couverture exclut le code declaratif sans logique
  // testable : cablage DI, bootstrap, decorateurs de parametres.
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.ts',
    '!src/**/*.decorator.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/instrument.ts',
  ],
  coverageDirectory: './coverage',
  // Cliquet : cale au niveau atteint, a relever a chaque lot de tests ajoute.
  // La couverture ne peut donc que progresser.
  coverageThreshold: {
    global: { statements: 48, branches: 40, functions: 44, lines: 47 },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(.+)\\.js$': '$1',
  },
};
