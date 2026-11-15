package com.reactnativeliveactivity

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import org.json.JSONObject
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

data class ButtonActionBinding(
    val actionId: String,
    val deepLink: String?,
    val zone: String // "top", "mid", "bot"
)

object DynamicWidgetCanvasRenderer {

    private fun isFlexibleSpacer(node: JSONObject?): Boolean {
        if (node == null || node.optString("type") != "Spacer") return false
        val props = node.optJSONObject("props") ?: return true
        return !props.has("minLength")
    }

    fun renderWidgetBitmap(
        context: Context,
        rootNode: JSONObject?,
        widthPx: Int,
        heightPx: Int,
        baseDensity: Float,
        family: String,
        bindings: MutableList<ButtonActionBinding>
    ): Bitmap {
        val bmp = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG)

        val rootBgHex = rootNode?.optJSONObject("props")?.optString("backgroundColor", "#FFFFFF")
            ?.ifEmpty { "#FFFFFF" } ?: "#FFFFFF"
        paint.color = parseHexColor(rootBgHex, Color.WHITE)
        val cardRect = RectF(0f, 0f, widthPx.toFloat(), heightPx.toFloat())
        val outerRadius = (if (family == "small") 22f else 24f) * baseDensity
        canvas.drawRoundRect(cardRect, outerRadius, outerRadius, paint)

        if (rootNode == null) {
            paint.color = Color.parseColor("#0F172A")
            paint.textSize = 15f * baseDensity
            paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
            paint.textAlign = Paint.Align.CENTER
            canvas.drawText("Live Widgets", widthPx / 2f, heightPx / 2f - 6f * baseDensity, paint)

            paint.color = Color.parseColor("#64748B")
            paint.textSize = 11f * baseDensity
            paint.typeface = Typeface.create("sans-serif", Typeface.NORMAL)
            canvas.drawText("Chọn 1 mẫu UI trong app", widthPx / 2f, heightPx / 2f + 14f * baseDensity, paint)
            return bmp
        }

        val naturalH = measureNodeHeight(context, rootNode, widthPx.toFloat(), baseDensity)
        val fitScale = if (naturalH > heightPx * 0.96f && naturalH > 0f) {
            ((heightPx * 0.95f) / naturalH).coerceIn(0.62f, 1.0f)
        } else {
            1.0f
        }
        val effectiveDensity = baseDensity * fitScale
        val scaledNaturalH = measureNodeHeight(context, rootNode, widthPx.toFloat(), effectiveDensity)

        var hasRootFlexSpacer = false
        val rootChildren = rootNode.optJSONArray("children")
        if (rootChildren != null) {
            for (i in 0 until rootChildren.length()) {
                if (isFlexibleSpacer(rootChildren.optJSONObject(i))) {
                    hasRootFlexSpacer = true
                    break
                }
            }
        }
        val startTop = if (!hasRootFlexSpacer && heightPx > scaledNaturalH) {
            ((heightPx - scaledNaturalH) / 2f).coerceAtLeast(0f)
        } else {
            0f
        }

        drawNode(
            context = context,
            canvas = canvas,
            node = rootNode,
            left = 0f,
            top = startTop,
            availWidth = widthPx.toFloat(),
            availHeight = (heightPx - startTop).coerceAtLeast(scaledNaturalH),
            totalHeight = heightPx.toFloat(),
            density = effectiveDensity,
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
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG)

        return when (type) {
            "VStack" -> {
                val pad = (props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density
                val spacing = (props?.optDouble("spacing", 6.0) ?: 6.0).toFloat() * density
                val bgHex = props?.optString("backgroundColor", "") ?: ""
                val borderHex = props?.optString("borderColor", "") ?: ""
                val borderW = (props?.optDouble("borderWidth", 0.0) ?: 0.0).toFloat() * density
                val radius = (props?.optDouble("borderRadius", 10.0) ?: 10.0).toFloat() * density

                val children = node.optJSONArray("children")
                val innerW = (availWidth - pad * 2).coerceAtLeast(10f)
                val measuredH = measureNodeHeight(context, node, availWidth, density)
                val boxH = if (isRoot) max(availHeight, measuredH) else measuredH

                if (!isRoot && bgHex.isNotEmpty()) {
                    val rect = RectF(left, top, left + availWidth, top + boxH)
                    paint.style = Paint.Style.FILL
                    paint.color = parseHexColor(bgHex, Color.TRANSPARENT)
                    canvas.drawRoundRect(rect, radius, radius, paint)

                    if (borderW > 0f && borderHex.isNotEmpty()) {
                        paint.style = Paint.Style.STROKE
                        paint.strokeWidth = borderW
                        paint.color = parseHexColor(borderHex, Color.LTGRAY)
                        canvas.drawRoundRect(rect, radius, radius, paint)
                    }
                }

                var flexSpacerCount = 0
                if (isRoot && children != null && availHeight > measuredH) {
                    for (i in 0 until children.length()) {
                        if (isFlexibleSpacer(children.optJSONObject(i))) {
                            flexSpacerCount++
                        }
                    }
                }
                val extraPerSpacer = if (flexSpacerCount > 0) {
                    ((availHeight - measuredH) / flexSpacerCount).coerceAtLeast(0f)
                } else 0f

                var curY = top + pad
                if (children != null) {
                    val count = children.length()
                    for (i in 0 until count) {
                        val child = children.optJSONObject(i) ?: continue
                        val childType = child.optString("type")
                        if (childType == "Spacer") {
                            val cProps = child.optJSONObject("props")
                            val minLen = (cProps?.optDouble("minLength", 4.0) ?: 4.0).toFloat() * density
                            val isFlex = isRoot && isFlexibleSpacer(child)
                            curY += minLen + (if (isFlex) extraPerSpacer else 0f)
                            if (i < count - 1) curY += spacing
                        } else {
                            val usedH = drawNode(
                                context = context,
                                canvas = canvas,
                                node = child,
                                left = left + pad,
                                top = curY,
                                availWidth = innerW,
                                availHeight = measuredH,
                                totalHeight = totalHeight,
                                density = density,
                                isRoot = false,
                                bindings = bindings
                            )
                            curY += usedH
                            if (i < count - 1) curY += spacing
                        }
                    }
                }
                if (isRoot) availHeight else boxH
            }

            "HStack" -> {
                val pad = (props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density
                val spacing = (props?.optDouble("spacing", 6.0) ?: 6.0).toFloat() * density
                val bgHex = props?.optString("backgroundColor", "") ?: ""
                val radius = (props?.optDouble("borderRadius", 8.0) ?: 8.0).toFloat() * density
                val rowH = measureNodeHeight(context, node, availWidth, density)

                if (!isRoot && bgHex.isNotEmpty()) {
                    paint.style = Paint.Style.FILL
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
                    val innerH = (rowH - pad * 2).coerceAtLeast(10f)

                    var flexSpacerIndex = -1
                    for (i in 0 until children.length()) {
                        if (isFlexibleSpacer(children.optJSONObject(i))) {
                            flexSpacerIndex = i
                            break
                        }
                    }

                    if (flexSpacerIndex >= 0 && children.length() >= 2) {
                        val rightWidths = mutableMapOf<Int, Float>()
                        for (i in children.length() - 1 downTo flexSpacerIndex + 1) {
                            val c = children.optJSONObject(i) ?: continue
                            rightWidths[i] = measureNodeWidth(context, c, innerW, density)
                        }

                        var curRight = left + availWidth - pad
                        for (i in children.length() - 1 downTo flexSpacerIndex + 1) {
                            val c = children.optJSONObject(i) ?: continue
                            if (c.optString("type") == "Spacer") {
                                val gapW = (c.optJSONObject("props")?.optDouble("minLength", 6.0) ?: 6.0).toFloat() * density
                                curRight -= gapW + spacing
                                continue
                            }
                            val w = rightWidths[i] ?: 0f
                            val childH = measureNodeHeight(context, c, w, density)
                            val childTop = top + pad + ((innerH - childH) / 2f).coerceAtLeast(0f)
                            curRight -= w
                            drawNode(context, canvas, c, curRight, childTop, w, childH, totalHeight, density, false, bindings)
                            curRight -= spacing
                        }

                        val maxLeftAreaW = (curRight - (left + pad)).coerceAtLeast(30f)
                        var curLeft = left + pad
                        for (i in 0 until flexSpacerIndex) {
                            val c = children.optJSONObject(i) ?: continue
                            if (c.optString("type") == "Spacer") {
                                val gapW = (c.optJSONObject("props")?.optDouble("minLength", 6.0) ?: 6.0).toFloat() * density
                                curLeft += gapW + spacing
                                continue
                            }
                            val remainingForLeft = (left + pad + maxLeftAreaW - curLeft).coerceAtLeast(20f)
                            val w = if (i == flexSpacerIndex - 1 && c.optString("type") == "VStack") {
                                remainingForLeft
                            } else {
                                min(remainingForLeft, measureNodeWidth(context, c, maxLeftAreaW, density))
                            }
                            val childH = measureNodeHeight(context, c, w, density)
                            val childTop = top + pad + ((innerH - childH) / 2f).coerceAtLeast(0f)
                            drawNode(context, canvas, c, curLeft, childTop, w, childH, totalHeight, density, false, bindings)
                            curLeft += w + spacing
                        }
                    } else {
                        var curLeft = left + pad
                        for (i in 0 until children.length()) {
                            val c = children.optJSONObject(i) ?: continue
                            if (c.optString("type") == "Spacer") {
                                val gapW = (c.optJSONObject("props")?.optDouble("minLength", 6.0) ?: 6.0).toFloat() * density
                                curLeft += gapW
                                continue
                            }
                            val remainingW = (left + availWidth - pad - curLeft).coerceAtLeast(20f)
                            val w = if (i == children.length() - 1 && c.optString("type") in listOf("VStack", "Progress", "Text")) {
                                remainingW
                            } else {
                                min(remainingW, measureNodeWidth(context, c, innerW, density))
                            }
                            val childH = measureNodeHeight(context, c, w, density)
                            val childTop = top + pad + ((innerH - childH) / 2f).coerceAtLeast(0f)
                            drawNode(context, canvas, c, curLeft, childTop, w, childH, totalHeight, density, false, bindings)
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
                val toggleKey = props?.optString("strikethroughWhenToggled", "") ?: ""
                val isStruck = toggleKey.isNotEmpty() && DynamicWidgetStateStore.isToggled(context, toggleKey)

                paint.color = if (isStruck) Color.parseColor("#94A3B8") else parseHexColor(colorHex, Color.BLACK)
                paint.textSize = fontSize
                paint.isStrikeThruText = isStruck
                paint.typeface = when (weight) {
                    "bold", "heavy" -> Typeface.create("sans-serif", Typeface.BOLD)
                    "semibold", "medium" -> Typeface.create("sans-serif-medium", Typeface.NORMAL)
                    else -> Typeface.create("sans-serif", Typeface.NORMAL)
                }

                val display = ellipsizeText(text, paint, availWidth)
                val fm = paint.fontMetrics
                val textH = fm.descent - fm.ascent
                canvas.drawText(display, left, top - fm.ascent, paint)
                textH + 1.5f * density
            }

            "Timer" -> {
                val formatted = formatTimerString(props)
                val fontSize = (props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density
                val colorHex = props?.optString("color", "#2563EB") ?: "#2563EB"

                paint.color = parseHexColor(colorHex, Color.BLUE)
                paint.textSize = fontSize
                paint.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                val fm = paint.fontMetrics
                canvas.drawText(formatted, left, top - fm.ascent, paint)
                (fm.descent - fm.ascent) + 1.5f * density
            }

            "Progress" -> {
                val style = props?.optString("style", "bar") ?: "bar"
                val value = (props?.optDouble("value", 0.75) ?: 0.75).toFloat().coerceIn(0f, 1f)
                val tintHex = props?.optString("tintColor", "#2563EB") ?: "#2563EB"
                val trackHex = props?.optString("trackColor", "#CBD5E1") ?: "#CBD5E1"
                val pctColorHex = props?.optString("percentageColor", "")?.ifEmpty { tintHex } ?: tintHex
                val showPct = props?.optBoolean("showPercentage", false) ?: false
                val tintColor = parseHexColor(tintHex, Color.BLUE)
                val trackColor = parseHexColor(trackHex, Color.LTGRAY)
                val pctColor = parseHexColor(pctColorHex, tintColor)

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
                            paint.color = pctColor
                            paint.textSize = size * 0.24f
                            paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
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
                        val gap = ((props?.optDouble("segmentSpacing", 5.0) ?: 5.0).toFloat() * density)

                        val pctStr = "${(value * 100).roundToInt()}%"
                        paint.textSize = 11f * density
                        paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                        val pctReserve = if (showPct) paint.measureText(pctStr) + 8f * density else 0f

                        val barTotalW = (availWidth - pctReserve).coerceAtLeast(40f)
                        val segW = (barTotalW - gap * (segments - 1)) / segments
                        val barTop = top + 2f * density

                        for (i in 0 until segments) {
                            val segLeft = left + i * (segW + gap)
                            paint.style = Paint.Style.FILL
                            paint.color = if (i + 1 <= currentSeg) tintColor else trackColor
                            canvas.drawRoundRect(
                                RectF(segLeft, barTop, segLeft + segW, barTop + h),
                                h / 2f,
                                h / 2f,
                                paint
                            )
                        }
                        if (showPct) {
                            paint.color = pctColor
                            paint.textAlign = Paint.Align.RIGHT
                            val fm = paint.fontMetrics
                            val centerY = barTop + h / 2f - (fm.ascent + fm.descent) / 2f
                            canvas.drawText(pctStr, left + availWidth, centerY, paint)
                        }
                        max(h + 4f * density, if (showPct) 13f * density else 0f)
                    }
                    else -> {
                        val h = ((props?.optDouble("height", 8.0) ?: 8.0).toFloat() * density)
                        val pctStr = "${(value * 100).roundToInt()}%"
                        paint.textSize = 11f * density
                        paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                        val pctReserve = if (showPct) paint.measureText(pctStr) + 8f * density else 0f

                        val barW = (availWidth - pctReserve).coerceAtLeast(40f)
                        val barTop = top + 2f * density
                        paint.style = Paint.Style.FILL
                        paint.color = trackColor
                        canvas.drawRoundRect(
                            RectF(left, barTop, left + barW, barTop + h),
                            h / 2f,
                            h / 2f,
                            paint
                        )
                        paint.color = tintColor
                        canvas.drawRoundRect(
                            RectF(left, barTop, left + barW * value, barTop + h),
                            h / 2f,
                            h / 2f,
                            paint
                        )
                        if (showPct) {
                            paint.color = pctColor
                            paint.textAlign = Paint.Align.RIGHT
                            val fm = paint.fontMetrics
                            val centerY = barTop + h / 2f - (fm.ascent + fm.descent) / 2f
                            canvas.drawText(pctStr, left + availWidth, centerY, paint)
                        }
                        max(h + 4f * density, if (showPct) 13f * density else 0f)
                    }
                }
            }

            "Image" -> {
                val w = ((props?.optDouble("width", 32.0) ?: 32.0).toFloat() * density)
                val h = ((props?.optDouble("height", 32.0) ?: 32.0).toFloat() * density)
                val rawRadius = props?.optDouble("cornerRadius", -1.0)?.takeIf { it >= 0 }
                    ?: props?.optDouble("borderRadius", 8.0) ?: 8.0
                val radius = min(w / 2f, (rawRadius.toFloat() * density))
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
                h + 1.5f * density
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
                    props?.optString("checkedBackgroundColor", "")
                        ?.ifEmpty { props.optString("activeBackgroundColor", "") }
                        ?.ifEmpty { props.optString("backgroundColor", "#2563EB") }
                        ?: "#DCFCE7"
                } else {
                    props?.optString("backgroundColor", "#2563EB") ?: "#2563EB"
                }

                val textHex = if (isToggled) {
                    props?.optString("checkedTextColor", "")
                        ?.ifEmpty { props.optString("activeColor", "") }
                        ?.ifEmpty { props.optString("textColor", "") }
                        ?.ifEmpty { props.optString("color", "#FFFFFF") }
                        ?: "#15803D"
                } else {
                    props?.optString("textColor", "")
                        ?.ifEmpty { props.optString("color", "#FFFFFF") }
                        ?: "#FFFFFF"
                }

                val fontSize = ((props?.optDouble("fontSize", 11.0) ?: 11.0).toFloat() * density)
                val padH = ((props?.optDouble("paddingHorizontal", 10.0) ?: 10.0).toFloat() * density)
                val padV = ((props?.optDouble("paddingVertical", 5.5) ?: 5.5).toFloat() * density)
                val radius = ((props?.optDouble("borderRadius", 8.0) ?: 8.0).toFloat() * density)
                val fullWidth = props?.optBoolean("fullWidth", false) ?: false

                paint.textSize = fontSize
                paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
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
                if (fullWidth && !actionId.startsWith("toggle:")) {
                    paint.textAlign = Paint.Align.CENTER
                    canvas.drawText(display, left + btnW / 2f, textY, paint)
                } else {
                    paint.textAlign = Paint.Align.LEFT
                    canvas.drawText(display, left + padH, textY, paint)
                }

                if (actionId.isNotEmpty() || !deepLink.isNullOrEmpty()) {
                    val zone = when {
                        top < totalHeight * 0.25f -> "top"
                        top > totalHeight * 0.76f -> "bot"
                        else -> "mid"
                    }
                    bindings.add(ButtonActionBinding(actionId = actionId, deepLink = deepLink, zone = zone))
                }
                btnH + 1.5f * density
            }

            else -> 0f
        }
    }

    private fun formatTimerString(props: JSONObject?): String {
        val targetTs = props?.optDouble("targetTimestamp", 0.0) ?: 0.0
        val showsHours = props?.optBoolean("showsHours", true) ?: true
        val diffSec = abs(targetTs - System.currentTimeMillis() / 1000.0).toLong()
        val hrs = diffSec / 3600
        val mins = (diffSec % 3600) / 60
        val secs = diffSec % 60
        return if (showsHours && hrs > 0) {
            String.format(Locale.US, "%d:%02d:%02d", hrs, mins, secs)
        } else {
            String.format(Locale.US, "%02d:%02d", mins, secs)
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
                    val count = children.length()
                    for (i in 0 until count) {
                        val c = children.optJSONObject(i) ?: continue
                        h += measureNodeHeight(context, c, (availWidth - pad * 2).coerceAtLeast(10f), density)
                        if (i < count - 1) h += spacing
                    }
                }
                h
            }
            "HStack" -> {
                val pad = ((props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density)
                val children = node.optJSONArray("children")
                var maxChildH = 16f * density
                if (children != null) {
                    for (i in 0 until children.length()) {
                        val c = children.optJSONObject(i) ?: continue
                        if (c.optString("type") == "Spacer") continue
                        maxChildH = max(maxChildH, measureNodeHeight(context, c, availWidth, density))
                    }
                }
                maxChildH + pad * 2
            }
            "Text", "Timer" -> {
                val fs = ((props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density)
                fs * 1.32f + 1.5f * density
            }
            "Progress" -> {
                val style = props?.optString("style", "bar") ?: "bar"
                val showPct = props?.optBoolean("showPercentage", false) ?: false
                if (style == "circular") {
                    ((props?.optDouble("height", 52.0) ?: 52.0).toFloat() * density) + 2f * density
                } else {
                    val barH = ((props?.optDouble("height", 8.0) ?: 8.0).toFloat() * density) + 4f * density
                    max(barH, if (showPct) 13f * density else 0f)
                }
            }
            "Image" -> ((props?.optDouble("height", 32.0) ?: 32.0).toFloat() * density) + 1.5f * density
            "Button" -> {
                val fs = ((props?.optDouble("fontSize", 11.0) ?: 11.0).toFloat() * density)
                val padV = ((props?.optDouble("paddingVertical", 5.5) ?: 5.5).toFloat() * density)
                fs + padV * 2 + 1.5f * density
            }
            "Spacer" -> ((props?.optDouble("minLength", 4.0) ?: 4.0).toFloat() * density)
            else -> 0f
        }
    }

    private fun measureNodeWidth(context: Context, node: JSONObject, availWidth: Float, density: Float): Float {
        val type = node.optString("type", "")
        val props = node.optJSONObject("props")
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG)
        return when (type) {
            "Text" -> {
                val text = props?.optString("text", "") ?: ""
                val fs = ((props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density)
                paint.textSize = fs
                paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                min(availWidth, paint.measureText(text) + 2f * density)
            }
            "Timer" -> {
                val formatted = formatTimerString(props)
                val fs = ((props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density)
                paint.textSize = fs
                paint.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                paint.measureText(formatted) + 2f * density
            }
            "Image" -> ((props?.optDouble("width", 32.0) ?: 32.0).toFloat() * density)
            "Progress" -> {
                val style = props?.optString("style", "bar") ?: "bar"
                if (style == "circular") {
                    ((props?.optDouble("height", 52.0) ?: 52.0).toFloat() * density)
                } else availWidth * 0.55f
            }
            "Button" -> {
                val title = props?.optString("title", "Button") ?: "Button"
                val fs = ((props?.optDouble("fontSize", 11.0) ?: 11.0).toFloat() * density)
                val padH = ((props?.optDouble("paddingHorizontal", 10.0) ?: 10.0).toFloat() * density)
                paint.textSize = fs
                paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                paint.measureText(title) + padH * 2
            }
            "Spacer" -> ((props?.optDouble("minLength", 4.0) ?: 4.0).toFloat() * density)
            "VStack" -> {
                val pad = ((props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density)
                val children = node.optJSONArray("children")
                var maxW = 40f * density
                if (children != null) {
                    for (i in 0 until children.length()) {
                        val c = children.optJSONObject(i) ?: continue
                        maxW = max(maxW, measureNodeWidth(context, c, availWidth - pad * 2, density))
                    }
                }
                min(availWidth * 0.78f, maxW + pad * 2)
            }
            "HStack" -> {
                val pad = ((props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density)
                val spacing = ((props?.optDouble("spacing", 6.0) ?: 6.0).toFloat() * density)
                val children = node.optJSONArray("children")
                var totalW = pad * 2
                if (children != null) {
                    for (i in 0 until children.length()) {
                        val c = children.optJSONObject(i) ?: continue
                        totalW += measureNodeWidth(context, c, availWidth, density)
                        if (i < children.length() - 1) totalW += spacing
                    }
                }
                min(availWidth, totalW)
            }
            else -> availWidth * 0.5f
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

