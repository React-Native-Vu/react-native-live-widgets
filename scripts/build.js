#!/usr/bin/env node

/**
 * Build & Package script for react-native-live-widgets
 * Compiles TypeScript (src/*.ts) -> JavaScript (lib/*.js) + Type Definitions (lib/*.d.ts)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const libDir = path.join(rootDir, 'lib');
const tsconfigPath = path.join(rootDir, 'tsconfig.json');

function findTscBinary() {
  const candidates = [
    path.join(rootDir, 'node_modules', '.bin', 'tsc'),
    path.join(rootDir, '..', 'LiveWidgetsExample', 'node_modules', '.bin', 'tsc'),
    path.join(rootDir, '..', 'node_modules', '.bin', 'tsc'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return 'tsc';
}

function cleanLib() {
  if (fs.existsSync(libDir)) {
    fs.rmSync(libDir, { recursive: true, force: true });
  }
}

function build() {
  console.log('📦 [react-native-live-widgets] Cleaning lib/ directory...');
  cleanLib();

  // Đảm bảo file sf-symbols.generated.ts và material-icons.generated.ts đã được sinh sẵn
  try {
    const { generateSFSymbolsFile } = require('./generate-sf-symbols');
    const symbolsOutput = path.join(rootDir, 'src', 'sf-symbols.generated.ts');
    if (!fs.existsSync(symbolsOutput)) {
      generateSFSymbolsFile(symbolsOutput);
    }
  } catch (err) {
    console.warn('ℹ️ [build] Không thể trích xuất SF Symbols tự động:', err.message);
  }

  try {
    const { generateMaterialIconsFile } = require('./generate-material-icons');
    const materialOutput = path.join(rootDir, 'src', 'material-icons.generated.ts');
    if (!fs.existsSync(materialOutput)) {
      generateMaterialIconsFile(materialOutput);
    }
  } catch (err) {
    console.warn('ℹ️ [build] Không thể trích xuất Material Icons tự động:', err.message);
  }

  const tscBin = findTscBinary();
  console.log(`🔨 [react-native-live-widgets] Compiling TypeScript -> JavaScript + Type Definitions (.d.ts)...`);
  execFileSync(tscBin, ['-p', tsconfigPath], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const expectedFiles = [
    'index.js',
    'index.d.ts',
    'builder.js',
    'builder.d.ts',
    'types.js',
    'types.d.ts',
    'ir.js',
    'ir.d.ts',
  ];
  for (const file of expectedFiles) {
    const filePath = path.join(libDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing expected build output: lib/${file}`);
    }
  }

  console.log('✅ [react-native-live-widgets] Build succeeded! Output generated in ./lib:');
  for (const file of fs.readdirSync(libDir)) {
    const stat = fs.statSync(path.join(libDir, file));
    console.log(`   - lib/${file} (${stat.size} bytes)`);
  }
}

try {
  build();
} catch (err) {
  console.error('❌ [react-native-live-widgets] Build failed:', err.message);
  process.exit(1);
}

