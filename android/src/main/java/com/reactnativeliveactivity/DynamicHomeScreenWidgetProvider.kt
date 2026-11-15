package com.reactnativeliveactivity

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.widget.RemoteViews
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

data class ButtonActionBinding(
    val actionId: String,
    val deepLink: String?,
    val zone: String // "top", "mid", "bot"
)

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

        fun updateSingleWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            options: Bundle?
        ) {
            val views = RemoteViews(context.packageName, R.layout.rn_live_widget_host)
            val density = context.resources.displayMetrics.density.coerceAtLeast(1.5f)

            val minW = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 320)?.takeIf { it > 0 } ?: 320
            val minH = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 280)?.takeIf { it > 0 } ?: 280

            val family = when {
                minW < 180 && minH < 180 -> "small"
                minH < 190 -> "medium"
                else -> "large"
            }

            val rawJson = DynamicWidgetStateStore.resolveLayoutJsonWithVariables(context, "main")
            val activeNode = selectActiveNode(context, rawJson, family)

            val widthPx = (minW.coerceIn(160, 420) * density).roundToInt()
            val heightPx = (minH.coerceIn(150, 420) * density).roundToInt()

            val bindings = mutableListOf<ButtonActionBinding>()
            val bmp = renderWidgetBitmap(context, activeNode, widthPx, heightPx, density, bindings)
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

        private fun renderWidgetBitmap(
            context: Context,
            rootNode: JSONObject?,
            widthPx: Int,
            heightPx: Int,
            density: Float,
            bindings: MutableList<ButtonActionBinding>
        ): Bitmap {
            val bmp = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bmp)
            val paint = Paint(Paint.ANTI_ALIAS_FLAG)

            val rootBgHex = rootNode?.optJSONObject("props")?.optString("backgroundColor", "#FFFFFF") ?: "#FFFFFF"
            paint.color = parseHexColor(rootBgHex, Color.WHITE)
            val cardRect = RectF(0f, 0f, widthPx.toFloat(), heightPx.toFloat())
            canvas.drawRoundRect(cardRect, 22f * density, 22f * density, paint)

            if (rootNode == null) {
                paint.color = Color.parseColor("#0F172A")
                paint.textSize = 16f * density
                paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                paint.textAlign = Paint.Align.CENTER
                canvas.drawText("Live Widgets", widthPx / 2f, heightPx / 2f - 6f * density, paint)

                paint.color = Color.parseColor("#64748B")
                paint.textSize = 12f * density
                paint.typeface = Typeface.DEFAULT
                canvas.drawText("Chọn 1 mẫu UI trong app để hiển thị", widthPx / 2f, heightPx / 2f + 16f * density, paint)
                return bmp
            }

            drawNode(
                context = context,
                canvas = canvas,
                node = rootNode,
                left = 0f,
                top = 0f,
                availWidth = widthPx.toFloat(),
                availHeight = heightPx.toFloat(),
                totalHeight = heightPx.toFloat(),
                density = density,
                isRoot = true,
                bindings = bindings
            )
            return bmp
        }

        private fun drawNode(
            context: Context,
            canvas: Canvas,
            node: JSONObject,
            left: Float,
            top: Float,
            availWidth: Float,
            availHeight: Float,
            totalHeight: Float,
            density: Float,
            isRoot: Boolean,
            bindings: MutableList<ButtonActionBinding>
        ): Float {
            val type = node.optString("type", "")
            val props = node.optJSONObject("props")
            val paint = Paint(Paint.ANTI_ALIAS_FLAG)

            return when (type) {
                "VStack" -> {
                    val pad = (props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density
                    val spacing = (props?.optDouble("spacing", 6.0) ?: 6.0).toFloat() * density
                    val bgHex = props?.optString("backgroundColor", "") ?: ""
                    val radius = (props?.optDouble("borderRadius", 0.0) ?: 0.0).toFloat() * density

                    val children = node.optJSONArray("children")
                    val measuredH = measureNodeHeight(context, node, availWidth, density)
                    val boxH = if (isRoot) availHeight else min(availHeight, measuredH)

                    if (!isRoot && bgHex.isNotEmpty()) {
                        paint.color = parseHexColor(bgHex, Color.TRANSPARENT)
                        canvas.drawRoundRect(
                            RectF(left, top, left + availWidth, top + boxH),
                            radius,
                            radius,
                            paint
                        )
                    }

                    var curY = top + pad
                    val innerW = (availWidth - pad * 2).coerceAtLeast(10f)
                    if (children != null) {
                        for (i in 0 until children.length()) {
                            val child = children.optJSONObject(i) ?: continue
                            val childType = child.optString("type")
                            if (childType == "Spacer") {
                                val minLen = (child.optJSONObject("props")?.optDouble("minLength", 6.0) ?: 6.0).toFloat() * density
                                curY += minLen
                            } else {
                                val usedH = drawNode(
                                    context,
                                    canvas,
                                    child,
                                    left + pad,
                                    curY,
                                    innerW,
                                    (top + boxH - pad - curY).coerceAtLeast(16f),
                                    totalHeight,
                                    density,
                                    false,
                                    bindings
                                )
                                curY += usedH + spacing
                            }
                        }
                    }
                    if (isRoot) availHeight else max(boxH, curY - top + pad - spacing)
                }

                "HStack" -> {
                    val pad = (props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density
                    val spacing = (props?.optDouble("spacing", 6.0) ?: 6.0).toFloat() * density
                    val bgHex = props?.optString("backgroundColor", "") ?: ""
                    val radius = (props?.optDouble("borderRadius", 0.0) ?: 0.0).toFloat() * density
                    val rowH = measureNodeHeight(context, node, availWidth, density)

                    if (!isRoot && bgHex.isNotEmpty()) {
                        paint.color = parseHexColor(bgHex, Color.TRANSPARENT)
                        canvas.drawRoundRect(
                            RectF(left, top, left + availWidth, top + rowH),
                            radius,
                            radius,
                            paint
                        )
                    }

                    val children = node.optJSONArray("children")
                    if (children != null && children.length() > 0) {
                        val innerW = (availWidth - pad * 2).coerceAtLeast(10f)
                        var spacerIndex = -1
                        for (i in 0 until children.length()) {
                            if (children.optJSONObject(i)?.optString("type") == "Spacer") {
                                spacerIndex = i
                                break
                            }
                        }

                        if (spacerIndex >= 0 && children.length() >= 2) {
                            var curLeft = left + pad
                            for (i in 0 until spacerIndex) {
                                val c = children.optJSONObject(i) ?: continue
                                val w = measureNodeWidth(c, innerW, density)
                                drawNode(context, canvas, c, curLeft, top + pad, w, rowH, totalHeight, density, false, bindings)
                                curLeft += w + spacing
                            }

                            var curRight = left + availWidth - pad
                            for (i in children.length() - 1 downTo spacerIndex + 1) {
                                val c = children.optJSONObject(i) ?: continue
                                val w = measureNodeWidth(c, innerW, density)
                                curRight -= w
                                drawNode(context, canvas, c, curRight, top + pad, w, rowH, totalHeight, density, false, bindings)
                                curRight -= spacing
                            }
                        } else {
                            var curLeft = left + pad
                            for (i in 0 until children.length()) {
                                val c = children.optJSONObject(i) ?: continue
                                val w = if (i == children.length() - 1) {
                                    (left + availWidth - pad - curLeft).coerceAtLeast(20f)
                                } else {
                                    measureNodeWidth(c, innerW, density)
                                }
                                drawNode(context, canvas, c, curLeft, top + pad, w, rowH, totalHeight, density, false, bindings)
                                curLeft += w + spacing
                            }
                        }
                    }
                    rowH
                }

                "Text" -> {
                    val text = props?.optString("text", "") ?: ""
                    val fontSize = (props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density
                    val weight = props?.optString("fontWeight", "regular") ?: "regular"
                    val colorHex = props?.optString("color", "#0F172A") ?: "#0F172A"

                    paint.color = parseHexColor(colorHex, Color.BLACK)
                    paint.textSize = fontSize
                    paint.typeface = if (weight == "bold" || weight == "semibold") {
                        Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                    } else {
                        Typeface.DEFAULT
                    }

                    val display = ellipsizeText(text, paint, availWidth)
                    val fm = paint.fontMetrics
                    val textH = fm.descent - fm.ascent
                    canvas.drawText(display, left, top - fm.ascent, paint)
                    textH + 2f * density
                }

                "Timer" -> {
                    val targetTs = props?.optDouble("targetTimestamp", 0.0) ?: 0.0
                    val fontSize = (props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density
                    val colorHex = props?.optString("color", "#2563EB") ?: "#2563EB"
                    val diffSec = abs(targetTs - System.currentTimeMillis() / 1000.0).toLong()
                    val hrs = diffSec / 3600
                    val mins = (diffSec % 3600) / 60
                    val secs = diffSec % 60
                    val formatted = if (hrs > 0) {
                        String.format(Locale.US, "%d:%02d:%02d", hrs, mins, secs)
                    } else {
                        String.format(Locale.US, "%02d:%02d", mins, secs)
                    }

                    paint.color = parseHexColor(colorHex, Color.BLUE)
                    paint.textSize = fontSize
                    paint.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                    val fm = paint.fontMetrics
                    canvas.drawText(formatted, left, top - fm.ascent, paint)
                    (fm.descent - fm.ascent) + 2f * density
                }

                "Progress" -> {
                    val style = props?.optString("style", "bar") ?: "bar"
                    val value = (props?.optDouble("value", 0.75) ?: 0.75).toFloat().coerceIn(0f, 1f)
                    val tintHex = props?.optString("tintColor", "#2563EB") ?: "#2563EB"
                    val trackHex = props?.optString("trackColor", "#CBD5E1") ?: "#CBD5E1"
                    val showPct = props?.optBoolean("showPercentage", false) ?: false
                    val tintColor = parseHexColor(tintHex, Color.BLUE)
                    val trackColor = parseHexColor(trackHex, Color.LTGRAY)

                    when (style) {
                        "circular" -> {
                            val size = ((props?.optDouble("height", 52.0) ?: 52.0).toFloat() * density)
                            val strokeW = (size * 0.12f).coerceAtLeast(3f * density)
                            val arcRect = RectF(
                                left + strokeW,
                                top + strokeW,
                                left + size - strokeW,
                                top + size - strokeW
                            )
                            paint.style = Paint.Style.STROKE
                            paint.strokeWidth = strokeW
                            paint.strokeCap = Paint.Cap.ROUND
                            paint.color = trackColor
                            canvas.drawOval(arcRect, paint)

                            paint.color = tintColor
                            canvas.drawArc(arcRect, -90f, 360f * value, false, paint)

                            if (showPct) {
                                paint.style = Paint.Style.FILL
                                paint.textSize = size * 0.24f
                                paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                                paint.textAlign = Paint.Align.CENTER
                                val fm = paint.fontMetrics
                                val centerY = top + size / 2f - (fm.ascent + fm.descent) / 2f
                                canvas.drawText("${(value * 100).roundToInt()}%", left + size / 2f, centerY, paint)
                            }
                            size + 2f * density
                        }
                        "segmented" -> {
                            val segments = (props?.optInt("segments", 4) ?: 4).coerceAtLeast(1)
                            val currentSeg = if (props?.has("currentSegment") == true) {
                                props.optInt("currentSegment", 1)
                            } else {
                                (value * segments).roundToInt()
                            }
                            val h = ((props?.optDouble("height", 8.0) ?: 8.0).toFloat() * density)
                            val gap = ((props?.optDouble("segmentSpacing", 4.0) ?: 4.0).toFloat() * density)
                            val pctReserve = if (showPct) 36f * density else 0f
                            val barTotalW = (availWidth - pctReserve).coerceAtLeast(40f)
                            val segW = (barTotalW - gap * (segments - 1)) / segments

                            for (i in 0 until segments) {
                                val segLeft = left + i * (segW + gap)
                                paint.style = Paint.Style.FILL
                                paint.color = if (i + 1 <= currentSeg) tintColor else trackColor
                                canvas.drawRoundRect(
                                    RectF(segLeft, top + 2f * density, segLeft + segW, top + 2f * density + h),
                                    h / 2f,
                                    h / 2f,
                                    paint
                                )
                            }
                            if (showPct) {
                                paint.color = tintColor
                                paint.textSize = 11f * density
                                paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                                canvas.drawText(
                                    "${(currentSeg * 100f / segments).roundToInt()}%",
                                    left + barTotalW + 6f * density,
                                    top + h + 2f * density,
                                    paint
                                )
                            }
                            h + 6f * density
                        }
                        else -> {
                            val h = ((props?.optDouble("height", 8.0) ?: 8.0).toFloat() * density)
                            val pctReserve = if (showPct) 36f * density else 0f
                            val barW = (availWidth - pctReserve).coerceAtLeast(40f)
                            paint.style = Paint.Style.FILL
                            paint.color = trackColor
                            canvas.drawRoundRect(
                                RectF(left, top + 2f * density, left + barW, top + 2f * density + h),
                                h / 2f,
                                h / 2f,
                                paint
                            )
                            paint.color = tintColor
                            canvas.drawRoundRect(
                                RectF(left, top + 2f * density, left + barW * value, top + 2f * density + h),
                                h / 2f,
                                h / 2f,
                                paint
                            )
                            if (showPct) {
                                paint.textSize = 11f * density
                                paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                                canvas.drawText(
                                    "${(value * 100).roundToInt()}%",
                                    left + barW + 6f * density,
                                    top + h + 2f * density,
                                    paint
                                )
                            }
                            h + 6f * density
                        }
                    }
                }

                "Image" -> {
                    val w = ((props?.optDouble("width", 32.0) ?: 32.0).toFloat() * density)
                    val h = ((props?.optDouble("height", 32.0) ?: 32.0).toFloat() * density)
                    val radius = ((props?.optDouble("borderRadius", 8.0) ?: 8.0).toFloat() * density)
                    val borderW = ((props?.optDouble("borderWidth", 0.0) ?: 0.0).toFloat() * density)
                    val borderHex = props?.optString("borderColor", "#2563EB") ?: "#2563EB"
                    val bgHex = props?.optString("backgroundColor", "") ?: ""
                    val tintHex = props?.optString("tintColor", "#2563EB") ?: "#2563EB"
                    val rect = RectF(left, top, left + w, top + h)

                    val bmp = DynamicWidgetImageCache.resolveNodeBitmap(context, props)
                    if (bmp != null) {
                        val shader = BitmapShader(bmp, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
                        val matrix = Matrix()
                        val scale = max(w / bmp.width.toFloat(), h / bmp.height.toFloat())
                        matrix.setScale(scale, scale)
                        matrix.postTranslate(left + (w - bmp.width * scale) / 2f, top + (h - bmp.height * scale) / 2f)
                        shader.setLocalMatrix(matrix)

                        paint.shader = shader
                        paint.style = Paint.Style.FILL
                        canvas.drawRoundRect(rect, radius, radius, paint)
                        paint.shader = null
                    } else {
                        paint.style = Paint.Style.FILL
                        paint.color = if (bgHex.isNotEmpty()) parseHexColor(bgHex, Color.LTGRAY) else Color.parseColor("#DBEAFE")
                        canvas.drawRoundRect(rect, radius, radius, paint)

                        paint.color = parseHexColor(tintHex, Color.BLUE)
                        paint.textSize = min(w, h) * 0.48f
                        paint.textAlign = Paint.Align.CENTER
                        val symbol = props?.optString("systemName", "") ?: ""
                        val glyph = when {
                            symbol.contains("person") -> "👤"
                            symbol.contains("sparkle") -> "✨"
                            symbol.contains("check") -> "✓"
                            symbol.contains("bell") -> "🔔"
                            symbol.contains("heart") -> "💜"
                            symbol.contains("star") -> "★"
                            else -> "🖼️"
                        }
                        val fm = paint.fontMetrics
                        val cy = top + h / 2f - (fm.ascent + fm.descent) / 2f
                        canvas.drawText(glyph, left + w / 2f, cy, paint)
                    }

                    if (borderW > 0f) {
                        paint.style = Paint.Style.STROKE
                        paint.strokeWidth = borderW
                        paint.color = parseHexColor(borderHex, Color.BLUE)
                        canvas.drawRoundRect(rect, radius, radius, paint)
                    }
                    h + 2f * density
                }

                "Button" -> {
                    val rawTitle = props?.optString("title", "Button") ?: "Button"
                    val actionId = props?.optString("actionId", "") ?: ""
                    val deepLink = props?.optString("deepLink", "")?.ifEmpty { null }
                    val isToggled = if (actionId.startsWith("toggle:")) {
                        DynamicWidgetStateStore.isToggled(context, actionId.removePrefix("toggle:"))
                    } else false

                    val displayTitle = if (isToggled) {
                        props?.optString("checkedTitle", rawTitle)?.ifEmpty { rawTitle } ?: rawTitle
                    } else rawTitle

                    val bgHex = if (isToggled) {
                        props?.optString("checkedBackgroundColor", "")?.ifEmpty {
                            props.optString("backgroundColor", "#2563EB")
                        } ?: "#DCFCE7"
                    } else {
                        props?.optString("backgroundColor", "#2563EB") ?: "#2563EB"
                    }

                    val textHex = if (isToggled) {
                        props?.optString("checkedTextColor", "")?.ifEmpty {
                            props.optString("textColor", "#FFFFFF")
                        } ?: "#15803D"
                    } else {
                        props?.optString("textColor", "#FFFFFF") ?: "#FFFFFF"
                    }

                    val fontSize = ((props?.optDouble("fontSize", 11.0) ?: 11.0).toFloat() * density)
                    val padH = ((props?.optDouble("paddingHorizontal", 10.0) ?: 10.0).toFloat() * density)
                    val padV = ((props?.optDouble("paddingVertical", 6.0) ?: 6.0).toFloat() * density)
                    val radius = ((props?.optDouble("borderRadius", 8.0) ?: 8.0).toFloat() * density)
                    val fullWidth = props?.optBoolean("fullWidth", false) ?: false

                    paint.textSize = fontSize
                    paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                    val textW = paint.measureText(displayTitle)
                    val btnW = if (fullWidth) availWidth else min(availWidth, textW + padH * 2)
                    val btnH = fontSize + padV * 2

                    paint.style = Paint.Style.FILL
                    paint.color = parseHexColor(bgHex, Color.BLUE)
                    val rect = RectF(left, top, left + btnW, top + btnH)
                    canvas.drawRoundRect(rect, radius, radius, paint)

                    paint.color = parseHexColor(textHex, Color.WHITE)
                    val fm = paint.fontMetrics
                    val textY = top + btnH / 2f - (fm.ascent + fm.descent) / 2f
                    val display = ellipsizeText(displayTitle, paint, (btnW - padH * 1.5f).coerceAtLeast(20f))
                    canvas.drawText(display, left + padH, textY, paint)

                    if (actionId.isNotEmpty() || !deepLink.isNullOrEmpty()) {
                        val zone = when {
                            top < totalHeight * 0.25f -> "top"
                            top > totalHeight * 0.76f -> "bot"
                            else -> "mid"
                        }
                        bindings.add(ButtonActionBinding(actionId = actionId, deepLink = deepLink, zone = zone))
                    }
                    btnH + 2f * density
                }

                else -> 0f
            }
        }

        private fun measureNodeHeight(context: Context, node: JSONObject, availWidth: Float, density: Float): Float {
            val type = node.optString("type", "")
            val props = node.optJSONObject("props")
            return when (type) {
                "VStack" -> {
                    val pad = ((props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density)
                    val spacing = ((props?.optDouble("spacing", 6.0) ?: 6.0).toFloat() * density)
                    val children = node.optJSONArray("children")
                    var h = pad * 2
                    if (children != null) {
                        for (i in 0 until children.length()) {
                            val c = children.optJSONObject(i) ?: continue
                            h += measureNodeHeight(context, c, availWidth - pad * 2, density)
                            if (i < children.length() - 1) h += spacing
                        }
                    }
                    h
                }
                "HStack" -> {
                    val pad = ((props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density)
                    val children = node.optJSONArray("children")
                    var maxChildH = 20f * density
                    if (children != null) {
                        for (i in 0 until children.length()) {
                            val c = children.optJSONObject(i) ?: continue
                            maxChildH = max(maxChildH, measureNodeHeight(context, c, availWidth, density))
                        }
                    }
                    maxChildH + pad * 2
                }
                "Text", "Timer" -> {
                    val fs = ((props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density)
                    fs * 1.35f
                }
                "Progress" -> {
                    val style = props?.optString("style", "bar") ?: "bar"
                    if (style == "circular") {
                        ((props?.optDouble("height", 52.0) ?: 52.0).toFloat() * density) + 4f * density
                    } else {
                        ((props?.optDouble("height", 8.0) ?: 8.0).toFloat() * density) + 6f * density
                    }
                }
                "Image" -> ((props?.optDouble("height", 32.0) ?: 32.0).toFloat() * density) + 2f * density
                "Button" -> {
                    val fs = ((props?.optDouble("fontSize", 11.0) ?: 11.0).toFloat() * density)
                    val padV = ((props?.optDouble("paddingVertical", 6.0) ?: 6.0).toFloat() * density)
                    fs + padV * 2 + 2f * density
                }
                "Spacer" -> ((props?.optDouble("minLength", 6.0) ?: 6.0).toFloat() * density)
                else -> 0f
            }
        }

        private fun measureNodeWidth(node: JSONObject, availWidth: Float, density: Float): Float {
            val type = node.optString("type", "")
            val props = node.optJSONObject("props")
            val paint = Paint(Paint.ANTI_ALIAS_FLAG)
            return when (type) {
                "Text" -> {
                    val text = props?.optString("text", "") ?: ""
                    val fs = ((props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density)
                    paint.textSize = fs
                    paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                    min(availWidth * 0.72f, paint.measureText(text) + 4f * density)
                }
                "Timer" -> {
                    val fs = ((props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density)
                    fs * 4.5f
                }
                "Image" -> ((props?.optDouble("width", 32.0) ?: 32.0).toFloat() * density)
                "Progress" -> {
                    val style = props?.optString("style", "bar") ?: "bar"
                    if (style == "circular") {
                        ((props?.optDouble("height", 52.0) ?: 52.0).toFloat() * density)
                    } else availWidth * 0.5f
                }
                "Button" -> {
                    val title = props?.optString("title", "Button") ?: "Button"
                    val fs = ((props?.optDouble("fontSize", 11.0) ?: 11.0).toFloat() * density)
                    val padH = ((props?.optDouble("paddingHorizontal", 10.0) ?: 10.0).toFloat() * density)
                    paint.textSize = fs
                    paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                    paint.measureText(title) + padH * 2
                }
                else -> availWidth * 0.65f
            }
        }

        private fun ellipsizeText(text: String, paint: Paint, maxWidth: Float): String {
            if (paint.measureText(text) <= maxWidth) return text
            var end = text.length
            while (end > 1 && paint.measureText(text.substring(0, end) + "…") > maxWidth) {
                end--
            }
            return text.substring(0, end) + "…"
        }

        private fun parseHexColor(hex: String, fallback: Int): Int {
            return try {
                Color.parseColor(hex)
            } catch (_: Exception) {
                fallback
            }
        }
    }
}

