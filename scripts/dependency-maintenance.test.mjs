import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createLicenseInventory } from './dependency-license-inventory.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('lockfile inventory preserves direct, transitive, production, development and license data', () => {
  const inventory = createLicenseInventory({
    packages: {
      '': { dependencies: { app: '1.0.0' }, devDependencies: { testkit: '1.0.0' } },
      'node_modules/app': { version: '1.0.0', license: 'MIT' },
      'node_modules/testkit': { version: '1.0.0', license: 'MPL-2.0', dev: true },
      'node_modules/app/node_modules/transitive': { version: '2.0.0', license: 'Apache-2.0' },
    },
  });

  assert.equal(inventory.packages.length, 3);
  assert.deepEqual(inventory.missing, []);
  assert.deepEqual(inventory.staleExceptions, []);
  assert.deepEqual(inventory.packages.map(({ name, direct, development, license }) => ({
    name, direct, development, license,
  })), [
    { name: 'app', direct: true, development: false, license: 'MIT' },
    { name: 'testkit', direct: true, development: true, license: 'MPL-2.0' },
    { name: 'transitive', direct: false, development: false, license: 'Apache-2.0' },
  ]);
});

test('unknown license metadata fails unless an exact versioned, documented exception exists', () => {
  const lockfile = {
    packages: {
      '': {},
      'node_modules/unlicensed': { version: '3.2.1' },
    },
  };
  assert.equal(createLicenseInventory(lockfile).missing.length, 1);
  assert.equal(createLicenseInventory({ packages: {
    '': {},
    'node_modules/unknown': { version: '1.0.0', license: 'UNKNOWN' },
  } }).missing.length, 1);
  assert.equal(createLicenseInventory(lockfile, {
    'unlicensed@3.2.1': {
      reason: 'Upstream has not populated npm license metadata; source license reviewed separately.',
      reviewedBy: 'repository owner',
      reviewedOn: '2026-10-26',
    },
  }).missing.length, 0);
  assert.deepEqual(createLicenseInventory(lockfile, {
    'unlicensed@2.0.0': {
      reason: 'Incorrect versioned exception should be reported as stale.',
      reviewedBy: 'repository owner',
      reviewedOn: '2026-10-26',
    },
  }).staleExceptions, ['unlicensed@2.0.0']);
});

test('Dependabot is weekly, volume-bounded, and groups only npm minor and patch version updates', () => {
  const config = read('.github/dependabot.yml');
  assert.match(config, /package-ecosystem: npm/);
  assert.match(config, /package-ecosystem: github-actions/);
  assert.equal((config.match(/interval: weekly/g) ?? []).length, 2);
  assert.equal((config.match(/open-pull-requests-limit: 5/g) ?? []).length, 2);
  assert.match(config, /npm-production-minor-and-patch:[\s\S]*?dependency-type: production[\s\S]*?update-types:[\s\S]*?minor[\s\S]*?patch/);
  assert.match(config, /npm-development-minor-and-patch:[\s\S]*?dependency-type: development[\s\S]*?update-types:[\s\S]*?minor[\s\S]*?patch/);
  assert.doesNotMatch(config, /applies-to: security-updates/);
  assert.doesNotMatch(config, /update-types:[\s\S]*?major/);
});

test('PR validation audits all dependencies and licenses without privileged pull_request execution', () => {
  const workflow = read('.github/workflows/validate.yml');
  assert.match(workflow, /pull_request:\n\s+branches: \[main\]/);
  assert.match(workflow, /npm audit --audit-level=high/);
  assert.match(workflow, /npm run audit:licenses/);
  assert.match(workflow, /npm run test:dependency-maintenance/);
  assert.match(workflow, /RESULTS: \$\{\{ toJSON\(needs\) \}\}/);
  assert.match(workflow, /job\.result !== "success"/);
  assert.doesNotMatch(workflow, /pull_request_target:/);
  assert.doesNotMatch(workflow, /secrets\./);
  assert.match(workflow, /needs: \[build, browser, fixtures\]/);
  assert.match(workflow, /container:\n\s+image: mcr\.microsoft\.com\/playwright:v1\.64\.1-noble/);
  assert.equal((workflow.match(/uses: actions\/checkout@/g) ?? []).length, 4);
  assert.equal((workflow.match(/persist-credentials: false/g) ?? []).length, 4);
});

test('third-party workflow actions use immutable commit references', () => {
  const workflowFiles = fs.readdirSync(path.join(root, '.github/workflows'))
    .filter((file) => file.endsWith('.yml'))
    .map((file) => `.github/workflows/${file}`)
    .concat('.github/actions/browsers/action.yml');
  const refs = workflowFiles.flatMap((file) =>
    [...read(file).matchAll(/^\s*uses: ([^\s]+)@([^\s#]+)/gm)]
      .map(([, action, ref]) => ({ file, action, ref })),
  );
  const localActionRefs = refs.filter(({ action }) => action.startsWith('./'));
  const externalRefs = refs.filter(({ action }) => !action.startsWith('./'));
  assert.ok(externalRefs.length > 0);
  assert.match(read('.github/workflows/validate.yml'), /uses: \.\/\.github\/actions\/browsers/);
  assert.deepEqual(externalRefs.filter(({ ref }) => !/^[0-9a-f]{40}$/.test(ref)), []);

  const lockfile = JSON.parse(read('package-lock.json'));
  const playwrightVersion = lockfile.packages['node_modules/@playwright/test']?.version;
  assert.ok(playwrightVersion);
  assert.ok(read('.github/workflows/validate.yml').includes(`mcr.microsoft.com/playwright:v${playwrightVersion}-noble`));
});
