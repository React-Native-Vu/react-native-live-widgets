package com.reactnativeliveactivity

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.concurrent.Executors

class LiveActivityReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_REFRESH = "com.reactnativeliveactivity.ACTION_REFRESH"
        const val ACTION_WIDGET_ACTION = "com.reactnativeliveactivity.ACTION_WIDGET_ACTION"
        const val ACTION_WIDGET_SYNC = "com.reactnativeliveactivity.ACTION_WIDGET_SYNC"
        private val executor = Executors.newCachedThreadPool()
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_REFRESH -> {
                val activityId = intent.getStringExtra("activityId") ?: return
                LiveActivityNotifier.refresh(context, activityId)
            }

            ACTION_WIDGET_SYNC -> {
                val widgetKey = intent.getStringExtra("widgetKey") ?: "main"
                val pendingResult = goAsync()
                executor.execute {
                    try {
                        DynamicWidgetStateStore.performRemoteSync(context, widgetKey)
                        DynamicHomeScreenWidgetProvider.updateAllWidgets(context)
                    } finally {
                        pendingResult.finish()
                    }
                }
            }

            ACTION_WIDGET_ACTION -> {
                val actionId = intent.getStringExtra("actionId") ?: return
                val activityId = intent.getStringExtra("activityId") ?: ""
                val pendingResult = goAsync()
                executor.execute {
                    try {
                        if (actionId == "refresh" || actionId.startsWith("refresh:")) {
                            val wKey = if (actionId.startsWith("refresh:")) {
                                actionId.removePrefix("refresh:")
                            } else "main"
                            DynamicWidgetStateStore.performRemoteSync(context, wKey)
                        } else {
                            DynamicWidgetStateStore.handleAction(context, actionId)
                        }
                        DynamicHomeScreenWidgetProvider.updateAllWidgets(context)
                        LiveActivityNotifier.refreshAllActive(context)
                        LiveActivityModule.emitActionClicked(actionId, activityId)
                        try {
                            val headlessIntent = Intent(context, LiveActivityHeadlessTaskService::class.java).apply {
                                putExtra("actionId", actionId)
                                putExtra("activityId", activityId)
                            }
                            try {
                                com.facebook.react.HeadlessJsTaskService.acquireWakeLockNow(context)
                            } catch (_: Throwable) {}
                            context.startService(headlessIntent)
                        } catch (_: Throwable) {}
                    } finally {
                        pendingResult.finish()
                    }
                }
            }
        }
    }
}
