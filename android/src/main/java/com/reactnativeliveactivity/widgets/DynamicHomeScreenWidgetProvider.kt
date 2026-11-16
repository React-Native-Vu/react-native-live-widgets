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
import kotlin.math.min
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

            // ♿ Gán Accessibility Summary cho toàn bộ Canvas View để TalkBack đọc được (Phase 1)
            val a11ySummary = DynamicWidgetCanvasRenderer.extractAccessibilitySummary(activeNode)
            if (a11ySummary.isNotEmpty()) {
                views.setContentDescription(R.id.rn_widget_canvas, a11ySummary)
            }

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
            val gridIds = listOf(
                listOf(R.id.rn_hit_r0_c0, R.id.rn_hit_r0_c1, R.id.rn_hit_r0_c2, R.id.rn_hit_r0_c3),
                listOf(R.id.rn_hit_r1_c0, R.id.rn_hit_r1_c1, R.id.rn_hit_r1_c2),
                listOf(R.id.rn_hit_r2_c0, R.id.rn_hit_r2_c1, R.id.rn_hit_r2_c2),
                listOf(R.id.rn_hit_r3_c0, R.id.rn_hit_r3_c1, R.id.rn_hit_r3_c2),
                listOf(R.id.rn_hit_r4_c0, R.id.rn_hit_r4_c1, R.id.rn_hit_r4_c2),
                listOf(R.id.rn_hit_r5_c0, R.id.rn_hit_r5_c1, R.id.rn_hit_r5_c2)
            )

            val cellBindings = mutableMapOf<Int, ButtonActionBinding>()

            val topButtons = bindings.filter { it.zone == "top" || it.yFraction < 0.20f }
            val otherButtons = bindings.filter { it !in topButtons }

            val row0 = gridIds[0]
            for (c in 0 until min(row0.size, topButtons.size)) {
                cellBindings[row0[c]] = topButtons[c]
            }

            for (b in otherButtons) {
                val row = when {
                    b.yFraction < 0.35f -> 1
                    b.yFraction < 0.52f -> 2
                    b.yFraction < 0.62f -> 3
                    b.yFraction < 0.75f -> 4
                    else -> 5
                }

                val rowCols = gridIds[row]
                if (b.widthFraction > 0.50f) {
                    for (viewId in rowCols) {
                        cellBindings[viewId] = b
                    }
                } else {
                    if (b.xFraction < 0.40f) {
                        cellBindings[rowCols[0]] = b
                        cellBindings[rowCols[1]] = b
                    } else {
                        cellBindings[rowCols[1]] = b
                        cellBindings[rowCols[2]] = b
                    }
                }
            }

            var requestIdx = 0
            for (r in gridIds.indices) {
                for (c in gridIds[r].indices) {
                    val viewId = gridIds[r][c]
                    val b = cellBindings[viewId]
                    views.setOnClickPendingIntent(
                        viewId,
                        createPendingIntent(context, appWidgetId * 100 + requestIdx++, b)
                    )
                    // ♿ Gán nhãn trợ năng riêng cho từng nút bấm / vùng tương tác
                    if (b != null) {
                        val btnLabel = if (!b.accessibilityLabel.isNullOrEmpty()) b.accessibilityLabel else b.title
                        val fullDesc = if (!b.accessibilityHint.isNullOrEmpty()) "$btnLabel. ${b.accessibilityHint}" else btnLabel
                        views.setContentDescription(viewId, fullDesc)
                    } else {
                        views.setContentDescription(viewId, null)
                    }
                }
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

