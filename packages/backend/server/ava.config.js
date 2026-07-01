const newE2E = process.env.TEST_MODE === 'e2e';
const repositoryTestsRoot = '../../../tests';
const backendTestsRoot = `${repositoryTestsRoot}/backend/server/src`;
const newE2ETests = [`${backendTestsRoot}/__tests__/e2e/**/*.spec.ts`];

const preludes = ['./src/prelude.ts'];

if (newE2E) {
  preludes.push(`${backendTestsRoot}/__tests__/e2e/prelude.ts`);
}

const backendTests = [
  `${backendTestsRoot}/**/*.spec.ts`,
  `${backendTestsRoot}/**/*.e2e.ts`,
  ...newE2ETests.map(pattern => '!' + pattern),
];

export default {
  timeout: '1m',
  extensions: {
    ts: 'module',
  },
  watchMode: {
    ignoreChanges: ['**/*.gen.*'],
  },
  files: newE2E ? newE2ETests : backendTests,
  require: preludes,
  environmentVariables: {
    NODE_ENV: 'test',
    DEPLOYMENT_TYPE: 'affine',
    MAILER_HOST: '0.0.0.0',
    MAILER_PORT: '1025',
    MAILER_USER: 'noreply@toeverything.info',
    MAILER_PASSWORD: 'affine',
    MAILER_SENDER: 'noreply@toeverything.info',
  },
};
