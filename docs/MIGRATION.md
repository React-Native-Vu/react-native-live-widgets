# 🔄 Migration & Versioning Policy

This guide outlines our semantic versioning commitments and instructions for upgrading between major and minor releases of **`react-native-live-widgets`**.

---

## 🛡️ Semantic Versioning (SemVer) Commitments

We adhere strictly to [SemVer 2.0.0](https://semver.org/):

1. **Patch Releases (`1.2.x` ➔ `1.2.y`):**
   - Bug fixes, native memory optimizations, and security patches.
   - **Guaranteed 100% backward-compatible.** No API signature changes or prop deletions.
2. **Minor Releases (`1.2.x` ➔ `1.3.0`):**
   - New declarative components (e.g., `<Gauge>`, `<Chart>`), additional CLI features, or new hooks.
   - Fully backward-compatible. Any deprecated props will emit a `console.warn` in `__DEV__` mode and will remain functional for at least 2 minor release cycles.
3. **Major Releases (`1.x` ➔ `2.0.0`):**
   - Significant architectural upgrades (e.g., drops of legacy React Native versions or breaking API restructuring).
   - Accompanied by detailed step-by-step migration guides and automated codemods.

---

## 📦 Upgrading to v1.2.x from v1.1.x

### 1. Update Package Dependency
```bash
npm install react-native-live-widgets@latest
# or
yarn add react-native-live-widgets@latest
# or
pnpm add react-native-live-widgets@latest
```

### 2. iOS Native Refresh
```bash
cd ios && pod install && cd ..
```

### 3. Key Enhancements in v1.2.x
- **Pixel-Exact Touch Layer on Android:** Checkboxes and small buttons in Android widgets now use coordinate-aware hit testing, resolving previous letterboxing misalignment on unusual screen aspect ratios.
- **Dynamic Multi-Slot Layouts:** `widgets.config.ts` now supports distinct named layout presets (`main`, `counter`, `pro`, `workspace`) without element duplication.
- **Automatic String Catalog Linking:** Xcode 16 string catalogs (`Localizable.xcstrings`) are now automatically added to the Extension resources phase during codegen.

---

## ⚠️ Deprecation Policy

When an API or prop is scheduled for removal:
1. It is marked as `@deprecated` in TypeScript type definitions with instructions on the replacement.
2. It logs a one-time non-blocking `console.warn` during development runtime.
3. It remains functional until the next major release (e.g., `v2.0.0`).
