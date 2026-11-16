package com.reactnativeliveactivity

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.random.Random

data class InteractiveWidgetState(
    var activePage: String? = null,
    var pageOrder: List<String> = emptyList(),
    var toggledItems: MutableMap<String, Boolean> = mutableMapOf(),
    var lastActionId: String? = null,
    var lastSyncTime: String? = null,
    var remoteVariables: MutableMap<String, String> = mutableMapOf(),
    var updatedAt: Long = System.currentTimeMillis()
)

object DynamicWidgetStateStore {
    const val SHARED_PREFS_NAME = "rn_live_widgets_shared"
    private const val STATE_KEY = "interactive_state"

    fun getPrefs(context: Context, customGroup: String = "") =
        context.getSharedPreferences(SHARED_PREFS_NAME, Context.MODE_PRIVATE)

    fun readSharedString(context: Context, key: String): String? {
        return getPrefs(context).getString(key, null)
    }

    fun writeSharedString(context: Context, key: String, value: String) {
        getPrefs(context).edit().putString(key, value).apply()
    }

    fun loadState(context: Context): InteractiveWidgetState {
        val raw = readSharedString(context, STATE_KEY) ?: return InteractiveWidgetState()
        return try {
            val obj = JSONObject(raw)
            val orderList = mutableListOf<String>()
            obj.optJSONArray("pageOrder")?.let { arr ->
                for (i in 0 until arr.length()) {
                    orderList.add(arr.optString(i))
                }
            }
            val toggled = mutableMapOf<String, Boolean>()
            obj.optJSONObject("toggledItems")?.let { tObj ->
                val keys = tObj.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    toggled[k] = tObj.optBoolean(k, false)
                }
            }
            val vars = mutableMapOf<String, String>()
            obj.optJSONObject("remoteVariables")?.let { vObj ->
                val keys = vObj.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    vars[k] = vObj.optString(k, "")
                }
            }
            InteractiveWidgetState(
                activePage = obj.optString("activePage", "").ifEmpty { null },
                pageOrder = orderList,
                toggledItems = toggled,
                lastActionId = obj.optString("lastActionId", "").ifEmpty { null },
                lastSyncTime = obj.optString("lastSyncTime", "").ifEmpty { null },
                remoteVariables = vars,
                updatedAt = obj.optLong("updatedAt", System.currentTimeMillis())
            )
        } catch (_: Exception) {
            InteractiveWidgetState()
        }
    }

    fun saveState(context: Context, state: InteractiveWidgetState) {
        try {
            val obj = JSONObject()
            state.activePage?.let { obj.put("activePage", it) }
            obj.put("pageOrder", JSONArray(state.pageOrder))

            val tObj = JSONObject()
            for ((k, v) in state.toggledItems) {
                tObj.put(k, v)
            }
            obj.put("toggledItems", tObj)

            state.lastActionId?.let { obj.put("lastActionId", it) }
            state.lastSyncTime?.let { obj.put("lastSyncTime", it) }

            val vObj = JSONObject()
            for ((k, v) in state.remoteVariables) {
                vObj.put(k, v)
            }
            obj.put("remoteVariables", vObj)
            obj.put("updatedAt", state.updatedAt)

            writeSharedString(context, STATE_KEY, obj.toString())
        } catch (_: Exception) {
        }
    }

    fun initializeFromLayoutJson(context: Context, layoutJson: String) {
        try {
            val dto = JSONObject(layoutJson)
            val state = loadState(context)
            val initial = dto.optString("initialPage", "")
            if (initial.isNotEmpty()) {
                state.activePage = initial
            }
            val orderArr = dto.optJSONArray("pageOrder")
            if (orderArr != null && orderArr.length() > 0) {
                val list = mutableListOf<String>()
                for (i in 0 until orderArr.length()) {
                    list.add(orderArr.optString(i))
                }
                state.pageOrder = list
            } else {
                val pagesObj = dto.optJSONObject("pages")
                if (pagesObj != null) {
                    val keys = mutableListOf<String>()
                    val iter = pagesObj.keys()
                    while (iter.hasNext()) keys.add(iter.next())
                    state.pageOrder = keys.sorted()
                }
            }
            saveState(context, state)
        } catch (_: Exception) {
        }
    }

    fun handleAction(context: Context, actionId: String) {
        val state = loadState(context)
        state.lastActionId = actionId
        state.updatedAt = System.currentTimeMillis()

        when {
            actionId.startsWith("page:") -> {
                val target = actionId.removePrefix("page:")
                val order = state.pageOrder
                if (target == "next" && order.isNotEmpty()) {
                    val current = state.activePage ?: order.first()
                    val idx = order.indexOf(current)
                    state.activePage = if (idx >= 0) order[(idx + 1) % order.size] else order.first()
                } else if (target == "prev" && order.isNotEmpty()) {
                    val current = state.activePage ?: order.first()
                    val idx = order.indexOf(current)
                    state.activePage = if (idx >= 0) order[(idx - 1 + order.size) % order.size] else order.first()
                } else {
                    state.activePage = target
                }
            }
            actionId.startsWith("toggle:") -> {
                val key = actionId.removePrefix("toggle:")
                val current = state.toggledItems[key] ?: false
                state.toggledItems[key] = !current
            }
            actionId == "action_counter_inc" || actionId.startsWith("counter:inc") -> {
                val current = (readSharedString(context, "widget_counter_value")?.toIntOrNull() ?: 10) + 1
                writeSharedString(context, "widget_counter_value", current.toString())
                state.remoteVariables["counter"] = current.toString()
            }
            actionId == "action_counter_dec" || actionId.startsWith("counter:dec") -> {
                val current = (readSharedString(context, "widget_counter_value")?.toIntOrNull() ?: 10) - 1
                writeSharedString(context, "widget_counter_value", current.toString())
                state.remoteVariables["counter"] = current.toString()
            }
            actionId == "action_counter_reset" || actionId.startsWith("counter:reset") -> {
                writeSharedString(context, "widget_counter_value", "0")
                state.remoteVariables["counter"] = "0"
            }
        }

        saveState(context, state)
    }

    fun isToggled(context: Context, key: String): Boolean {
        return loadState(context).toggledItems[key] ?: false
    }

    fun resolveLayoutJsonWithVariables(context: Context, widgetKey: String): String? {
        var raw = readSharedString(context, "widget_layout_$widgetKey") ?: return null
        val state = loadState(context)
        val syncTime = state.lastSyncTime
            ?: SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        raw = raw.replace("{{_lastSyncTime}}", syncTime)

        val counterVal = readSharedString(context, "widget_counter_value")
        if (counterVal != null) {
            raw = raw.replace(Regex("\"text\":\"-?\\d+\",\"props\":\\{\"fontSize\":(26|32)"), "\"text\":\"$counterVal\",\"props\":{\"fontSize\":$1")
            raw = raw.replace(Regex("\"text\":\"-?\\d+ lượt\","), "\"text\":\"$counterVal lượt\",")
            raw = raw.replace("{{counter}}", counterVal)
        }

        for ((k, v) in state.remoteVariables) {
            val escaped = v.replace("\"", "\\\"")
            raw = raw.replace("{{$k}}", escaped)
        }
        return raw
    }

    /**
     * Đồng bộ API chạy ngầm trực tiếp từ BroadcastReceiver / AppWidgetProvider
     * kể cả khi ứng dụng React Native đã bị Kill hoàn toàn!
     */
    fun performRemoteSync(context: Context, widgetKey: String = "main") {
        val configJson = readSharedString(context, "widget_remote_config_$widgetKey")
        if (configJson.isNullOrEmpty()) {
            stampSyncTimeOnly(context)
            return
        }

        try {
            val config = JSONObject(configJson)
            val rawUrl = config.optString("url", "")
            if (rawUrl.isEmpty()) {
                stampSyncTimeOnly(context)
                return
            }

            val randomId = Random.nextInt(1, 21)
            val resolvedUrl = rawUrl.replace("{{_randomId}}", randomId.toString())
            val conn = (URL(resolvedUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = config.optString("method", "GET")
                connectTimeout = 8000
                readTimeout = 8000
                config.optJSONObject("headers")?.let { headers ->
                    val keys = headers.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        setRequestProperty(k, headers.optString(k))
                    }
                }
            }

            val responseText = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()

            val state = loadState(context)
            state.lastSyncTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
            state.updatedAt = System.currentTimeMillis()

            val jsonObj = JSONObject(responseText)
            if (jsonObj.has("small") || jsonObj.has("medium") || jsonObj.has("large") || jsonObj.has("pages")) {
                writeSharedString(context, "widget_layout_$widgetKey", responseText)
                DynamicWidgetImageCache.prefetchUrlsSync(context, responseText)
            }

            val keys = jsonObj.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                val v = jsonObj.opt(k)
                if (v is String || v is Number || v is Boolean) {
                    state.remoteVariables[k] = v.toString()
                }
            }
            saveState(context, state)

            val intervalMins = config.optInt("refreshIntervalMinutes", 15).coerceAtLeast(1)
            scheduleBackgroundWidgetSync(context, widgetKey, intervalMins)
        } catch (_: Exception) {
            stampSyncTimeOnly(context)
        }
    }

    fun scheduleBackgroundWidgetSync(context: Context, widgetKey: String, intervalMinutes: Int) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, LiveActivityReceiver::class.java).apply {
                action = LiveActivityReceiver.ACTION_WIDGET_SYNC
                putExtra("widgetKey", widgetKey)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                ("widget_sync_$widgetKey").hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val triggerAt = System.currentTimeMillis() + intervalMinutes * 60_000L
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
            }
        } catch (_: Exception) {
        }
    }

    private fun stampSyncTimeOnly(context: Context) {
        val state = loadState(context)
        state.lastSyncTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        state.updatedAt = System.currentTimeMillis()
        saveState(context, state)
    }
}

