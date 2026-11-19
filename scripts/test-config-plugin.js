/**
 * Automated Test Suite for react-native-live-widgets Expo Config Plugin (app.plugin.js)
 */

const assert = require('assert');
const withLiveWidgets = require('../app.plugin.js');

console.log('🧪 [Test Suite] Running Expo Config Plugin Verification...');

// 1. Verify module export
assert.strictEqual(typeof withLiveWidgets, 'function', 'app.plugin.js must export a config plugin function');
console.log('   ✓ Test 1: Verified app.plugin.js exports a function.');

// 2. Mock Expo Config
const mockConfig = {
  name: 'LiveWidgetsTestApp',
  slug: 'live-widgets-test-app',
  ios: {
    bundleIdentifier: 'com.livewidgetstest.app'
  },
  android: {
    package: 'com.livewidgetstest.app'
  },
  _internal: {
    projectRoot: process.cwd()
  }
};

// 3. Test execution with custom options
try {
  const resultConfig = withLiveWidgets(mockConfig, {
    appGroup: 'group.com.livewidgetstest.app',
    enableLiveActivities: true,
    frequentUpdates: true
  });

  assert(resultConfig, 'Config plugin should return a valid config object');
  assert.strictEqual(resultConfig.name, 'LiveWidgetsTestApp', 'Config object should preserve app name');
  console.log('   ✓ Test 2: Executed withLiveWidgets with custom options successfully.');
} catch (error) {
  console.error('   ✗ Test 2 Failed:', error.message);
  process.exit(1);
}

// 4. Test default fallback options
try {
  const resultConfigDefault = withLiveWidgets(mockConfig);
  assert(resultConfigDefault, 'Config plugin should execute cleanly without explicit options');
  console.log('   ✓ Test 3: Executed withLiveWidgets with default parameters cleanly.');
} catch (error) {
  console.error('   ✗ Test 3 Failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 [Config Plugin Test] All Expo Config Plugin tests passed with 100% assertions satisfied!\n');
