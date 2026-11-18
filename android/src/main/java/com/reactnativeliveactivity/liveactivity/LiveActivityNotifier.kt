package com.reactnativeliveactivity

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Build
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import kotlin.math.roundToInt

data class ProgressData(
    val style: String = "bar",
    val startTimestamp: Double? = null,
    val targetTimestamp: Double? = null,
    val value: Double? = null,
    val countsDown: Boolean = false,
    val tintColor: String? = null,
    val trackColor: String? = null,
    val warningSeconds: Double? = null,
    val warningTintColor: String? = null,
    val segments: Int? = null,
    val currentSegment: Int? = null,
    val showPercentage: Boolean = false
)

data class NotificationButtonData(
    val title: String,
    val actionId: String
)

data class ActivityMetadata(
    val isStale: Boolean,
    val relevanceScore: Double?,
    val staleTimestamp: Double?,
    val scheduledEndTimestamp: Double?
)

object LiveActivityNotifier {
    const val CHANNEL_ID = "live_activity_channel"
    private const val PREFS = "rn_live_widgets_prefs"
    private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"
    private const val TICK_MILLIS = 30_000L

    private fun normalizeEpochSeconds(ts: Double?): Double? {
        if (ts == null || ts <= 0.0 || ts.isNaN()) return null
        return if (ts > 10_000_000_000.0) ts / 1000.0 else ts
    }

    private fun enrichPayloadWithResolvedTimestamps(payloadJson: String): String {
        return runCatching {
            val json = JSONObject(payloadJson)
            val now = System.currentTimeMillis() / 1000.0
            if (json.has("scheduledEndTimestamp")) {
                normalizeEpochSeconds(json.optDouble("scheduledEndTimestamp", -1.0))?.let {
                    json.put("__resolvedScheduledEnd", it)
                }
            } else if (json.has("autoEndAfterSeconds")) {
                val secs = json.optDouble("autoEndAfterSeconds", -1.0)
                if (secs > 0.0 && !secs.isNaN()) {
                    json.put("__resolvedScheduledEnd", now + secs)
                }
            }
            if (json.has("staleTimestamp")) {
                normalizeEpochSeconds(json.optDouble("staleTimestamp", -1.0))?.let {
                    json.put("__resolvedStaleTimestamp", it)
                }
            }
            json.toString()
        }.getOrElse { payloadJson }
    }

    fun getActivityMetadata(context: Context, activityId: String): ActivityMetadata {
        val raw = prefs(context).getString(activityId, null)
            ?: return ActivityMetadata(false, null, null, null)
        return runCatching {
            val json = JSONObject(raw)
            val now = System.currentTimeMillis() / 1000.0
            val staleTs = if (json.has("__resolvedStaleTimestamp")) {
                json.optDouble("__resolvedStaleTimestamp", -1.0).takeIf { it > 0 }
            } else if (json.has("staleTimestamp")) {
                normalizeEpochSeconds(json.optDouble("staleTimestamp", -1.0))
            } else null
            val schedEndTs = if (json.has("__resolvedScheduledEnd")) {
                json.optDouble("__resolvedScheduledEnd", -1.0).takeIf { it > 0 }
            } else if (json.has("scheduledEndTimestamp")) {
                normalizeEpochSeconds(json.optDouble("scheduledEndTimestamp", -1.0))
            } else null
            val score = if (json.has("relevanceScore")) json.optDouble("relevanceScore") else null
            val isStale = staleTs != null && now >= staleTs
            ActivityMetadata(
                isStale = isStale,
                relevanceScore = score,
                staleTimestamp = staleTs,
                scheduledEndTimestamp = schedEndTs
            )
        }.getOrElse { ActivityMetadata(false, null, null, null) }
    }

    fun start(context: Context, activityId: String, payloadJson: String) {
        val enriched = enrichPayloadWithResolvedTimestamps(payloadJson)
        prefs(context).edit().putString(activityId, enriched).apply()
        DynamicWidgetImageCache.prefetchUrlsSync(context, enriched)
        showNotification(context, activityId, enriched, isUpdate = false)
        scheduleNextRefresh(context, activityId, enriched)
    }

    fun update(context: Context, activityId: String, payloadJson: String) {
        val enriched = enrichPayloadWithResolvedTimestamps(payloadJson)
        prefs(context).edit().putString(activityId, enriched).apply()
        DynamicWidgetImageCache.prefetchUrlsSync(context, enriched)
        showNotification(context, activityId, enriched, isUpdate = true)
        scheduleNextRefresh(context, activityId, enriched)
    }

    fun end(context: Context, activityId: String) {
        prefs(context).edit().remove(activityId).apply()
        cancelRefresh(context, activityId)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(activityId.hashCode())
    }

    fun endAll(context: Context) {
        prefs(context).edit().clear().apply()
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancelAll()
    }

    fun getActiveIds(context: Context): List<String> {
        return prefs(context).all.keys.filter {
            it != "last_action_id" && !it.startsWith("__")
        }
    }

    fun refresh(context: Context, activityId: String) {
        val json = prefs(context).getString(activityId, null) ?: return
        showNotification(context, activityId, json, isUpdate = false)
        scheduleNextRefresh(context, activityId, json)
    }

    fun refreshAllActive(context: Context) {
        val all = prefs(context).all
        for ((actId, value) in all) {
            val json = value as? String ?: continue
            showNotification(context, actId, json, isUpdate = false)
        }
    }

    private fun showNotification(
        context: Context,
        activityId: String,
        payloadJson: String,
        isUpdate: Boolean = false
    ) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureChannel(manager)

        val json = JSONObject(payloadJson)
        val now = System.currentTimeMillis() / 1000.0

        val resolvedEnd = if (json.has("__resolvedScheduledEnd")) {
            json.optDouble("__resolvedScheduledEnd", -1.0).takeIf { it > 0 }
        } else if (json.has("scheduledEndTimestamp")) {
            normalizeEpochSeconds(json.optDouble("scheduledEndTimestamp", -1.0))
        } else null

        val isExpired = resolvedEnd != null && now >= resolvedEnd
        if (isExpired) {
            val dismissal = json.optString("expiredDismissalPolicy", "immediate")
            val expiredNode = json.optJSONObject("expiredLockScreen")
            LiveActivityModule.emitStateChanged(activityId, "expired")
            if (expiredNode == null || dismissal == "immediate") {
                end(context, activityId)
                return
            }
        }

        val resolvedStale = if (json.has("__resolvedStaleTimestamp")) {
            json.optDouble("__resolvedStaleTimestamp", -1.0).takeIf { it > 0 }
        } else if (json.has("staleTimestamp")) {
            normalizeEpochSeconds(json.optDouble("staleTimestamp", -1.0))
        } else null
        val isStale = resolvedStale != null && now >= resolvedStale
        if (isStale && !isExpired) {
            LiveActivityModule.emitStateChanged(activityId, "stale")
        }

        val lockScreen = when {
            isExpired && json.has("expiredLockScreen") -> json.optJSONObject("expiredLockScreen")
            isStale && json.has("staleLockScreen") -> json.optJSONObject("staleLockScreen")
            else -> json.optJSONObject("lockScreen")
        }

        val alertObj = json.optJSONObject("alertConfig")
        val alertTitle = alertObj?.optString("title", "")?.ifEmpty { null }
            ?: json.optString("alertTitle", "")
        val alertBody = alertObj?.optString("body", "")?.ifEmpty { null }
            ?: json.optString("alertBody", "")

        val textLines = mutableListOf<String>()
        var targetTimestamp: Double? = null
        var progressData: ProgressData? = null
        var largeBitmap: Bitmap? = null
        val buttons = mutableListOf<NotificationButtonData>()

        extractData(
            context = context,
            node = lockScreen,
            onText = { t -> textLines.add(t) },
            onTimer = { ts -> targetTimestamp = ts },
            onProgress = { p -> progressData = p },
            onImage = { bmp -> if (largeBitmap == null) largeBitmap = bmp },
            onButton = { btn -> if (buttons.size < 3) buttons.add(btn) }
        )

        val titleText = when {
            alertTitle.isNotEmpty() -> alertTitle
            textLines.isNotEmpty() -> textLines.first()
            else -> "Live Activity"
        }

        val bodyText = when {
            alertBody.isNotEmpty() -> alertBody
            textLines.size > 1 -> textLines.drop(1).joinToString(" • ")
            else -> ""
        }

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val contentPendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                context,
                activityId.hashCode(),
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else null

        val shouldAlertOnUpdate = isUpdate && (alertTitle.isNotEmpty() || alertBody.isNotEmpty())

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle(titleText)
            .setContentText(bodyText)
            .setOngoing(!isExpired)
            .setOnlyAlertOnce(!shouldAlertOnUpdate)
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        if (json.has("relevanceScore")) {
            val score = json.optDouble("relevanceScore", 0.0).coerceIn(0.0, 1000.0)
            val invertedKey = (100000.0 - score * 100.0).toInt().coerceAtLeast(0)
            builder.setSortKey(String.format("%06d", invertedKey))
        }

        if (bodyText.length > 42) {
            builder.setStyle(NotificationCompat.BigTextStyle().bigText(bodyText))
        }

        if (contentPendingIntent != null) {
            builder.setContentIntent(contentPendingIntent)
        }

        if (largeBitmap != null) {
            builder.setLargeIcon(largeBitmap)
        }

        // 1. Đồng hồ Chronometer tự đếm trên phần cứng
        if (targetTimestamp != null && targetTimestamp!! > 0) {
            val targetMillis = (targetTimestamp!! * 1000).toLong()
            val timeDiff = targetMillis - System.currentTimeMillis()
            builder.setUsesChronometer(true)
            builder.setChronometerCountDown(timeDiff > 0)
            builder.setWhen(SystemClock.elapsedRealtime() + timeDiff)
        }

        // 2. Xử lý thanh tiến trình đa dạng (UI.Progress)
        if (progressData != null) {
            applyProgressToNotification(builder, progressData!!, now)
            progressData?.tintColor?.let { hex ->
                runCatching { builder.setColor(Color.parseColor(hex)) }
            }
        }

        // 3. Các nút bấm tương tác (UI.Button) ngay trên thông báo Live Update
        buttons.forEachIndexed { idx, btn ->
            val actionIntent = Intent(context, LiveActivityReceiver::class.java).apply {
                action = LiveActivityReceiver.ACTION_WIDGET_ACTION
                putExtra("actionId", btn.actionId)
                putExtra("activityId", activityId)
            }
            val pi = PendingIntent.getBroadcast(
                context,
                (activityId + "_" + btn.actionId + "_" + idx).hashCode(),
                actionIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, btn.title, pi)
        }

        // 4. Android 16+ Promoted Ongoing Notification (Live Update)
        if (Build.VERSION.SDK_INT >= 36) {
            builder.addExtras(android.os.Bundle().apply {
                putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true)
            })
        }

        manager.notify(activityId.hashCode(), builder.build())

        if (isExpired) {
            prefs(context).edit().remove(activityId).apply()
            cancelRefresh(context, activityId)
        }
    }

    private fun applyProgressToNotification(
        builder: NotificationCompat.Builder,
        progress: ProgressData,
        now: Double
    ) {
        when (progress.style) {
            "segmented" -> {
                val totalSegments = (progress.segments ?: 4).coerceAtLeast(1)
                val current = when {
                    progress.currentSegment != null -> progress.currentSegment.coerceIn(0, totalSegments)
                    progress.value != null -> (progress.value * totalSegments).roundToInt().coerceIn(0, totalSegments)
                    else -> 1
                }
                builder.setProgress(totalSegments, current, false)
            }
            "circular", "bar" -> {
                if (progress.targetTimestamp != null && progress.startTimestamp != null && progress.targetTimestamp > progress.startTimestamp) {
                    val totalSeconds = (progress.targetTimestamp - progress.startTimestamp).toInt().coerceAtLeast(1)
                    val elapsed = (now - progress.startTimestamp).toInt().coerceIn(0, totalSeconds)
                    val finalVal = if (progress.countsDown) (totalSeconds - elapsed) else elapsed
                    builder.setProgress(totalSeconds, finalVal, false)
                } else if (progress.value != null) {
                    val pct = (progress.value * 100).roundToInt().coerceIn(0, 100)
                    builder.setProgress(100, pct, false)
                }
            }
            else -> {
                builder.setProgress(100, 0, true)
            }
        }
    }

    private fun scheduleNextRefresh(context: Context, activityId: String, payloadJson: String) {
        val json = JSONObject(payloadJson)
        val phases = json.optJSONArray("phases")
        val now = System.currentTimeMillis() / 1000.0

        var nextTrigger: Double? = null

        if (phases != null) {
            for (i in 0 until phases.length()) {
                val phase = phases.getJSONObject(i)
                val trigger = phase.optDouble("triggerTimestamp", 0.0)
                if (trigger > now) {
                    if (nextTrigger == null || trigger < nextTrigger) {
                        nextTrigger = trigger
                    }
                }
            }
        }

        val resolvedStale = if (json.has("__resolvedStaleTimestamp")) {
            json.optDouble("__resolvedStaleTimestamp", -1.0).takeIf { it > 0 }
        } else normalizeEpochSeconds(json.optDouble("staleTimestamp", -1.0).takeIf { it > 0 })
        if (resolvedStale != null && resolvedStale > now) {
            if (nextTrigger == null || resolvedStale < nextTrigger) {
                nextTrigger = resolvedStale
            }
        }

        val resolvedEnd = if (json.has("__resolvedScheduledEnd")) {
            json.optDouble("__resolvedScheduledEnd", -1.0).takeIf { it > 0 }
        } else normalizeEpochSeconds(json.optDouble("scheduledEndTimestamp", -1.0).takeIf { it > 0 })
        if (resolvedEnd != null && resolvedEnd > now) {
            if (nextTrigger == null || resolvedEnd < nextTrigger) {
                nextTrigger = resolvedEnd
            }
        }

        val lockScreen = json.optJSONObject("lockScreen")
        var hasTimeProgress = false
        extractData(
            context = context,
            node = lockScreen,
            onText = {},
            onTimer = {},
            onProgress = { p ->
                if (p.targetTimestamp != null && p.targetTimestamp > now) {
                    hasTimeProgress = true
                }
            },
            onImage = {},
            onButton = {}
        )

        if (hasTimeProgress) {
            val tickTrigger = now + (TICK_MILLIS / 1000.0)
            if (nextTrigger == null || tickTrigger < nextTrigger) {
                nextTrigger = tickTrigger
            }
        }

        if (nextTrigger != null) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, LiveActivityReceiver::class.java).apply {
                action = LiveActivityReceiver.ACTION_REFRESH
                putExtra("activityId", activityId)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                activityId.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val triggerMillis = (nextTrigger * 1000).toLong()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
            }
        }
    }

    private fun cancelRefresh(context: Context, activityId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, LiveActivityReceiver::class.java).apply {
            action = LiveActivityReceiver.ACTION_REFRESH
            putExtra("activityId", activityId)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            activityId.hashCode(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
        }
    }

    private fun extractData(
        context: Context,
        node: JSONObject?,
        onText: (String) -> Unit,
        onTimer: (Double) -> Unit,
        onProgress: (ProgressData) -> Unit,
        onImage: (Bitmap) -> Unit,
        onButton: (NotificationButtonData) -> Unit
    ) {
        if (node == null) return
        val type = node.optString("type")
        val props = node.optJSONObject("props")

        when {
            type == "Text" && props != null -> {
                val text = props.optString("text")
                if (text.isNotEmpty()) onText(text)
            }
            type == "Timer" && props != null -> {
                val ts = props.optDouble("targetTimestamp", 0.0)
                if (ts > 0) onTimer(ts)
            }
            type == "Progress" && props != null -> {
                val startTs = props.optDouble("startTimestamp", -1.0).takeIf { it > 0 }
                val targetTs = props.optDouble("targetTimestamp", -1.0).takeIf { it > 0 }
                val valDouble = props.optDouble("value", -1.0).takeIf { it >= 0 }
                val style = props.optString("style", "bar")
                val countsDown = props.optBoolean("countsDown", false)
                val segments = props.optInt("segments", -1).takeIf { it > 0 }
                val currentSeg = props.optInt("currentSegment", -1).takeIf { it > 0 }
                val tint = props.optString("tintColor", "").takeIf { it.isNotEmpty() }
                val track = props.optString("trackColor", "").takeIf { it.isNotEmpty() }
                val warnSecs = props.optDouble("warningSeconds", -1.0).takeIf { it > 0 }
                val warnTint = props.optString("warningTintColor", "").takeIf { it.isNotEmpty() }
                val showPct = props.optBoolean("showPercentage", false)

                onProgress(
                    ProgressData(
                        style = style,
                        startTimestamp = startTs,
                        targetTimestamp = targetTs,
                        value = valDouble,
                        countsDown = countsDown,
                        tintColor = tint,
                        trackColor = track,
                        warningSeconds = warnSecs,
                        warningTintColor = warnTint,
                        segments = segments,
                        currentSegment = currentSeg,
                        showPercentage = showPct
                    )
                )
            }
            type == "Image" && props != null -> {
                DynamicWidgetImageCache.resolveNodeBitmap(context, props)?.let { onImage(it) }
            }
            type == "Button" && props != null -> {
                val rawTitle = props.optString("title", "Action")
                val actionId = props.optString("actionId", "")
                if (actionId.isNotEmpty()) {
                    val isToggled = if (actionId.startsWith("toggle:")) {
                        DynamicWidgetStateStore.isToggled(context, actionId.removePrefix("toggle:"))
                    } else false
                    val displayTitle = if (isToggled) {
                        props.optString("checkedTitle", rawTitle).ifEmpty { rawTitle }
                    } else rawTitle
                    onButton(NotificationButtonData(title = displayTitle, actionId = actionId))
                }
            }
        }

        val children = node.optJSONArray("children")
        if (children != null) {
            for (i in 0 until children.length()) {
                extractData(context, children.optJSONObject(i), onText, onTimer, onProgress, onImage, onButton)
            }
        }
    }

    private fun ensureChannel(manager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Live Updates",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Ongoing Live Activities and status updates"
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
