module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
    'scope-enum': [
      2,
      'always',
      [
        'admin',
        'api',
        'auth',
        'ci',
        'db',
        'deps',
        'docker',
        'docs',
        'feed',
        'media',
        'payment',
        'shared',
        'ui',
        'web',
        'worker',
      ],
    ],
  },
};
