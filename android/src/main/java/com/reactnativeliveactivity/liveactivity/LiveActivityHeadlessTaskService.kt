package com.reactnativeliveactivity

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class LiveActivityHeadlessTaskService : HeadlessJsTaskService() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return try {
            super.onStartCommand(intent, flags, startId)
        } catch (_: Throwable) {
            START_NOT_STICKY
        }
    }

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val actionId = intent?.getStringExtra("actionId") ?: return null
        val activityId = intent.getStringExtra("activityId") ?: ""
        val extras = Arguments.createMap().apply {
            putString("actionId", actionId)
            putString("activityId", activityId)
        }
        return HeadlessJsTaskConfig(
            "LiveActivityBackgroundTask",
            extras,
            10000,
            true
        )
    }
}

