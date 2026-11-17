package com.reactnativeliveactivity

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * 🎛️ Android Quick Settings Tile (API 24+) đồng bộ 2 chiều với API `Widget.setControl` / `ControlWidget`.
 */
class DynamicQuickSettingsTileService : TileService() {

    private data class ResolvedControlConfig(
        val isToggleType: Boolean,
        val rawActionId: String,
        val title: String,
        val subtitle: String,
        val checkedTitle: String,
        val checkedSubtitle: String,
        val defaultChecked: Boolean
    )

    private fun resolveConfig(): ResolvedControlConfig {
        val rawJson = DynamicWidgetStateStore.readSharedString(applicationContext, "widget_control_toggle")
            ?: DynamicWidgetStateStore.readSharedString(applicationContext, "widget_control_main")
        val cfg = rawJson?.let { runCatching { JSONObject(it) }.getOrNull() }

        val type = cfg?.optString("type", "")?.ifEmpty { null }
        val explicitActionId = cfg?.optString("actionId", "")?.ifEmpty { null }
        val isToggleType = type == "toggle" || (type != "button" && explicitActionId?.startsWith("toggle:") == true)
        val rawActionId = explicitActionId ?: if (isToggleType) "toggle:control_main" else "control_action_main"

        val title = cfg?.optString("title", "")?.ifEmpty { null } ?: "Live Widgets"
        val subtitle = cfg?.optString("subtitle", "")?.ifEmpty { null } ?: ""
        val checkedTitle = cfg?.optString("checkedTitle", "")?.ifEmpty { null } ?: title
        val checkedSubtitle = cfg?.optString("checkedSubtitle", "")?.ifEmpty { null } ?: subtitle
        val defaultChecked = cfg?.optBoolean("checked", false) ?: false

        return ResolvedControlConfig(
            isToggleType = isToggleType,
            rawActionId = rawActionId,
            title = title,
            subtitle = subtitle,
            checkedTitle = checkedTitle,
            checkedSubtitle = checkedSubtitle,
            defaultChecked = defaultChecked
        )
    }

    private fun refreshTileState() {
        val tile = qsTile ?: return
        val cfg = resolveConfig()
        val state = DynamicWidgetStateStore.loadState(applicationContext)

        val isOn = if (cfg.isToggleType) {
            val key = cfg.rawActionId.removePrefix("toggle:")
            state.toggledItems[key] ?: cfg.defaultChecked
        } else {
            false
        }

        tile.state = if (isOn) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
        tile.label = if (isOn) cfg.checkedTitle else cfg.title
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val sub = if (isOn) cfg.checkedSubtitle else cfg.subtitle
            tile.subtitle = sub.ifEmpty { null }
        }
        runCatching { tile.updateTile() }
    }

    override fun onStartListening() {
        super.onStartListening()
        refreshTileState()
    }

    override fun onClick() {
        super.onClick()
        val cfg = resolveConfig()
        val rawActionId = cfg.rawActionId

        DynamicWidgetStateStore.handleAction(applicationContext, rawActionId)
        refreshTileState()

        val ctx = applicationContext
        executor.execute {
            runCatching { DynamicHomeScreenWidgetProvider.updateAllWidgets(ctx) }
            runCatching { LiveActivityNotifier.refreshAllActive(ctx) }
            runCatching { LiveActivityModule.emitActionClicked(rawActionId, "control_tile") }
            runCatching {
                val headlessIntent = Intent(ctx, LiveActivityHeadlessTaskService::class.java).apply {
                    putExtra("actionId", rawActionId)
                    putExtra("activityId", "control_tile")
                }
                runCatching {
                    com.facebook.react.HeadlessJsTaskService.acquireWakeLockNow(ctx)
                }
                ctx.startService(headlessIntent)
            }
        }
    }

    companion object {
        private val executor = Executors.newCachedThreadPool()

        @JvmStatic
        fun requestTileUpdate(context: Context) {
            runCatching {
                val appCtx = context.applicationContext
                requestListeningState(
                    appCtx,
                    ComponentName(appCtx, DynamicQuickSettingsTileService::class.java)
                )
            }
        }
    }
}
