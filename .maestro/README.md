# 🎭 End-to-End Testing with Maestro

This directory contains automated, OS-level End-to-End (E2E) UI test flows for **`react-native-live-widgets`**.

Unlike traditional UI testing frameworks (Detox, Appium) that are confined to inside the app process, **[Maestro](https://maestro.mobile.dev/)** has full operating system automation capabilities:
- Simulates Home button presses (`pressHome`).
- Inspects Lock Screen notifications and Live Activities.
- Taps widgets and Dynamic Island elements outside the app window.

---

## 🚀 Running Maestro Locally (100% Free)

### 1. Install Maestro CLI
```bash
# macOS / Linux
curl -FsSL "https://get.maestro.mobile.dev" | bash
```

### 2. Launch iOS Simulator or Android Emulator
Ensure your simulator is running with the example app installed (`com.livewidgetsexample`).

### 3. Run E2E Test Flows
```bash
# Test Live Activity flow
maestro test .maestro/live_activity_test.yaml

# Test Interactive Widget click flow
maestro test .maestro/widget_interactive_test.yaml
```

---

## 🤖 Running Maestro in CI (GitHub Actions)
Maestro CLI runs directly on GitHub Actions macOS runners without needing paid cloud services:
```yaml
- name: Run Maestro Tests
  run: |
    export PATH="$PATH:$HOME/.maestro/bin"
    maestro test .maestro/live_activity_test.yaml
```
