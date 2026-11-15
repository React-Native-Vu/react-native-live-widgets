#!/usr/bin/env node

/**
 * Release & Versioning script for react-native-live-widgets
 *
 * Usage:
 *   node scripts/release.js patch        # 1.0.0 -> 1.0.1
 *   node scripts/release.js minor        # 1.0.0 -> 1.1.0
 *   node scripts/release.js major        # 1.0.0 -> 2.0.0
 *   node scripts/release.js 1.2.0        # Set explicit version 1.2.0
 *   node scripts/release.js patch --tag  # Also create git commit & tag vX.Y.Z locally
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

function bumpSemver(current, releaseType) {
  if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(releaseType)) {
    return releaseType;
  }
  const parts = current.split('-')[0].split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid current version in package.json: ${current}`);
  }
  let [major, minor, patch] = parts;
  switch (releaseType) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
      patch += 1;
      break;
    default:
      throw new Error(`Unknown release type "${releaseType}". Use patch | minor | major | <X.Y.Z>`);
  }
  return `${major}.${minor}.${patch}`;
}

function updateChangelog(newVersion) {
  const today = new Date().toISOString().slice(0, 10);
  const header = `## [${newVersion}] - ${today}\n`;
  let existing = '';
  if (fs.existsSync(changelogPath)) {
    existing = fs.readFileSync(changelogPath, 'utf8');
  } else {
    existing = `# Changelog\n\nAll notable changes to \`react-native-live-widgets\` will be documented in this file.\n\n`;
  }

  if (existing.includes(`## [${newVersion}]`)) {
    return;
  }

  const marker = 'All notable changes to `react-native-live-widgets` will be documented in this file.\n\n';
  if (existing.includes(marker)) {
    existing = existing.replace(
      marker,
      `${marker}${header}- Release version ${newVersion}\n\n`
    );
  } else {
    existing = `${existing}\n${header}- Release version ${newVersion}\n`;
  }
  fs.writeFileSync(changelogPath, existing, 'utf8');
}

function run() {
  const args = process.argv.slice(2);
  const releaseType = args.find((a) => !a.startsWith('--')) || 'patch';
  const shouldTag = args.includes('--tag');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldVersion = pkg.version;
  const newVersion = bumpSemver(oldVersion, releaseType);

  console.log(`🚀 Bumping version: ${oldVersion} -> ${newVersion}`);

  // 1. Update package.json
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  // 2. Update CHANGELOG.md
  updateChangelog(newVersion);

  // 3. Build TypeScript -> lib/
  execFileSync(process.execPath, [path.join(__dirname, 'build.js')], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  // 4. Optional local git commit & tag (never pushes to remote automatically)
  if (shouldTag) {
    execFileSync('git', ['add', 'package.json', 'CHANGELOG.md', 'lib'], { cwd: rootDir, stdio: 'inherit' });
    execFileSync('git', ['commit', '-m', `chore(release): v${newVersion}`], { cwd: rootDir, stdio: 'inherit' });
    execFileSync('git', ['tag', '-a', `v${newVersion}`, '-m', `Release v${newVersion}`], {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log(`🏷️  Created local commit and git tag v${newVersion} (not pushed).`);
  }

  console.log(`✅ Version ${newVersion} is ready!`);
}

run();

