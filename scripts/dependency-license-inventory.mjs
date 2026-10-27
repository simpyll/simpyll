import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function packageNameFromLockPath(lockPath, metadata) {
  if (metadata.name) return metadata.name;

  const marker = 'node_modules/';
  const packagePath = lockPath.slice(lockPath.lastIndexOf(marker) + marker.length);
  const parts = packagePath.split('/');
  return packagePath.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

export function createLicenseInventory(lockfile, exceptions = {}) {
  if (!lockfile || typeof lockfile.packages !== 'object' || !lockfile.packages) {
    throw new TypeError('package-lock.json must contain a packages object');
  }

  const direct = new Set([
    ...Object.keys(lockfile.packages['']?.dependencies ?? {}),
    ...Object.keys(lockfile.packages['']?.devDependencies ?? {}),
    ...Object.keys(lockfile.packages['']?.optionalDependencies ?? {}),
  ]);

  const packages = Object.entries(lockfile.packages)
    .filter(([lockPath]) => lockPath.startsWith('node_modules/'))
    .map(([lockPath, metadata]) => {
      const name = packageNameFromLockPath(lockPath, metadata);
      const version = metadata.version ?? 'unknown';
      const license = typeof metadata.license === 'string' ? metadata.license.trim() : '';
      const hasLicense = license.length > 0 && !/^(?:unknown|unlicensed|noassertion)$/i.test(license);
      const exception = exceptions[`${name}@${version}`];

      return {
        name,
        version,
        lockPath,
        license: hasLicense ? license : null,
        direct: direct.has(name),
        development: metadata.dev === true,
        optional: metadata.optional === true,
        exception: exception ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));

  const missing = packages.filter((item) => !item.license && !item.exception);
  const installedVersions = new Set(packages.map((item) => `${item.name}@${item.version}`));
  const staleExceptions = Object.keys(exceptions)
    .filter((key) => !installedVersions.has(key))
    .sort();
  return { packages, missing, staleExceptions };
}

function validateExceptions(exceptions) {
  if (!exceptions || Array.isArray(exceptions) || typeof exceptions !== 'object') {
    throw new TypeError('License exceptions must be a JSON object keyed by exact package@version');
  }

  for (const [key, exception] of Object.entries(exceptions)) {
    if (!/^.+@[^@/]+$/.test(key)) {
      throw new TypeError(`Invalid license exception key: ${key}`);
    }
    if (!exception || typeof exception.reason !== 'string' || !exception.reason.trim()) {
      throw new TypeError(`License exception ${key} must include a documented reason`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.reviewedOn ?? '')) {
      throw new TypeError(`License exception ${key} must include reviewedOn as YYYY-MM-DD`);
    }
    if (typeof exception.reviewedBy !== 'string' || !exception.reviewedBy.trim()) {
      throw new TypeError(`License exception ${key} must include reviewedBy`);
    }
  }
}

function main() {
  const lockfile = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const exceptions = JSON.parse(
    fs.readFileSync(path.join(root, 'scripts/dependency-license-exceptions.json'), 'utf8'),
  );
  validateExceptions(exceptions);

  const inventory = createLicenseInventory(lockfile, exceptions);
  const asJson = process.argv.includes('--json');
  if (asJson) {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  } else {
    const counts = new Map();
    for (const item of inventory.packages) {
      const label = item.license ?? 'MISSING';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    console.log(`Dependency license inventory: ${inventory.packages.length} locked packages`);
    for (const [license, count] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`  ${license}: ${count}`);
    }
    if (inventory.missing.length) {
      console.error('\nPackages without license metadata:');
      for (const item of inventory.missing) console.error(`  ${item.name}@${item.version} (${item.lockPath})`);
    }
    if (inventory.staleExceptions.length) {
      console.error('\nStale license exceptions no longer matching the lockfile:');
      for (const key of inventory.staleExceptions) console.error(`  ${key}`);
    }
  }

  if (inventory.missing.length || inventory.staleExceptions.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
