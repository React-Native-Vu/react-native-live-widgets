package com.reactnativeliveactivity

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * 🧪 ADB Local FCM Push Simulator (Chỉ hoạt động ở bản Debug - FLAG_DEBUGGABLE).
 * Cho phép test giả lập gói tin Data Push của FCM cập nhật Live Activity Notification
 * và Home Screen Widget ngay cả khi App đang đóng / bị Force-Kill mà không cần tạo Firebase project.
 *
 * Ví dụ lệnh adb:
 * 1. Bật / Cập nhật Live Activity Notification:
 *    adb shell am broadcast -a com.reactnativeliveactivity.ACTION_SIMULATE_FCM_PUSH \
 *      --es type live_activity --es activityId fcm_demo --es title "Đơn hàng #FD-8821" \
 *      --es subtitle "Tài xế đang cách 300m" --ef progress 0.75 -p com.livewidgetsexample
 *
 * 2. Kết thúc Live Activity Notification:
 *    adb shell am broadcast -a com.reactnativeliveactivity.ACTION_SIMULATE_FCM_PUSH \
 *      --es type live_activity --es activityId fcm_demo --ez end true -p com.livewidgetsexample
 *
 * 3. Ép đồng bộ API nền cho Home Screen Widget:
 *    adb shell am broadcast -a com.reactnativeliveactivity.ACTION_SIMULATE_FCM_PUSH \
 *      --es type widget_sync --es widgetKey main -p com.livewidgetsexample
 */
class DebugFcmPushReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_SIMULATE_FCM_PUSH = "com.reactnativeliveactivity.ACTION_SIMULATE_FCM_PUSH"
        private val executor = Executors.newCachedThreadPool()
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_SIMULATE_FCM_PUSH) return

        // 🔒 Bảo mật tuyệt đối: Vô hiệu hóa hoàn toàn trên bản Release (Production)
        val isDebuggable = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        if (!isDebuggable) return

        val pushType = intent.getStringExtra("type") ?: "live_activity"
        val pendingResult = goAsync()

        executor.execute {
            try {
                when (pushType) {
                    "widget_sync" -> {
                        val widgetKey = intent.getStringExtra("widgetKey") ?: "main"
                        DynamicWidgetStateStore.performRemoteSync(context, widgetKey, forceRefresh = true)
                        DynamicHomeScreenWidgetProvider.updateAllWidgets(context)
                    }

                    "live_activity" -> {
                        val activityId = intent.getStringExtra("activityId") ?: "fcm_demo"
                        val shouldEnd = intent.getBooleanExtra("end", false)
                        if (shouldEnd) {
                            LiveActivityNotifier.end(context, activityId)
                        } else {
                            val title = intent.getStringExtra("title") ?: "FCM Push Live Update"
                            val subtitle = intent.getStringExtra("subtitle") ?: "Đã nhận gói tin đẩy từ máy chủ"
                            val progress = intent.getFloatExtra("progress", 0.65f).toDouble().coerceIn(0.0, 1.0)
                            val payloadJson = buildSimulatedLivePayload(title, subtitle, progress)
                            val activeIds = LiveActivityNotifier.getActiveIds(context)
                            if (activeIds.contains(activityId)) {
                                LiveActivityNotifier.update(context, activityId, payloadJson)
                            } else {
                                LiveActivityNotifier.start(context, activityId, payloadJson)
                            }
                        }
                    }
                }
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun buildSimulatedLivePayload(title: String, subtitle: String, progress: Double): String {
        val lockScreen = JSONObject().apply {
            put("type", "VStack")
            put("props", JSONObject().apply {
                put("padding", 14)
                put("spacing", 6)
                put("backgroundColor", "#0F172A")
            })
            put("children", JSONArray().apply {
                put(JSONObject().apply {
                    put("type", "Text")
                    put("props", JSONObject().apply {
                        put("text", title)
                        put("typography", "headline")
                        put("color", "#F8FAFC")
                    })
                })
                put(JSONObject().apply {
                    put("type", "Text")
                    put("props", JSONObject().apply {
                        put("text", subtitle)
                        put("typography", "caption1")
                        put("color", "#94A3B8")
                    })
                })
                put(JSONObject().apply {
                    put("type", "Progress")
                    put("props", JSONObject().apply {
                        put("value", progress)
                        put("tintColor", "#38BDF8")
                    })
                })
            })
        }
        return JSONObject().apply {
            put("lockScreen", lockScreen)
        }.toString()
    }
}
