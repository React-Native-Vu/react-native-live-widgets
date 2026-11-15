# Contributing to react-native-live-widgets

Thank you for your interest in contributing to **react-native-live-widgets**! As an open-source project, we welcome contributions of all kinds: bug fixes, new features, documentation enhancements, and feedback.

---

## 🛠️ Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vu-tran/react-native-live-widgets.git
   cd react-native-live-widgets
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the TypeScript package:**
   ```bash
   npm run build
   ```

4. **Run Typecheck:**
   ```bash
   npm run typecheck
   ```

---

## 🧪 Testing with the Example App

The workspace includes a bare React Native sample app:
```bash
cd LiveWidgetsExample

# For iOS:
cd ios && pod install && cd ..
npm run ios

# For Android:
npm run android
```

---

## 📝 Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring without changing functionality
- `test:` Adding or updating tests
- `chore:` Build scripts, package maintenance

---

## 🚀 Pull Request Guidelines

1. Fork the repo and create your branch from `main`:
   ```bash
   git checkout -b feature/my-cool-feature
   ```
2. Make your changes and verify that:
   - `npm run build` succeeds without errors.
   - `npm run typecheck` passes cleanly.
   - The code adheres to existing styles.
3. Commit with a clear, concise commit message.
4. Push to your fork and submit a Pull Request describing your changes.

---

## 📄 License
By contributing to `react-native-live-widgets`, you agree that your contributions will be licensed under the [MIT License](LICENSE).
