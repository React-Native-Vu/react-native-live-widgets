package com.reactnativeliveactivity

import android.app.NotificationManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.media.MediaPlayer
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
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
        private var mediaPlayer: MediaPlayer? = null

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

        @JvmStatic
        fun emitStateChanged(activityId: String, state: String, pushToken: String? = null) {
            val ctx = currentReactContext ?: return
            if (!ctx.hasActiveReactInstance()) return
            val map = Arguments.createMap().apply {
                putString("activityId", activityId)
                putString("state", state)
                putDouble("timestamp", System.currentTimeMillis() / 1000.0)
                val tok = pushToken ?: activityUpdateTokens[activityId]
                if (tok != null) putString("pushToken", tok)
            }
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("LiveActivityStateChanged", map)
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
                emitStateChanged(activityId, "active", tok)
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
        emitStateChanged(activityId, "ended")
        activityUpdateTokens.remove(activityId)
        promise.resolve(true)
    }

    @ReactMethod
    fun endWithOptions(activityId: String, options: ReadableMap?, promise: Promise) {
        val finalPayload = if (options?.hasKey("finalPayloadJson") == true) options.getString("finalPayloadJson") else null
        val seconds = if (options?.hasKey("dismissalAfterSeconds") == true) options.getDouble("dismissalAfterSeconds").toLong() else 0L

        if (finalPayload != null) {
            LiveActivityNotifier.update(reactContext, activityId, finalPayload)
        }

        if (seconds > 0) {
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                LiveActivityNotifier.end(reactContext, activityId)
                emitStateChanged(activityId, "ended")
                activityUpdateTokens.remove(activityId)
            }, seconds * 1000)
            promise.resolve(true)
        } else {
            end(activityId, promise)
        }
    }

    @ReactMethod
    fun endAll(promise: Promise) {
        val activeIds = LiveActivityNotifier.getActiveIds(reactContext)
        LiveActivityNotifier.endAll(reactContext)
        for (id in activeIds) {
            emitStateChanged(id, "ended")
        }
        activityUpdateTokens.clear()
        promise.resolve(true)
    }

    @ReactMethod
    fun canPostPromoted(promise: Promise) {
        val allowed = Build.VERSION.SDK_INT >= 36 &&
            reactContext.getSystemService(NotificationManager::class.java)?.canPostPromotedNotifications() == true
        promise.resolve(allowed)
    }

    @ReactMethod
    fun getActiveActivities(promise: Promise) {
        val activeIds = LiveActivityNotifier.getActiveIds(reactContext)
        val array = Arguments.createArray()
        for (id in activeIds) {
            val meta = LiveActivityNotifier.getActivityMetadata(reactContext, id)
            val map = Arguments.createMap().apply {
                putString("activityId", id)
                putString("activityState", if (meta.isStale) "stale" else "active")
                putBoolean("isStale", meta.isStale)
                meta.relevanceScore?.let { putDouble("relevanceScore", it) }
                meta.staleTimestamp?.let { putDouble("staleTimestamp", it) }
                meta.scheduledEndTimestamp?.let { putDouble("scheduledEndTimestamp", it) }
                activityUpdateTokens[id]?.let { putString("pushToken", it) }
            }
            array.pushMap(map)
        }
        promise.resolve(array)
    }

    @ReactMethod
    fun areActivitiesEnabled(promise: Promise) {
        val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        val enabled = manager?.areNotificationsEnabled() ?: true
        promise.resolve(enabled)
    }

    @ReactMethod
    fun areFrequentPushesEnabled(promise: Promise) {
        promise.resolve(true)
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

                if (key.startsWith("widget_bound_data_")) {
                    val wKey = key.removePrefix("widget_bound_data_")
                    DynamicWidgetStateStore.getPrefs(reactContext, appGroup)
                        .edit()
                        .remove("widget_remote_config_$wKey")
                        .apply()
                    runCatching {
                        val state = DynamicWidgetStateStore.loadState(reactContext)
                        val jsonObj = JSONObject(value)
                        DynamicWidgetStateStore.flattenJson(jsonObj, "", state.remoteVariables)
                        val syncTime = state.remoteVariables["_lastSyncTime"]
                        if (!syncTime.isNullOrEmpty()) {
                            state.lastSyncTime = syncTime
                        }
                        val status = state.remoteVariables["_syncStatus"]?.takeIf { it.isNotEmpty() } ?: "ok"
                        state.syncStatus = status
                        state.remoteVariables["_syncStatus"] = status
                        state.lastSyncError = null
                        state.remoteVariables["_syncError"] = ""
                        state.updatedAt = System.currentTimeMillis()
                        DynamicWidgetStateStore.saveState(reactContext, state)
                    }
                }

                if (key.startsWith("widget_remote_config_")) {
                    val wKey = key.removePrefix("widget_remote_config_")
                    DynamicWidgetStateStore.getPrefs(reactContext, appGroup)
                        .edit()
                        .remove("widget_bound_data_$wKey")
                        .apply()
                    runCatching {
                        val cfg = JSONObject(value)
                        val mins = if (cfg.has("refreshIntervalMinutes")) {
                            cfg.optInt("refreshIntervalMinutes", 15)
                        } else {
                            cfg.optInt("intervalMinutes", 15)
                        }.coerceAtLeast(1)
                        DynamicWidgetStateStore.scheduleBackgroundWidgetSync(reactContext, wKey, mins)
                    }
                    DynamicWidgetStateStore.performRemoteSync(reactContext, wKey, forceRefresh = true)
                }

                if (key.startsWith("widget_control_")) {
                    DynamicQuickSettingsTileService.requestTileUpdate(reactContext)
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

    // ─── 4. AUDIO PLAYER (MUSIC PLAYBACK FOR TESTING EQUALIZER ANIMATIONS) ────

    @ReactMethod
    fun playAudio(urlString: String, metadata: ReadableMap?, promise: Promise) {
        try {
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setDataSource(urlString)
                prepareAsync()
                setOnPreparedListener { start() }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("AUDIO_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun pauseAudio(promise: Promise) {
        try {
            if (mediaPlayer?.isPlaying == true) {
                mediaPlayer?.pause()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun resumeAudio(promise: Promise) {
        try {
            mediaPlayer?.start()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun stopAudio(promise: Promise) {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun getAudioStatus(promise: Promise) {
        val map = Arguments.createMap().apply {
            val player = mediaPlayer
            if (player != null) {
                putBoolean("isPlaying", player.isPlaying)
                putDouble("currentTime", (player.currentPosition / 1000.0))
                putDouble("duration", (player.duration / 1000.0))
            } else {
                putBoolean("isPlaying", false)
                putDouble("currentTime", 0.0)
                putDouble("duration", 0.0)
            }
        }
        promise.resolve(map)
    }

    // ─── STANDALONE NATIVE MEDIASESSION (ANDROID SYSTEM MEDIA CONTROLS - GROUP E) ─

    private var nativeMediaSession: android.media.session.MediaSession? = null

    private fun ensureMediaSession(): android.media.session.MediaSession {
        nativeMediaSession?.let { return it }
        val session = android.media.session.MediaSession(reactContext, "RNLiveWidgetsMediaSession")
        session.setCallback(object : android.media.session.MediaSession.Callback() {
            override fun onPlay() {
                emitEvent("onMediaRemoteCommand", Arguments.createMap().apply { putString("type", "play") })
            }
            override fun onPause() {
                emitEvent("onMediaRemoteCommand", Arguments.createMap().apply { putString("type", "pause") })
            }
            override fun onSkipToNext() {
                emitEvent("onMediaRemoteCommand", Arguments.createMap().apply { putString("type", "next") })
            }
            override fun onSkipToPrevious() {
                emitEvent("onMediaRemoteCommand", Arguments.createMap().apply { putString("type", "previous") })
            }
            override fun onSeekTo(pos: Long) {
                emitEvent("onMediaRemoteCommand", Arguments.createMap().apply {
                    putString("type", "seek")
                    putDouble("positionSeconds", pos / 1000.0)
                })
            }
            override fun onStop() {
                emitEvent("onMediaRemoteCommand", Arguments.createMap().apply { putString("type", "stop") })
            }
        })
        session.isActive = true
        nativeMediaSession = session
        return session
    }

    @ReactMethod
    fun setMediaMetadata(metadata: ReadableMap, promise: Promise) {
        try {
            val session = ensureMediaSession()
            val builder = android.media.MediaMetadata.Builder()
            if (metadata.hasKey("title")) {
                builder.putString(android.media.MediaMetadata.METADATA_KEY_TITLE, metadata.getString("title"))
            }
            if (metadata.hasKey("artist")) {
                builder.putString(android.media.MediaMetadata.METADATA_KEY_ARTIST, metadata.getString("artist"))
            }
            if (metadata.hasKey("album")) {
                builder.putString(android.media.MediaMetadata.METADATA_KEY_ALBUM, metadata.getString("album"))
            }
            if (metadata.hasKey("durationSeconds")) {
                builder.putLong(
                    android.media.MediaMetadata.METADATA_KEY_DURATION,
                    (metadata.getDouble("durationSeconds") * 1000.0).toLong()
                )
            }
            session.setMetadata(builder.build())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun setMediaPlaybackState(playback: ReadableMap, promise: Promise) {
        try {
            val session = ensureMediaSession()
            val stateStr = if (playback.hasKey("state")) playback.getString("state") else "paused"
            val stateCode = when (stateStr) {
                "playing" -> android.media.session.PlaybackState.STATE_PLAYING
                "buffering" -> android.media.session.PlaybackState.STATE_BUFFERING
                "stopped" -> android.media.session.PlaybackState.STATE_STOPPED
                else -> android.media.session.PlaybackState.STATE_PAUSED
            }
            val posMs = if (playback.hasKey("positionSeconds")) {
                (playback.getDouble("positionSeconds") * 1000.0).toLong()
            } else 0L
            val rate = if (playback.hasKey("rate")) playback.getDouble("rate").toFloat() else if (stateStr == "playing") 1f else 0f
            val actions = android.media.session.PlaybackState.ACTION_PLAY or
                android.media.session.PlaybackState.ACTION_PAUSE or
                android.media.session.PlaybackState.ACTION_PLAY_PAUSE or
                android.media.session.PlaybackState.ACTION_SKIP_TO_NEXT or
                android.media.session.PlaybackState.ACTION_SKIP_TO_PREVIOUS or
                android.media.session.PlaybackState.ACTION_SEEK_TO or
                android.media.session.PlaybackState.ACTION_STOP
            val state = android.media.session.PlaybackState.Builder()
                .setActions(actions)
                .setState(stateCode, posMs, rate)
                .build()
            session.setPlaybackState(state)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun clearMediaSession(promise: Promise) {
        try {
            nativeMediaSession?.isActive = false
            nativeMediaSession?.release()
            nativeMediaSession = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
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
