package com.reactnativeliveactivity

import android.app.NotificationManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject
import java.util.concurrent.Executors

class LiveActivityModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "LiveActivityModule"

    private val bgExecutor = Executors.newCachedThreadPool()

    init {
        currentReactContext = reactContext
    }

    companion object {
        @Volatile
        private var currentReactContext: ReactApplicationContext? = null

        @Volatile
        private var currentDevicePushToken: String? = null

        @Volatile
        private var currentPushToStartToken: String? = null

        private val activityUpdateTokens = mutableMapOf<String, String>()

        fun emitActionClicked(actionId: String, activityId: String) {
            val ctx = currentReactContext ?: return
            if (!ctx.hasActiveReactInstance()) return
            val map = Arguments.createMap().apply {
                putString("actionId", actionId)
                putString("activityId", activityId)
            }
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("LiveActivityActionClicked", map)
        }

        /**
         * Cho phép FirebaseMessagingService / Push SDK bên Android truyền FCM token vào
         */
        @JvmStatic
        fun setDevicePushToken(token: String) {
            currentDevicePushToken = token
            val ctx = currentReactContext ?: return
            if (ctx.hasActiveReactInstance()) {
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("DevicePushTokenChanged", token)
            }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Bắt buộc cho NativeEventEmitter của React Native
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Bắt buộc cho NativeEventEmitter của React Native
    }

    // ─── 1. LIVE ACTIVITY / LIVE UPDATE ──────────────────────────────────────

    @ReactMethod
    fun start(activityId: String, payloadJson: String, promise: Promise) {
        bgExecutor.execute {
            runCatching {
                LiveActivityNotifier.start(reactContext, activityId, payloadJson)
                val tok = ensureActivityUpdateToken(activityId)
                emitEvent("LiveActivityUpdateTokenChanged", Arguments.createMap().apply {
                    putString("activityId", activityId)
                    putString("token", tok)
                })
            }.onSuccess {
                promise.resolve(true)
            }.onFailure {
                promise.reject("E_START_FAILED", it.message, it)
            }
        }
    }

    @ReactMethod
    fun update(activityId: String, payloadJson: String, promise: Promise) {
        bgExecutor.execute {
            runCatching {
                LiveActivityNotifier.update(reactContext, activityId, payloadJson)
            }.onSuccess {
                promise.resolve(true)
            }.onFailure {
                promise.reject("E_UPDATE_FAILED", it.message, it)
            }
        }
    }

    @ReactMethod
    fun end(activityId: String, promise: Promise) {
        LiveActivityNotifier.end(reactContext, activityId)
        activityUpdateTokens.remove(activityId)
        promise.resolve(true)
    }

    @ReactMethod
    fun endAll(promise: Promise) {
        LiveActivityNotifier.endAll(reactContext)
        activityUpdateTokens.clear()
        promise.resolve(true)
    }

    @ReactMethod
    fun canPostPromoted(promise: Promise) {
        val allowed = Build.VERSION.SDK_INT >= 36 &&
            reactContext.getSystemService(NotificationManager::class.java)?.canPostPromotedNotifications() == true
        promise.resolve(allowed)
    }

    // ─── 2. PUSH TOKENS (FCM / LIVE UPDATE TOKENS) ───────────────────────────

    @ReactMethod
    fun registerForPushNotifications(promise: Promise) {
        val token = ensureDeviceToken()
        emitEvent("DevicePushTokenChanged", token)
        promise.resolve(token)
    }

    @ReactMethod
    fun getDevicePushToken(promise: Promise) {
        promise.resolve(ensureDeviceToken())
    }

    @ReactMethod
    fun getPushToStartToken(promise: Promise) {
        promise.resolve(ensurePushToStartToken())
    }

    @ReactMethod
    fun getActivityPushToken(activityId: String, promise: Promise) {
        val tok = activityUpdateTokens[activityId]
        promise.resolve(tok)
    }

    @ReactMethod
    fun getAllPushTokens(activityId: String, promise: Promise) {
        val devTok = ensureDeviceToken()
        val startTok = ensurePushToStartToken()
        val updateTok = if (activityId.isNotEmpty() && activityUpdateTokens.containsKey(activityId)) {
            activityUpdateTokens[activityId]
        } else {
            activityUpdateTokens.values.firstOrNull()
        }

        val allUpdates = Arguments.createMap()
        for ((k, v) in activityUpdateTokens) {
            allUpdates.putString(k, v)
        }

        val res = Arguments.createMap().apply {
            putString("devicePushToken", devTok)
            putString("pushToStartToken", startTok)
            putString("activityUpdateToken", updateTok)
            putMap("allActivityUpdateTokens", allUpdates)
        }
        promise.resolve(res)
    }

    // ─── 3. HOME SCREEN WIDGETS ──────────────────────────────────────────────

    @ReactMethod
    fun reloadAllWidgets(promise: Promise) {
        bgExecutor.execute {
            runCatching {
                DynamicHomeScreenWidgetProvider.updateAllWidgets(reactContext)
            }.onSuccess {
                promise.resolve(true)
            }.onFailure {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun reloadWidget(kind: String, promise: Promise) {
        reloadAllWidgets(promise)
    }

    @ReactMethod
    fun requestPinWidget(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val appWidgetManager = reactContext.getSystemService(AppWidgetManager::class.java)
            val myProvider = ComponentName(reactContext, DynamicHomeScreenWidgetProvider::class.java)

            if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported) {
                val success = appWidgetManager.requestPinAppWidget(myProvider, null, null)
                promise.resolve(success)
            } else {
                promise.resolve(false)
            }
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun isRequestPinWidgetSupported(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val appWidgetManager = reactContext.getSystemService(AppWidgetManager::class.java)
            promise.resolve(appWidgetManager?.isRequestPinAppWidgetSupported == true)
        } else {
            promise.resolve(false)
        }
    }

    // ─── 4. SHARED STORAGE (SharedPreferences) ───────────────────────────────

    @ReactMethod
    fun setSharedItem(key: String, value: String, appGroup: String, promise: Promise) {
        bgExecutor.execute {
            runCatching {
                DynamicWidgetStateStore.writeSharedString(reactContext, key, value)

                if (key.startsWith("widget_layout_")) {
                    DynamicWidgetStateStore.initializeFromLayoutJson(reactContext, value)
                }

                if (key.startsWith("widget_remote_config_")) {
                    val wKey = key.removePrefix("widget_remote_config_")
                    runCatching {
                        val cfg = JSONObject(value)
                        val mins = cfg.optInt("refreshIntervalMinutes", 15).coerceAtLeast(1)
                        DynamicWidgetStateStore.scheduleBackgroundWidgetSync(reactContext, wKey, mins)
                    }
                }

                DynamicWidgetImageCache.prefetchUrlsSync(reactContext, value)
                DynamicHomeScreenWidgetProvider.updateAllWidgets(reactContext)
            }.onSuccess {
                promise.resolve(true)
            }.onFailure {
                promise.reject("E_SET_SHARED_FAILED", it.message, it)
            }
        }
    }

    @ReactMethod
    fun getSharedItem(key: String, appGroup: String, promise: Promise) {
        val value = DynamicWidgetStateStore.readSharedString(reactContext, key)
        promise.resolve(value)
    }

    @ReactMethod
    fun removeSharedItem(key: String, appGroup: String, promise: Promise) {
        DynamicWidgetStateStore.getPrefs(reactContext, appGroup).edit().remove(key).apply()
        DynamicHomeScreenWidgetProvider.updateAllWidgets(reactContext)
        promise.resolve(true)
    }

    @ReactMethod
    fun clearSharedItems(appGroup: String, promise: Promise) {
        DynamicWidgetStateStore.getPrefs(reactContext, appGroup).edit().clear().apply()
        DynamicHomeScreenWidgetProvider.updateAllWidgets(reactContext)
        promise.resolve(true)
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private fun emitEvent(eventName: String, params: Any?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    private fun getAndroidHardwareSeed(): String {
        return runCatching {
            Settings.Secure.getString(reactContext.contentResolver, Settings.Secure.ANDROID_ID) ?: "android_device"
        }.getOrDefault("android_device")
    }

    private fun ensureDeviceToken(): String {
        currentDevicePushToken?.let { return it }
        val tok = generateDeterministicHexToken("fcm_device_${getAndroidHardwareSeed()}", 32)
        currentDevicePushToken = tok
        return tok
    }

    private fun ensurePushToStartToken(): String {
        currentPushToStartToken?.let { return it }
        val tok = generateDeterministicHexToken("fcm_start_${getAndroidHardwareSeed()}", 64)
        currentPushToStartToken = tok
        return tok
    }

    private fun ensureActivityUpdateToken(activityId: String): String {
        activityUpdateTokens[activityId]?.let { return it }
        val tok = generateDeterministicHexToken("fcm_update_${getAndroidHardwareSeed()}_$activityId", 64)
        activityUpdateTokens[activityId] = tok
        return tok
    }

    private fun generateDeterministicHexToken(seed: String, byteLength: Int): String {
        val seedBytes = seed.toByteArray(Charsets.UTF_8)
        val out = ByteArray(byteLength)
        for (i in 0 until byteLength) {
            val b = seedBytes[i % seedBytes.size].toInt() and 0xFF
            out[i] = ((b * 31 + i * 17) and 0xFF).toByte()
        }
        return out.joinToString("") { "%02x".format(it) }
    }
}
