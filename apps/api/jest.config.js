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
    global: { statements: 73, branches: 57, functions: 70, lines: 73 },
  },
  testEnvironment: 'node',
  // Retire l'extension .js des imports relatifs style NodeNext. Le motif reste
  // ancre sur ./ ou ../ : sans cela il capturait aussi les paquets dont le nom
  // finit par .js (ipaddr.js via express) et cassait leur resolution.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
