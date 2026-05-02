module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'style', 'perf', 'build', 'ci', 'revert'],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [0],
    'footer-leading-blank': [0],
  },
};
