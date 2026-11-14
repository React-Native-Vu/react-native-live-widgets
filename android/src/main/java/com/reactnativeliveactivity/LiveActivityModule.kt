package com.reactnativeliveactivity

import android.app.NotificationManager
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LiveActivityModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "LiveActivityModule"

    private val sharedPrefsName = "rn_live_widgets_shared"

    // ─── 1. LIVE ACTIVITY / LIVE UPDATE ──────────────────────────────────────

    @ReactMethod
    fun start(activityId: String, payloadJson: String, promise: Promise) {
        runCatching {
            LiveActivityNotifier.start(reactContext, activityId, payloadJson)
        }.onSuccess {
            promise.resolve(true)
        }.onFailure {
            promise.reject("E_START_FAILED", it.message, it)
        }
    }

    @ReactMethod
    fun update(activityId: String, payloadJson: String, promise: Promise) {
        runCatching {
            LiveActivityNotifier.update(reactContext, activityId, payloadJson)
        }.onSuccess {
            promise.resolve(true)
        }.onFailure {
            promise.reject("E_UPDATE_FAILED", it.message, it)
        }
    }

    @ReactMethod
    fun end(activityId: String, promise: Promise) {
        LiveActivityNotifier.end(reactContext, activityId)
        promise.resolve(true)
    }

    @ReactMethod
    fun endAll(promise: Promise) {
        LiveActivityNotifier.endAll(reactContext)
        promise.resolve(true)
    }

    @ReactMethod
    fun canPostPromoted(promise: Promise) {
        val allowed = Build.VERSION.SDK_INT >= 36 &&
            reactContext.getSystemService(NotificationManager::class.java)?.canPostPromotedNotifications() == true
        promise.resolve(allowed)
    }

    // ─── 2. HOME SCREEN WIDGETS ──────────────────────────────────────────────

    @ReactMethod
    fun reloadAllWidgets(promise: Promise) {
        runCatching {
            val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
                `package` = reactContext.packageName
            }
            reactContext.sendBroadcast(intent)
        }.onSuccess {
            promise.resolve(true)
        }.onFailure {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun reloadWidget(kind: String, promise: Promise) {
        reloadAllWidgets(promise)
    }

    // ─── 3. SHARED STORAGE (SharedPreferences) ───────────────────────────────

    @ReactMethod
    fun setSharedItem(key: String, value: String, appGroup: String, promise: Promise) {
        val prefs = getPrefs(appGroup)
        prefs.edit().putString(key, value).apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun getSharedItem(key: String, appGroup: String, promise: Promise) {
        val prefs = getPrefs(appGroup)
        val value = prefs.getString(key, null)
        promise.resolve(value)
    }

    @ReactMethod
    fun removeSharedItem(key: String, appGroup: String, promise: Promise) {
        val prefs = getPrefs(appGroup)
        prefs.edit().remove(key).apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun clearSharedItems(appGroup: String, promise: Promise) {
        val prefs = getPrefs(appGroup)
        prefs.edit().clear().apply()
        promise.resolve(true)
    }

    private fun getPrefs(name: String) =
        reactContext.getSharedPreferences(name.ifEmpty { sharedPrefsName }, Context.MODE_PRIVATE)
}
