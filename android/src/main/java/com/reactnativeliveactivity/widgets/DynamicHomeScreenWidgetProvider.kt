package com.reactnativeliveactivity

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.SizeF
import android.widget.RemoteViews
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.roundToInt

class DynamicHomeScreenWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
            updateSingleWidget(context, appWidgetManager, appWidgetId, options)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateSingleWidget(context, appWidgetManager, appWidgetId, newOptions)
    }

    companion object {
        fun updateAllWidgets(context: Context) {
            try {
                val manager = AppWidgetManager.getInstance(context)
                val component = ComponentName(context, DynamicHomeScreenWidgetProvider::class.java)
                val ids = manager.getAppWidgetIds(component)
                for (id in ids) {
                    val opts = manager.getAppWidgetOptions(id)
                    updateSingleWidget(context, manager, id, opts)
                }
            } catch (_: Exception) {
            }
        }

        private fun resolvePortraitWidgetSizeDp(options: Bundle?): Pair<Float, Float> {
            if (options == null) return Pair(320f, 240f)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                @Suppress("DEPRECATION")
                val sizes = options.getParcelableArrayList<SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)
                if (!sizes.isNullOrEmpty()) {
                    val portrait = sizes.minByOrNull { it.width } ?: sizes[0]
                    if (portrait.width > 0f && portrait.height > 0f) {
                        return Pair(portrait.width, portrait.height)
                    }
                }
            }

            val minW = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0).takeIf { it > 0 } ?: 320
            val minH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0).takeIf { it > 0 } ?: 200
            val maxH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0).takeIf { it > 0 } ?: minH
            return Pair(minW.toFloat(), max(minH, maxH).toFloat())
        }

        fun updateSingleWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            options: Bundle?
        ) {
            val views = RemoteViews(context.packageName, R.layout.rn_live_widget_host)
            val screenDensity = context.resources.displayMetrics.density.coerceAtLeast(2.0f)

            val (rawWidthDp, rawHeightDp) = resolvePortraitWidgetSizeDp(options)
            val widgetWidthDp = rawWidthDp.coerceIn(110f, 460f)
            val widgetHeightDp = rawHeightDp.coerceIn(110f, 520f)

            val family = when {
                widgetWidthDp < 245f -> "small"
                widgetHeightDp < 235f -> "medium"
                else -> "large"
            }

            val rawJson = DynamicWidgetStateStore.resolveLayoutJsonWithVariables(context, "main")
            val activeNode = selectActiveNode(context, rawJson, family)

            val logicalWidthDp = when (family) {
                "small" -> 164f
                "medium" -> 330f
                else -> 340f
            }
            val aspectRatio = when (family) {
                "small" -> 1.02f
                "medium" -> (widgetHeightDp / widgetWidthDp).coerceIn(0.45f, 0.62f)
                else -> (widgetHeightDp / widgetWidthDp).coerceIn(0.78f, 1.45f)
            }
            val logicalHeightDp = logicalWidthDp * aspectRatio

            val renderDensity = max(screenDensity, (widgetWidthDp * screenDensity) / logicalWidthDp)
            val widthPx = (logicalWidthDp * renderDensity).roundToInt().coerceAtLeast(320)
            val heightPx = (logicalHeightDp * renderDensity).roundToInt().coerceAtLeast(220)

            val bindings = mutableListOf<ButtonActionBinding>()
            val bmp = DynamicWidgetCanvasRenderer.renderWidgetBitmap(
                context = context,
                rootNode = activeNode,
                widthPx = widthPx,
                heightPx = heightPx,
                baseDensity = renderDensity,
                family = family,
                bindings = bindings
            )
            views.setImageViewBitmap(R.id.rn_widget_canvas, bmp)

            bindHitZones(context, views, appWidgetId, bindings)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun selectActiveNode(context: Context, rawJson: String?, family: String): JSONObject? {
            if (rawJson.isNullOrEmpty()) return null
            return try {
                val payload = JSONObject(rawJson)
                val pages = payload.optJSONObject("pages")
                if (pages != null && pages.length() > 0) {
                    val state = DynamicWidgetStateStore.loadState(context)
                    val initial = payload.optString("initialPage", "")
                    val activePageId = when {
                        !state.activePage.isNullOrEmpty() && pages.has(state.activePage!!) -> state.activePage!!
                        initial.isNotEmpty() && pages.has(initial) -> initial
                        else -> pages.keys().next()
                    }
                    val pageObj = pages.optJSONObject(activePageId) ?: return null
                    selectFamilyFromObject(pageObj, family)
                } else {
                    selectFamilyFromObject(payload, family)
                }
            } catch (_: Exception) {
                null
            }
        }

        private fun selectFamilyFromObject(obj: JSONObject, family: String): JSONObject? {
            return when (family) {
                "small" -> obj.optJSONObject("small") ?: obj.optJSONObject("medium") ?: obj.optJSONObject("large")
                "medium" -> obj.optJSONObject("medium") ?: obj.optJSONObject("large") ?: obj.optJSONObject("small")
                else -> obj.optJSONObject("large") ?: obj.optJSONObject("medium") ?: obj.optJSONObject("small")
            }
        }

        private fun bindHitZones(
            context: Context,
            views: RemoteViews,
            appWidgetId: Int,
            bindings: List<ButtonActionBinding>
        ) {
            val topIds = listOf(R.id.rn_hit_top_1, R.id.rn_hit_top_2, R.id.rn_hit_top_3, R.id.rn_hit_top_4)
            val midIds = listOf(R.id.rn_hit_mid_1, R.id.rn_hit_mid_2, R.id.rn_hit_mid_3)
            val botIds = listOf(R.id.rn_hit_bot_1, R.id.rn_hit_bot_2)

            val topBindings = bindings.filter { it.zone == "top" }
            val midBindings = bindings.filter { it.zone == "mid" }
            val botBindings = bindings.filter { it.zone == "bot" }

            for (i in topIds.indices) {
                val b = topBindings.getOrNull(i)
                views.setOnClickPendingIntent(topIds[i], createPendingIntent(context, appWidgetId * 100 + i, b))
            }
            for (i in midIds.indices) {
                val b = midBindings.getOrNull(i)
                views.setOnClickPendingIntent(midIds[i], createPendingIntent(context, appWidgetId * 100 + 20 + i, b))
            }
            for (i in botIds.indices) {
                val b = botBindings.getOrNull(i)
                views.setOnClickPendingIntent(botIds[i], createPendingIntent(context, appWidgetId * 100 + 40 + i, b))
            }
        }

        private fun createPendingIntent(
            context: Context,
            requestCode: Int,
            binding: ButtonActionBinding?
        ): PendingIntent? {
            if (binding == null) {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                    ?: return null
                return PendingIntent.getActivity(
                    context,
                    requestCode,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            }

            if (!binding.deepLink.isNullOrEmpty()) {
                val deepIntent = Intent(Intent.ACTION_VIEW, Uri.parse(binding.deepLink)).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                return PendingIntent.getActivity(
                    context,
                    requestCode,
                    deepIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            }

            val intent = Intent(context, LiveActivityReceiver::class.java).apply {
                action = LiveActivityReceiver.ACTION_WIDGET_ACTION
                putExtra("actionId", binding.actionId)
            }
            return PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }
}

