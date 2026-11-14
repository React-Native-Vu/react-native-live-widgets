package com.reactnativeliveactivity

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class LiveActivityReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_REFRESH = "com.reactnativeliveactivity.ACTION_REFRESH"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val activityId = intent.getStringExtra("activityId") ?: return
        LiveActivityNotifier.refresh(context, activityId)
    }
}

