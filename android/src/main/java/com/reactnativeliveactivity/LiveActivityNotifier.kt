package com.reactnativeliveactivity

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import org.json.JSONObject

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

object LiveActivityNotifier {
    const val CHANNEL_ID = "live_activity_channel"
    private const val PREFS = "rn_live_widgets_prefs"
    private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"
    private const val TICK_MILLIS = 30_000L // 30s vẽ lại tiến trình trên Android

    fun start(context: Context, activityId: String, payloadJson: String) {
        prefs(context).edit().putString(activityId, payloadJson).apply()
        showNotification(context, activityId, payloadJson)
        scheduleNextRefresh(context, activityId, payloadJson)
    }

    fun update(context: Context, activityId: String, payloadJson: String) {
        prefs(context).edit().putString(activityId, payloadJson).apply()
        showNotification(context, activityId, payloadJson)
        scheduleNextRefresh(context, activityId, payloadJson)
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

    fun refresh(context: Context, activityId: String) {
        val json = prefs(context).getString(activityId, null) ?: return
        showNotification(context, activityId, json)
        scheduleNextRefresh(context, activityId, json)
    }

    private fun showNotification(context: Context, activityId: String, payloadJson: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureChannel(manager)

        val json = JSONObject(payloadJson)
        val lockScreen = json.optJSONObject("lockScreen")
        val alertTitle = json.optString("alertTitle", "Live Activity")
        val alertBody = json.optString("alertBody", "")

        var titleText = alertTitle
        var bodyText = alertBody
        var targetTimestamp: Double? = null
        var progressData: ProgressData? = null

        extractData(lockScreen,
            onTitle = { t -> titleText = t },
            onBody = { b -> bodyText = b },
            onTimer = { ts -> targetTimestamp = ts },
            onProgress = { p -> progressData = p }
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle(titleText)
            .setContentText(bodyText)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        // 1. Đồng hồ Chronometer tự đếm trên phần cứng
        if (targetTimestamp != null && targetTimestamp!! > 0) {
            val targetMillis = (targetTimestamp!! * 1000).toLong()
            val timeDiff = targetMillis - System.currentTimeMillis()
            builder.setUsesChronometer(true)
            builder.setChronometerCountDown(timeDiff > 0)
            builder.setWhen(SystemClock.elapsedRealtime() + timeDiff)
        }

        // 2. Xử lý thanh tiến trình đa dạng (UI.Progress)
        val now = System.currentTimeMillis() / 1000.0
        if (progressData != null) {
            applyProgressToNotification(builder, progressData!!, now)
        }

        // 3. Android 16+ Promoted Ongoing Notification (Live Update)
        if (Build.VERSION.SDK_INT >= 36) {
            builder.addExtras(android.os.Bundle().apply {
                putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true)
            })
        }

        manager.notify(activityId.hashCode(), builder.build())
    }

    private fun applyProgressToNotification(
        builder: NotificationCompat.Builder,
        progress: ProgressData,
        now: Double
    ) {
        when (progress.style) {
            "segmented" -> {
                val totalSegments = progress.segments ?: 4
                val current = (progress.currentSegment ?: 1).coerceIn(0, totalSegments)
                builder.setProgress(totalSegments, current, false)
            }
            "circular", "bar" -> {
                if (progress.targetTimestamp != null && progress.startTimestamp != null && progress.targetTimestamp > progress.startTimestamp) {
                    val totalSeconds = (progress.targetTimestamp - progress.startTimestamp).toInt().coerceAtLeast(1)
                    val elapsed = (now - progress.startTimestamp).toInt().coerceIn(0, totalSeconds)
                    val finalVal = if (progress.countsDown) (totalSeconds - elapsed) else elapsed
                    builder.setProgress(totalSeconds, finalVal, false)
                } else if (progress.value != null) {
                    val pct = (progress.value * 100).toInt().coerceIn(0, 100)
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

        // 1. Kiểm tra mốc đổi pha (State Machine)
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

        // 2. Nếu có thanh tiến trình theo thời gian, hẹn lịch tick 30s để thanh chạy đều
        val lockScreen = json.optJSONObject("lockScreen")
        var hasTimeProgress = false
        extractData(lockScreen, onTitle = {}, onBody = {}, onTimer = {}, onProgress = { p ->
            if (p.targetTimestamp != null && p.targetTimestamp > now) {
                hasTimeProgress = true
            }
        })

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
        node: JSONObject?,
        onTitle: (String) -> Unit,
        onBody: (String) -> Unit,
        onTimer: (Double) -> Unit,
        onProgress: (ProgressData) -> Unit
    ) {
        if (node == null) return
        val type = node.optString("type")
        val props = node.optJSONObject("props")

        if (type == "Text" && props != null) {
            val text = props.optString("text")
            if (text.isNotEmpty()) onTitle(text)
        } else if (type == "Timer" && props != null) {
            val ts = props.optDouble("targetTimestamp", 0.0)
            if (ts > 0) onTimer(ts)
        } else if (type == "Progress" && props != null) {
            val startTs = props.optDouble("startTimestamp", -1.0).takeIf { it > 0 }
            val targetTs = props.optDouble("targetTimestamp", -1.0).takeIf { it > 0 }
            val valDouble = props.optDouble("value", -1.0).takeIf { it >= 0 }
            val style = props.optString("style", "bar")
            val countsDown = props.optBoolean("countsDown", false)
            val segments = props.optInt("segments", -1).takeIf { it > 0 }
            val currentSeg = props.optInt("currentSegment", -1).takeIf { it > 0 }
            val tint = props.optString("tintColor", null)
            val track = props.optString("trackColor", null)
            val warnSecs = props.optDouble("warningSeconds", -1.0).takeIf { it > 0 }
            val warnTint = props.optString("warningTintColor", null)
            val showPct = props.optBoolean("showPercentage", false)

            onProgress(ProgressData(
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
            ))
        }

        val children = node.optJSONArray("children")
        if (children != null) {
            for (i in 0 until children.length()) {
                extractData(children.optJSONObject(i), onTitle, onBody, onTimer, onProgress)
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
