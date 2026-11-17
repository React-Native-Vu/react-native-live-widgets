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
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.pow
import kotlin.math.roundToLong
import kotlin.random.Random

data class InteractiveWidgetState(
    var activePage: String? = null,
    var pageOrder: List<String> = emptyList(),
    var toggledItems: MutableMap<String, Boolean> = mutableMapOf(),
    var lastActionId: String? = null,
    var lastSyncTime: String? = null,
    var remoteVariables: MutableMap<String, String> = mutableMapOf(),
    var updatedAt: Long = System.currentTimeMillis(),
    var etags: MutableMap<String, String> = mutableMapOf(),
    var lastModified: MutableMap<String, String> = mutableMapOf(),
    var syncStatus: String? = null,
    var lastSyncError: String? = null,
    var lastHttpStatus: Int? = null,
    var accessToken: String? = null
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

    private fun readStringMap(obj: JSONObject, key: String): MutableMap<String, String> {
        val map = mutableMapOf<String, String>()
        obj.optJSONObject(key)?.let { sub ->
            val keys = sub.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                map[k] = sub.optString(k, "")
            }
        }
        return map
    }

    private fun writeStringMap(obj: JSONObject, key: String, map: Map<String, String>) {
        val sub = JSONObject()
        for ((k, v) in map) {
            sub.put(k, v)
        }
        obj.put(key, sub)
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
            val httpStatus = if (obj.has("lastHttpStatus") && !obj.isNull("lastHttpStatus")) {
                obj.optInt("lastHttpStatus")
            } else null

            InteractiveWidgetState(
                activePage = obj.optString("activePage", "").ifEmpty { null },
                pageOrder = orderList,
                toggledItems = toggled,
                lastActionId = obj.optString("lastActionId", "").ifEmpty { null },
                lastSyncTime = obj.optString("lastSyncTime", "").ifEmpty { null },
                remoteVariables = readStringMap(obj, "remoteVariables"),
                updatedAt = obj.optLong("updatedAt", System.currentTimeMillis()),
                etags = readStringMap(obj, "etags"),
                lastModified = readStringMap(obj, "lastModified"),
                syncStatus = obj.optString("syncStatus", "").ifEmpty { null },
                lastSyncError = obj.optString("lastSyncError", "").ifEmpty { null },
                lastHttpStatus = httpStatus,
                accessToken = obj.optString("accessToken", "").ifEmpty { null }
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
            writeStringMap(obj, "remoteVariables", state.remoteVariables)
            obj.put("updatedAt", state.updatedAt)
            writeStringMap(obj, "etags", state.etags)
            writeStringMap(obj, "lastModified", state.lastModified)
            state.syncStatus?.let { obj.put("syncStatus", it) }
            state.lastSyncError?.let { obj.put("lastSyncError", it) }
            state.lastHttpStatus?.let { obj.put("lastHttpStatus", it) }
            state.accessToken?.let { obj.put("accessToken", it) }

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
            actionId == "action_demo_checkin" -> {
                val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                state.remoteVariables["demo_ts_label"] = "✓ Đã chạy TS ($time)"
            }
            actionId == "action_jsx_checkin" -> {
                val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                state.remoteVariables["jsx_status"] = "Đã điểm danh • $time"
            }
            actionId == "action_jsx_checkout" -> {
                val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                state.remoteVariables["jsx_status"] = "Đã Check-out • $time"
            }
            actionId == "action_jsx_refresh" -> {
                val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                state.remoteVariables["jsx_status"] = "Đồng bộ lúc $time"
            }
            actionId == "action_jsx_leave" -> {
                val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                state.remoteVariables["jsx_status"] = "Đã xin nghỉ phép • $time"
            }
            actionId == "action_jsx_report" -> {
                val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                state.remoteVariables["jsx_status"] = "Đã gửi báo cáo • $time"
            }
        }

        saveState(context, state)
    }

    fun isToggled(context: Context, key: String, defaultChecked: Boolean = false): Boolean {
        val state = loadState(context)
        val existing = state.toggledItems[key]
        if (existing != null) return existing
        state.toggledItems[key] = defaultChecked
        saveState(context, state)
        return defaultChecked
    }

    // ─── JSON FLATTENER, SCHEMA VALIDATOR & PIPE EVALUATOR ───────────────────

    fun flattenJson(value: Any?, prefix: String = "", out: MutableMap<String, String>) {
        if (value == null || value === JSONObject.NULL) return
        when (value) {
            is JSONObject -> {
                val keys = value.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    val nextKey = if (prefix.isEmpty()) k else "$prefix.$k"
                    flattenJson(value.opt(k), nextKey, out)
                }
            }
            is JSONArray -> {
                for (i in 0 until value.length()) {
                    val nextKey = if (prefix.isEmpty()) "$i" else "$prefix.$i"
                    flattenJson(value.opt(i), nextKey, out)
                }
            }
            else -> {
                if (prefix.isNotEmpty()) {
                    out[prefix] = value.toString()
                }
            }
        }
    }

    private fun validateAndApplySchema(
        flatVars: MutableMap<String, String>,
        schemaObj: JSONObject?
    ): Pair<Boolean, String?> {
        if (schemaObj == null) return Pair(true, null)

        schemaObj.optJSONObject("defaults")?.let { defs ->
            val keys = defs.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                val existing = flatVars[k]
                if (existing.isNullOrEmpty() && !defs.isNull(k)) {
                    flatVars[k] = defs.opt(k)?.toString() ?: ""
                }
            }
        }

        schemaObj.optJSONArray("requiredKeys")?.let { reqArr ->
            for (i in 0 until reqArr.length()) {
                val reqKey = reqArr.optString(i, "")
                if (reqKey.isNotEmpty() && flatVars[reqKey].isNullOrEmpty()) {
                    return Pair(false, "Missing required key '$reqKey'")
                }
            }
        }

        schemaObj.optJSONObject("types")?.let { typesObj ->
            val keys = typesObj.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                val valStr = flatVars[k] ?: continue
                when (typesObj.optString(k)) {
                    "number" -> {
                        if (valStr.trim().toDoubleOrNull() == null) {
                            return Pair(false, "Key '$k' expected number")
                        }
                    }
                    "boolean" -> {
                        val lower = valStr.trim().lowercase(Locale.ROOT)
                        if (lower != "true" && lower != "false" && lower != "1" && lower != "0") {
                            return Pair(false, "Key '$k' expected boolean")
                        }
                    }
                }
            }
        }

        return Pair(true, null)
    }

    private fun formatNumber(value: Double): String {
        return if (value.isFinite() && Math.rint(value) == value && kotlin.math.abs(value) <= Long.MAX_VALUE) {
            value.toLong().toString()
        } else {
            value.toString()
        }
    }

    fun evaluateTemplatePipe(rawValue: String?, pipes: List<String>): String {
        var current = rawValue ?: ""

        for (rawPipe in pipes) {
            val colonIdx = rawPipe.indexOf(':')
            val op = if (colonIdx >= 0) rawPipe.substring(0, colonIdx).trim() else rawPipe.trim()
            val arg = if (colonIdx >= 0) rawPipe.substring(colonIdx + 1) else ""

            when (op) {
                "default" -> {
                    if (current.isEmpty()) current = arg
                }
                "divide" -> {
                    val num = current.toDoubleOrNull()
                    val div = arg.toDoubleOrNull()
                    if (num != null && div != null && div != 0.0) {
                        current = formatNumber(num / div)
                    }
                }
                "multiply" -> {
                    val num = current.toDoubleOrNull()
                    val mul = arg.toDoubleOrNull()
                    if (num != null && mul != null) {
                        current = formatNumber(num * mul)
                    }
                }
                "add" -> {
                    val num = current.toDoubleOrNull()
                    val off = arg.toDoubleOrNull()
                    if (num != null && off != null) {
                        current = formatNumber(num + off)
                    }
                }
                "round" -> {
                    val num = current.toDoubleOrNull()
                    if (num != null) {
                        val decimals = (arg.toIntOrNull() ?: 0).coerceAtLeast(0)
                        current = if (decimals == 0) {
                            num.roundToLong().toString()
                        } else {
                            String.format(Locale.US, "%.${decimals}f", num)
                        }
                    }
                }
                "upper" -> current = current.uppercase(Locale.getDefault())
                "lower" -> current = current.lowercase(Locale.getDefault())
                "currency" -> {
                    val num = current.toDoubleOrNull()
                    if (num != null) {
                        val sym = arg.ifEmpty { "₫" }
                        val fmt = DecimalFormat("#,###", DecimalFormatSymbols(Locale.US))
                        current = "${fmt.format(num.roundToLong())}$sym"
                    }
                }
                "percent" -> {
                    val num = current.toDoubleOrNull()
                    if (num != null) {
                        val decimals = (arg.toIntOrNull() ?: 0).coerceAtLeast(0)
                        val numStr = if (decimals == 0) {
                            num.roundToLong().toString()
                        } else {
                            String.format(Locale.US, "%.${decimals}f", num)
                        }
                        current = "$numStr%"
                    }
                }
                "if" -> {
                    val splitIdx = arg.indexOf(':')
                    val thenVal = if (splitIdx >= 0) arg.substring(0, splitIdx) else arg
                    val elseVal = if (splitIdx >= 0) arg.substring(splitIdx + 1) else ""
                    val lower = current.trim().lowercase(Locale.ROOT)
                    val isTruthy = lower.isNotEmpty() && lower != "false" && lower != "0" && lower != "null"
                    current = if (isTruthy) thenVal else elseVal
                }
            }
        }
        return current
    }

    fun resolveTemplateString(
        raw: String,
        vars: Map<String, String>,
        escapeForJson: Boolean = false
    ): String {
        if (!raw.contains("{{")) return raw
        return Regex("\\{\\{([^}]+)\\}\\}").replace(raw) { match ->
            val expr = match.groupValues[1]
            val parts = expr.split("|")
            val pathKey = parts[0].trim()
            val pipes = parts.drop(1)
            val hasKey = vars.containsKey(pathKey)
            val hasFallback = pipes.any { p ->
                val t = p.trim()
                t.startsWith("default:") || t.startsWith("if:")
            }
            if (!hasKey && !hasFallback) {
                match.value
            } else {
                var evaluated = evaluateTemplatePipe(vars[pathKey], pipes)
                if (escapeForJson) {
                    evaluated = evaluated
                        .replace("\\", "\\\\")
                        .replace("\"", "\\\"")
                        .replace("\n", "\\n")
                        .replace("\r", "\\r")
                        .replace("\t", "\\t")
                }
                evaluated
            }
        }
    }

    fun resolveLayoutJsonWithVariables(context: Context, widgetKey: String): String? {
        val state = loadState(context)
        val syncTime = state.lastSyncTime
            ?: SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())

        val vars = state.remoteVariables.toMutableMap()
        vars["_lastSyncTime"] = syncTime
        vars["_syncStatus"] = state.syncStatus ?: vars["_syncStatus"] ?: "ok"
        vars["_syncError"] = state.lastSyncError ?: vars["_syncError"] ?: ""
        state.lastHttpStatus?.let { vars["_httpStatus"] = it.toString() }

        readSharedString(context, "widget_selected_config_$widgetKey")?.let { sel ->
            vars["_selectedConfigId"] = sel
            vars["selectedConfigId"] = sel
        }

        if (!vars.containsKey("id")) vars["id"] = "2026"
        if (!vars.containsKey("title")) vars["title"] = "Hoàn thành kế hoạch quý 4"

        var raw: String? = null
        if (state.syncStatus == "error") {
            readSharedString(context, "widget_remote_config_$widgetKey")?.let { cfgJson ->
                runCatching {
                    val cfg = JSONObject(cfgJson)
                    val errNode = cfg.optJSONObject("errorFallback")
                    if (errNode != null) {
                        raw = JSONObject().apply {
                            put("version", "2.0")
                            put("root", errNode)
                        }.toString()
                    }
                }
            }
        }

        if (raw == null) {
            raw = readSharedString(context, "widget_layout_$widgetKey") ?: return null
        }

        var working = raw!!
        val counterVal = readSharedString(context, "widget_counter_value")
        if (counterVal != null) {
            working = Regex("\"text\":\"-?\\d+\",(\"props\":\\{)?\"fontSize\":(26|32)").replace(working) { m ->
                "\"text\":\"$counterVal\",${m.groupValues[1]}\"fontSize\":${m.groupValues[2]}"
            }
            working = working.replace(Regex("\"text\":\"-?\\d+ lượt\""), "\"text\":\"$counterVal lượt\"")
            working = working.replace(Regex("Count: -?\\d+"), "Count: $counterVal")
            working = working.replace(Regex("Số đếm hiện tại: -?\\d+"), "Số đếm hiện tại: $counterVal")
            working = working.replace("{{counter}}", counterVal)
        }

        vars["demo_ts_label"]?.takeIf { it.isNotEmpty() }?.let { label ->
            val escaped = label.replace("\"", "\\\"")
            working = working.replace("\"title\":\"Chạy hàm TS\"", "\"title\":\"$escaped\"")
        }

        vars["jsx_status"]?.takeIf { it.isNotEmpty() }?.let { status ->
            val escaped = status.replace("\"", "\\\"")
            working = working.replace("\"text\":\"Đã chấm công (07:54)\"", "\"text\":\"$escaped\"")
            working = working.replace("\"text\":\"Vào ca sáng (07:54)\"", "\"text\":\"$escaped\"")
        }

        return resolveTemplateString(working, vars, escapeForJson = true)
    }

    // ─── BACKGROUND DATA ENGINE 2.0 (REST, TTL, ETag, Retry, Multi-Source, Auth) ─

    private sealed class SourceFetchResult {
        data class Updated(
            val text: String,
            val etag: String?,
            val lastModified: String?,
            val statusCode: Int
        ) : SourceFetchResult()
        data class NotModified(val statusCode: Int) : SourceFetchResult()
        data class Failed(val error: String, val statusCode: Int?) : SourceFetchResult()
    }

    private fun extractBodyString(obj: JSONObject?): String? {
        if (obj == null || !obj.has("body") || obj.isNull("body")) return null
        val b = obj.opt("body") ?: return null
        return when (b) {
            is String -> b
            else -> b.toString()
        }
    }

    private fun performAuthRefresh(authObj: JSONObject, timeoutMs: Int): String? {
        val authUrl = authObj.optString("url", "").ifEmpty { return null }
        var conn: HttpURLConnection? = null
        return try {
            conn = (URL(authUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = authObj.optString("method", "POST")
                connectTimeout = timeoutMs
                readTimeout = timeoutMs
                authObj.optJSONObject("headers")?.let { hdrs ->
                    val keys = hdrs.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        setRequestProperty(k, hdrs.optString(k))
                    }
                }
                val bodyStr = extractBodyString(authObj)
                if (bodyStr != null) {
                    if (getRequestProperty("Content-Type") == null) {
                        setRequestProperty("Content-Type", "application/json")
                    }
                    doOutput = true
                    outputStream.use { it.write(bodyStr.toByteArray(Charsets.UTF_8)) }
                }
            }
            val status = conn.responseCode
            if (status !in 200..299) return null
            val text = conn.inputStream.bufferedReader().use { it.readText() }
            val jsonObj = JSONObject(text)
            val flat = mutableMapOf<String, String>()
            flattenJson(jsonObj, "", flat)
            val tokenPath = authObj.optString("tokenPath", "accessToken")
            flat[tokenPath] ?: flat["token"] ?: flat["access_token"]
        } catch (_: Exception) {
            null
        } finally {
            conn?.disconnect()
        }
    }

    private fun fetchWithRetryAndAuth(
        cacheKey: String,
        urlString: String,
        method: String,
        headers: JSONObject?,
        bodyStr: String?,
        timeoutMs: Int,
        enableETag: Boolean,
        maxRetries: Int,
        retryDelayMs: Int,
        authObj: JSONObject?,
        state: InteractiveWidgetState
    ): SourceFetchResult {
        val randomId = Random.nextInt(1, 100)
        val resolvedUrl = urlString.replace("{{_randomId}}", randomId.toString())
        var didRefreshAuth = false
        var lastError = "Network error"
        var lastStatus: Int? = null

        var attempt = 0
        val totalAttempts = maxRetries.coerceAtLeast(0)
        while (attempt <= totalAttempts) {
            if (attempt > 0) {
                val backoffMs = (retryDelayMs.coerceAtLeast(100) * 2.0.pow((attempt - 1).toDouble()))
                    .toLong().coerceAtMost(10_000L)
                runCatching { Thread.sleep(backoffMs) }
            }

            var conn: HttpURLConnection? = null
            try {
                conn = (URL(resolvedUrl).openConnection() as HttpURLConnection).apply {
                    requestMethod = method
                    connectTimeout = timeoutMs
                    readTimeout = timeoutMs
                    headers?.let { hdrs ->
                        val keys = hdrs.keys()
                        while (keys.hasNext()) {
                            val k = keys.next()
                            setRequestProperty(k, hdrs.optString(k))
                        }
                    }

                    state.accessToken?.takeIf { it.isNotEmpty() }?.let { tok ->
                        val hName = authObj?.optString("headerName", "Authorization")?.ifEmpty { null } ?: "Authorization"
                        val hPrefix = authObj?.optString("headerPrefix", "Bearer ") ?: "Bearer "
                        setRequestProperty(hName, "$hPrefix$tok")
                    }

                    if (enableETag) {
                        state.etags[cacheKey]?.takeIf { it.isNotEmpty() }?.let {
                            setRequestProperty("If-None-Match", it)
                        }
                        state.lastModified[cacheKey]?.takeIf { it.isNotEmpty() }?.let {
                            setRequestProperty("If-Modified-Since", it)
                        }
                    }

                    if (bodyStr != null && (method == "POST" || method == "PUT")) {
                        if (getRequestProperty("Content-Type") == null) {
                            setRequestProperty("Content-Type", "application/json")
                        }
                        doOutput = true
                        outputStream.use { it.write(bodyStr.toByteArray(Charsets.UTF_8)) }
                    }
                }

                val status = conn.responseCode
                lastStatus = status

                if (status == HttpURLConnection.HTTP_NOT_MODIFIED) {
                    return SourceFetchResult.NotModified(304)
                }

                if (status == HttpURLConnection.HTTP_UNAUTHORIZED && authObj != null && !didRefreshAuth) {
                    didRefreshAuth = true
                    conn.disconnect()
                    val newToken = performAuthRefresh(authObj, timeoutMs)
                    if (newToken != null) {
                        state.accessToken = newToken
                        // Gọi lại ngay với token mới mà không tăng attempt backoff
                        continue
                    }
                    return SourceFetchResult.Failed("HTTP 401 Unauthorized", 401)
                }

                if (status in 200..299) {
                    val responseText = conn.inputStream.bufferedReader().use { it.readText() }
                    val etag = conn.getHeaderField("ETag")
                    val lastMod = conn.getHeaderField("Last-Modified")
                    return SourceFetchResult.Updated(responseText, etag, lastMod, status)
                }

                lastError = "HTTP $status"
                if (status < 500 && status != 429) {
                    return SourceFetchResult.Failed(lastError, status)
                }
            } catch (e: Exception) {
                lastError = e.message ?: "Network error"
            } finally {
                conn?.disconnect()
            }
            attempt++
        }

        return SourceFetchResult.Failed(lastError, lastStatus)
    }

    /**
     * Đồng bộ API chạy ngầm trực tiếp từ BroadcastReceiver / AppWidgetProvider
     * kể cả khi ứng dụng React Native đã bị Kill hoàn toàn!
     */
    fun performRemoteSync(context: Context, widgetKey: String = "main", forceRefresh: Boolean = false) {
        val configJson = readSharedString(context, "widget_remote_config_$widgetKey")
        val cfg = if (!configJson.isNullOrEmpty()) runCatching { JSONObject(configJson) }.getOrNull() else null
        val state = loadState(context)

        val ttlSeconds = cfg?.optInt("cacheTtlSeconds", 0) ?: 0
        if (!forceRefresh && ttlSeconds > 0 && state.lastSyncTime != null && state.syncStatus != "error") {
            val ageMs = System.currentTimeMillis() - state.updatedAt
            if (ageMs < ttlSeconds * 1000L) {
                return
            }
        }

        val timeoutMs = (cfg?.optInt("timeoutMs", 8000) ?: 8000).coerceAtLeast(1000)
        val enableETag = cfg?.optBoolean("enableETag", false) ?: false
        val maxRetries = cfg?.optInt("maxRetries", 0) ?: 0
        val retryDelayMs = cfg?.optInt("retryDelayMs", 500) ?: 500
        val defaultMethod = cfg?.optString("method", "GET")?.ifEmpty { null } ?: "GET"
        val defaultHeaders = cfg?.optJSONObject("headers")
        val authObj = cfg?.optJSONObject("authRefresh")
        val primaryUrl = cfg?.optString("url", "")?.ifEmpty { null }
            ?: if (cfg?.optJSONObject("sources") == null) "https://jsonplaceholder.typicode.com/todos/{{_randomId}}" else null

        val mergedVars = state.remoteVariables.toMutableMap()
        var anyError: String? = null
        var finalStatus: Int? = null
        var fetchedAnyData = false
        var allNotModified = true

        if (primaryUrl != null) {
            when (val res = fetchWithRetryAndAuth(
                cacheKey = "$widgetKey:main",
                urlString = primaryUrl,
                method = defaultMethod,
                headers = defaultHeaders,
                bodyStr = extractBodyString(cfg),
                timeoutMs = timeoutMs,
                enableETag = enableETag,
                maxRetries = maxRetries,
                retryDelayMs = retryDelayMs,
                authObj = authObj,
                state = state
            )) {
                is SourceFetchResult.Updated -> {
                    fetchedAnyData = true
                    allNotModified = false
                    finalStatus = res.statusCode
                    res.etag?.let { state.etags["$widgetKey:main"] = it }
                    res.lastModified?.let { state.lastModified["$widgetKey:main"] = it }
                    runCatching {
                        val jsonObj = JSONObject(res.text)
                        if (jsonObj.has("small") || jsonObj.has("medium") || jsonObj.has("large") || jsonObj.has("pages")) {
                            writeSharedString(context, "widget_layout_$widgetKey", res.text)
                            DynamicWidgetImageCache.prefetchUrlsSync(context, res.text)
                        }
                        flattenJson(jsonObj, "", mergedVars)
                    }
                }
                is SourceFetchResult.NotModified -> {
                    finalStatus = res.statusCode
                }
                is SourceFetchResult.Failed -> {
                    allNotModified = false
                    anyError = res.error
                    finalStatus = res.statusCode
                }
            }
        }

        val sourcesObj = cfg?.optJSONObject("sources")
        if (sourcesObj != null) {
            val srcKeys = sourcesObj.keys()
            while (srcKeys.hasNext()) {
                val srcKey = srcKeys.next()
                val srcCfg = sourcesObj.optJSONObject(srcKey) ?: continue
                val srcUrl = srcCfg.optString("url", "")
                if (srcUrl.isEmpty()) continue
                val res = fetchWithRetryAndAuth(
                    cacheKey = "$widgetKey:$srcKey",
                    urlString = srcUrl,
                    method = srcCfg.optString("method", "").ifEmpty { null } ?: defaultMethod,
                    headers = srcCfg.optJSONObject("headers") ?: defaultHeaders,
                    bodyStr = extractBodyString(srcCfg),
                    timeoutMs = srcCfg.optInt("timeoutMs", timeoutMs).coerceAtLeast(1000),
                    enableETag = if (srcCfg.has("enableETag")) srcCfg.optBoolean("enableETag", enableETag) else enableETag,
                    maxRetries = maxRetries,
                    retryDelayMs = retryDelayMs,
                    authObj = authObj,
                    state = state
                )
                when (res) {
                    is SourceFetchResult.Updated -> {
                        fetchedAnyData = true
                        allNotModified = false
                        if (finalStatus == null) finalStatus = res.statusCode
                        res.etag?.let { state.etags["$widgetKey:$srcKey"] = it }
                        res.lastModified?.let { state.lastModified["$widgetKey:$srcKey"] = it }
                        runCatching {
                            val jsonObj = JSONObject(res.text)
                            flattenJson(jsonObj, srcKey, mergedVars)
                        }
                    }
                    is SourceFetchResult.NotModified -> {
                        if (finalStatus == null) finalStatus = res.statusCode
                    }
                    is SourceFetchResult.Failed -> {
                        allNotModified = false
                        if (anyError == null) anyError = "$srcKey: ${res.error}"
                        if (finalStatus == null) finalStatus = res.statusCode
                    }
                }
            }
        }

        state.lastSyncTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        state.updatedAt = System.currentTimeMillis()
        state.lastHttpStatus = finalStatus

        if (anyError != null && !fetchedAnyData && !allNotModified) {
            state.syncStatus = "error"
            state.lastSyncError = anyError
            state.remoteVariables["_syncStatus"] = "error"
            state.remoteVariables["_syncError"] = anyError!!
            finalStatus?.let { state.remoteVariables["_httpStatus"] = it.toString() }
            saveState(context, state)
        } else {
            val (schemaOk, schemaErr) = validateAndApplySchema(mergedVars, cfg?.optJSONObject("schema"))
            if (!schemaOk) {
                val errMsg = schemaErr ?: "Schema validation failed"
                state.syncStatus = "error"
                state.lastSyncError = errMsg
                state.remoteVariables["_syncStatus"] = "error"
                state.remoteVariables["_syncError"] = errMsg
                finalStatus?.let { state.remoteVariables["_httpStatus"] = it.toString() }
                saveState(context, state)
            } else {
                cfg?.optJSONObject("mapping")?.let { mapObj ->
                    val keys = mapObj.keys()
                    while (keys.hasNext()) {
                        val targetKey = keys.next()
                        val expr = mapObj.optString(targetKey, "")
                        if (expr.isNotEmpty()) {
                            val token = if (expr.contains("{{")) expr else "{{$expr}}"
                            mergedVars[targetKey] = resolveTemplateString(token, mergedVars)
                        }
                    }
                }

                state.syncStatus = if (anyError != null) "partial" else "ok"
                state.lastSyncError = anyError
                mergedVars["_syncStatus"] = state.syncStatus!!
                mergedVars["_syncError"] = anyError ?: ""
                finalStatus?.let { mergedVars["_httpStatus"] = it.toString() }
                state.remoteVariables = mergedVars
                saveState(context, state)
            }
        }

        val intervalMins = try {
            if (cfg?.has("refreshIntervalMinutes") == true) {
                cfg.optInt("refreshIntervalMinutes", 15)
            } else {
                cfg?.optInt("intervalMinutes", 15) ?: 15
            }
        } catch (_: Exception) { 15 }.coerceAtLeast(1)
        scheduleBackgroundWidgetSync(context, widgetKey, intervalMins)
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
}
