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
import android.util.TypedValue
import android.view.View
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
                widgetHeightDp < 195f -> "medium"
                else -> "large"
            }

            val rawJson = DynamicWidgetStateStore.resolveLayoutJsonWithVariables(context, "main")
            val activeNode = selectActiveNode(context, rawJson, family)

            val logicalWidthDp = when (family) {
                "small" -> 164f
                "medium" -> 330f
                else -> 340f
            }
            val aspectRatio = if (family == "small") {
                1.02f
            } else {
                (widgetHeightDp / widgetWidthDp).coerceIn(0.38f, 1.65f)
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

            // 📐 Ánh xạ toạ độ Bitmap -> toạ độ thật của widget trên Launcher.
            // ImageView dùng scaleType=fitCenter nên Bitmap có thể bị thu/phóng và chừa viền (letterbox).
            // Mọi vùng bấm & đồng hồ phải đi qua phép ánh xạ này thì mới khớp 100% với hình đã vẽ.
            val mapping = computeCanvasMapping(context, rawWidthDp, rawHeightDp, widthPx, heightPx)

            // ⏱️ Live Chronometer tự đếm bằng engine native của hệ điều hành
            val timerInfo = DynamicWidgetCanvasRenderer.activeTimerInfo
            if (timerInfo != null) {
                views.setViewVisibility(R.id.rn_widget_chronometer, View.VISIBLE)
                views.setViewPadding(
                    R.id.rn_widget_chronometer,
                    (mapping.offX + timerInfo.leftPx * mapping.scale).roundToInt(),
                    (mapping.offY + timerInfo.topPx * mapping.scale).roundToInt(),
                    0,
                    0
                )
                views.setTextViewTextSize(
                    R.id.rn_widget_chronometer,
                    TypedValue.COMPLEX_UNIT_PX,
                    timerInfo.fontSizePx * mapping.scale
                )
                views.setTextColor(R.id.rn_widget_chronometer, timerInfo.color)
                views.setChronometer(R.id.rn_widget_chronometer, timerInfo.baseMillis, null, true)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    views.setChronometerCountDown(R.id.rn_widget_chronometer, timerInfo.isCountDown)
                }
            } else {
                views.setViewVisibility(R.id.rn_widget_chronometer, View.GONE)
            }

            // ♿ Gán Accessibility Summary từ IR Semantic Tree (hoặc fallback Canvas extractor)
            val a11ySummary = if (activeNode?.has("semanticSummary") == true) {
                activeNode.optString("semanticSummary")
            } else {
                DynamicWidgetCanvasRenderer.extractAccessibilitySummary(activeNode)
            }
            if (a11ySummary.isNotEmpty()) {
                views.setContentDescription(R.id.rn_widget_canvas, a11ySummary)
            }

            bindHitZones(context, views, appWidgetId, bindings, mapping)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun selectActiveNode(context: Context, rawJson: String?, family: String): JSONObject? {
            if (rawJson.isNullOrEmpty()) return null
            return try {
                val payload = JSONObject(rawJson)

                // Hỗ trợ trực tiếp cấu trúc UI Intermediate Representation (IR v2.0)
                if (payload.optString("version") == "2.0" && payload.has("root")) {
                    val root = payload.optJSONObject("root")
                    if (root != null && payload.has("semanticSummary")) {
                        root.put("semanticSummary", payload.optString("semanticSummary"))
                    }
                    return root
                }

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

        /** Thông số ánh xạ từ toạ độ Bitmap sang toạ độ pixel thật của host view trên Launcher. */
        private data class CanvasMapping(
            val hostW: Float,
            val hostH: Float,
            val bmpW: Float,
            val bmpH: Float,
            val scale: Float,
            val offX: Float,
            val offY: Float
        )

        private fun computeCanvasMapping(
            context: Context,
            widgetWidthDp: Float,
            widgetHeightDp: Float,
            bmpWidthPx: Int,
            bmpHeightPx: Int
        ): CanvasMapping {
            val density = context.resources.displayMetrics.density
            val bmpW = bmpWidthPx.toFloat()
            val bmpH = bmpHeightPx.toFloat()
            val hostW = (widgetWidthDp * density).takeIf { it > 1f } ?: bmpW
            val hostH = (widgetHeightDp * density).takeIf { it > 1f } ?: bmpH
            // fitCenter: scale đồng đều theo chiều nhỏ hơn, căn giữa phần còn lại
            val scale = min(hostW / bmpW, hostH / bmpH)
            val offX = (hostW - bmpW * scale) / 2f
            val offY = (hostH - bmpH * scale) / 2f
            return CanvasMapping(hostW, hostH, bmpW, bmpH, scale, offX, offY)
        }

        /**
         * 🎯 Exact Hit Layer: mỗi Button / Toggle / Link nhận 1 view bấm riêng được đặt CHÍNH XÁC
         * theo hình chữ nhật đã vẽ trên Canvas (không còn chia lưới cố định / đoán theo hàng-cột).
         * - Bấm đúng nút nào => ăn đúng nút đó.
         * - Bấm vào vùng trống => không kích hoạt hành động nào.
         * - Nút nhỏ nằm trong vùng lớn (vd Button bên trong Link) luôn được ưu tiên vì nằm trên cùng.
         */
        private fun bindHitZones(
            context: Context,
            views: RemoteViews,
            appWidgetId: Int,
            bindings: List<ButtonActionBinding>,
            mapping: CanvasMapping
        ) {
            views.removeAllViews(R.id.rn_hit_layer)
            if (bindings.isEmpty()) return

            val density = context.resources.displayMetrics.density
            val slop = 1.5f * density // nới nhẹ vùng chạm cho dễ bấm, không đủ lớn để lấn sang nút bên cạnh

            // Vùng lớn thêm trước (nằm dưới), vùng nhỏ thêm sau (nằm trên) => ưu tiên nút nhỏ/cụ thể
            val ordered = bindings
                .filter { it.rightFraction > it.leftFraction && it.bottomFraction > it.topFraction }
                .sortedByDescending { (it.rightFraction - it.leftFraction) * (it.bottomFraction - it.topFraction) }
                .take(48)

            ordered.forEachIndexed { index, b ->
                val left = mapping.offX + b.leftFraction * mapping.bmpW * mapping.scale - slop
                val right = mapping.offX + b.rightFraction * mapping.bmpW * mapping.scale + slop
                val top = mapping.offY + b.topFraction * mapping.bmpH * mapping.scale - slop
                val bottom = mapping.offY + b.bottomFraction * mapping.bmpH * mapping.scale + slop

                val padL = left.coerceIn(0f, mapping.hostW).roundToInt()
                val padT = top.coerceIn(0f, mapping.hostH).roundToInt()
                val padR = (mapping.hostW - right).coerceIn(0f, mapping.hostW).roundToInt()
                val padB = (mapping.hostH - bottom).coerceIn(0f, mapping.hostH).roundToInt()

                val zone = RemoteViews(context.packageName, R.layout.rn_live_widget_hit_zone)
                zone.setViewPadding(R.id.rn_hit_zone_root, padL, padT, padR, padB)
                zone.setOnClickPendingIntent(
                    R.id.rn_hit_zone,
                    createPendingIntent(context, appWidgetId * 1000 + index, b)
                )
                val btnLabel = if (!b.accessibilityLabel.isNullOrEmpty()) b.accessibilityLabel else b.title
                val fullDesc = if (!b.accessibilityHint.isNullOrEmpty()) "$btnLabel. ${b.accessibilityHint}" else btnLabel
                zone.setContentDescription(R.id.rn_hit_zone, fullDesc)
                views.addView(R.id.rn_hit_layer, zone)
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
                data = Uri.parse("rnlivewidget://action/$requestCode/${Uri.encode(binding.actionId)}")
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

