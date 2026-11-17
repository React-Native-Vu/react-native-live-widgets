package com.reactnativeliveactivity

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.SystemClock
import org.json.JSONObject
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

data class WidgetTimerInfo(
    val baseMillis: Long,
    val isCountDown: Boolean,
    val leftPx: Int,
    val topPx: Int,
    val fontSizePx: Float,
    val color: Int
)

data class ButtonActionBinding(
    val actionId: String,
    val deepLink: String?,
    val zone: String = "mid", // "top", "mid", "bot"
    val xFraction: Float = 0.5f,
    val yFraction: Float = 0.5f,
    val widthFraction: Float = 1.0f,
    val title: String = "",
    val accessibilityLabel: String? = null,
    val accessibilityHint: String? = null,
    val leftFraction: Float = 0f,
    val rightFraction: Float = 1f,
    val topFraction: Float = 0f,
    val bottomFraction: Float = 1f
)

object DynamicWidgetCanvasRenderer {
    var activeTimerInfo: WidgetTimerInfo? = null

    private fun isFlexibleSpacer(node: JSONObject?): Boolean {
        if (node == null || node.optString("type") != "Spacer") return false
        val props = node.optJSONObject("props") ?: return true
        return !props.has("minLength")
    }

    /**
     * ♿ Trích xuất bản tóm tắt Trợ năng (Accessibility Summary) từ cây JSON DSL.
     * Cho phép TalkBack của Android đọc đầy đủ các nhãn, con số, trạng thái và nút bấm
     * ngay cả khi toàn bộ giao diện đang được render bằng Canvas 2D Bitmap.
     */
    fun extractAccessibilitySummary(node: JSONObject?): String {
        if (node == null) return ""
        val parts = mutableListOf<String>()
        traverseAccessibility(node, parts)
        return parts.distinct().joinToString(". ")
    }

    private fun traverseAccessibility(node: JSONObject, parts: MutableList<String>) {
        val props = node.optJSONObject("props")
        val accessible = props?.optBoolean("accessible", true) ?: true
        if (!accessible) return

        val customLabel = props?.optString("accessibilityLabel", "")?.trim() ?: ""
        val customValue = props?.optString("accessibilityValue", "")?.trim() ?: ""
        val customHint = props?.optString("accessibilityHint", "")?.trim() ?: ""

        val type = node.optString("type")
        when (type) {
            "Text" -> {
                val text = props?.optString("text", "")?.trim() ?: ""
                val content = when {
                    customLabel.isNotEmpty() -> customLabel
                    text.isNotEmpty() -> text
                    else -> ""
                }
                if (content.isNotEmpty()) parts.add(content)
            }
            "Button" -> {
                val title = props?.optString("title", "")?.trim() ?: ""
                val btnName = if (customLabel.isNotEmpty()) customLabel else title
                val fullBtn = if (customHint.isNotEmpty()) "Nút $btnName, $customHint" else "Nút $btnName"
                if (btnName.isNotEmpty()) parts.add(fullBtn)
            }
            "Progress" -> {
                val label = if (customLabel.isNotEmpty()) customLabel else "Tiến độ"
                val value = when {
                    customValue.isNotEmpty() -> customValue
                    props != null && props.has("value") -> "${(props.optDouble("value", 0.0) * 100).toInt()}%"
                    else -> ""
                }
                parts.add(if (value.isNotEmpty()) "$label $value" else label)
            }
            "Gauge" -> {
                val label = if (customLabel.isNotEmpty()) customLabel else (props?.optString("label", "")?.trim() ?: "Chỉ số")
                val valText = props?.optString("valueText", "")?.trim() ?: ""
                val value = when {
                    customValue.isNotEmpty() -> customValue
                    valText.isNotEmpty() -> valText
                    props != null && props.has("value") -> "${(props.optDouble("value", 0.0) * 100).toInt()}%"
                    else -> ""
                }
                parts.add(if (value.isNotEmpty()) "$label: $value" else label)
            }
            "Timer" -> {
                val label = if (customLabel.isNotEmpty()) customLabel else "Đồng hồ"
                parts.add(label)
            }
            "Badge" -> {
                val text = props?.optString("text", "")?.trim() ?: ""
                val label = if (customLabel.isNotEmpty()) customLabel else text
                if (label.isNotEmpty()) parts.add(label)
            }
            "Toggle" -> {
                val label = props?.optString("label", "")?.trim() ?: ""
                val isChecked = props?.optBoolean("isChecked", false) ?: false
                val desc = if (customLabel.isNotEmpty()) customLabel else label
                if (desc.isNotEmpty()) {
                    parts.add("$desc: " + if (isChecked) "Đã chọn" else "Chưa chọn")
                }
            }
            "Image" -> {
                if (customLabel.isNotEmpty()) {
                    parts.add("Ảnh $customLabel")
                }
            }
            else -> {
                if (customLabel.isNotEmpty()) {
                    parts.add(customLabel)
                }
            }
        }

        val children = node.optJSONArray("children")
        if (children != null) {
            for (i in 0 until children.length()) {
                val child = children.optJSONObject(i)
                if (child != null) {
                    traverseAccessibility(child, parts)
                }
            }
        }
    }

    /**
     * ⚡ [Phase 5 Optimization] Kết xuất Sub-Bitmap cục bộ chỉ cho thành phần đồ họa cụ thể
     * (Gauge, Equalizer, Circular Progress) thay vì vẽ cả một Bitmap khổng lồ toàn màn hình.
     * Tiết kiệm >90% dung lượng RAM và tránh lỗi TransactionTooLargeException của Android IPC Binder.
     */
    fun renderSubNodeBitmap(
        context: Context,
        node: JSONObject,
        widthPx: Int,
        heightPx: Int,
        density: Float
    ): Bitmap {
        val bmp = Bitmap.createBitmap(
            widthPx.coerceAtLeast(1),
            heightPx.coerceAtLeast(1),
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(bmp)
        val bindings = mutableListOf<ButtonActionBinding>()
        drawNode(
            context = context,
            canvas = canvas,
            node = node,
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

    fun renderWidgetBitmap(
        context: Context,
        rootNode: JSONObject?,
        widthPx: Int,
        heightPx: Int,
        baseDensity: Float,
        family: String,
        bindings: MutableList<ButtonActionBinding>
    ): Bitmap {
        activeTimerInfo = null
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
            ((heightPx * 0.95f) / naturalH).coerceIn(0.55f, 1.0f)
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
                val boxH = if (isRoot) max(availHeight, measuredH) else (measuredH + 2f * density)

                if (!isRoot && (bgHex.isNotEmpty() || props?.has("gradient") == true)) {
                    val rect = RectF(left, top, left + availWidth, top + boxH)
                    val gradShader = createLinearGradient(props?.optJSONObject("gradient"), rect)
                    paint.style = Paint.Style.FILL
                    if (gradShader != null) {
                        paint.shader = gradShader
                    } else {
                        paint.color = parseDynamicColor(props?.opt("backgroundColor") ?: bgHex, Color.TRANSPARENT)
                    }

                    val shadowColor = props?.optString("shadowColor", "")
                    val shadowRad = (props?.optDouble("shadowRadius", 0.0) ?: 0.0).toFloat() * density
                    if (!shadowColor.isNullOrEmpty() && shadowRad > 0f) {
                        val sOff = props?.optJSONObject("shadowOffset")
                        val sx = (sOff?.optDouble("x", 0.0) ?: 0.0).toFloat() * density
                        val sy = (sOff?.optDouble("y", 2.0) ?: 2.0).toFloat() * density
                        paint.setShadowLayer(shadowRad, sx, sy, parseHexColor(shadowColor, Color.BLACK))
                    }

                    canvas.drawRoundRect(rect, radius, radius, paint)
                    paint.clearShadowLayer()
                    paint.shader = null

                    if (borderW > 0f && borderHex.isNotEmpty()) {
                        paint.style = Paint.Style.STROKE
                        paint.strokeWidth = borderW
                        paint.color = parseHexColor(borderHex, Color.LTGRAY)
                        val borderStyle = props?.optString("borderStyle", "solid")
                        if (borderStyle == "dashed") {
                            paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(12f * density, 8f * density), 0f)
                        } else if (borderStyle == "dotted") {
                            paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(4f * density, 6f * density), 0f)
                        }
                        canvas.drawRoundRect(rect, radius, radius, paint)
                        paint.pathEffect = null
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
                        var fullWidthCount = 0
                        for (i in 0 until children.length()) {
                            val c = children.optJSONObject(i) ?: continue
                            if (c.optJSONObject("props")?.optBoolean("fullWidth", false) == true) {
                                fullWidthCount++
                            }
                        }

                        val justify = props?.optString("justifyContent", "") ?: ""
                        if (fullWidthCount > 0) {
                            var fixedW = 0f
                            for (i in 0 until children.length()) {
                                val c = children.optJSONObject(i) ?: continue
                                if (c.optString("type") == "Spacer") {
                                    fixedW += (c.optJSONObject("props")?.optDouble("minLength", 6.0) ?: 6.0).toFloat() * density
                                } else if (c.optJSONObject("props")?.optBoolean("fullWidth", false) != true) {
                                    fixedW += measureNodeWidth(context, c, innerW, density)
                                }
                            }
                            val totalSpacing = spacing * (children.length() - 1).coerceAtLeast(0)
                            val fullWidthW = ((innerW - fixedW - totalSpacing) / fullWidthCount).coerceAtLeast(30f)

                            var curLeft = left + pad
                            for (i in 0 until children.length()) {
                                val c = children.optJSONObject(i) ?: continue
                                if (c.optString("type") == "Spacer") {
                                    val gapW = (c.optJSONObject("props")?.optDouble("minLength", 6.0) ?: 6.0).toFloat() * density
                                    curLeft += gapW + spacing
                                    continue
                                }
                                val isFull = c.optJSONObject("props")?.optBoolean("fullWidth", false) == true
                                val w = if (isFull) fullWidthW else measureNodeWidth(context, c, innerW, density)
                                val childH = measureNodeHeight(context, c, w, density)
                                val childTop = top + pad + ((innerH - childH) / 2f).coerceAtLeast(0f)
                                drawNode(context, canvas, c, curLeft, childTop, w, childH, totalHeight, density, false, bindings)
                                curLeft += w + spacing
                            }
                        } else if (justify in listOf("spaceBetween", "spaceAround") && children.length() == 2) {
                            val c0 = children.optJSONObject(0)
                            val c1 = children.optJSONObject(1)
                            if (c0 != null && c1 != null) {
                                val w1 = min(innerW * 0.72f, measureNodeWidth(context, c1, innerW, density))
                                val h1 = measureNodeHeight(context, c1, w1, density)
                                val top1 = top + pad + ((innerH - h1) / 2f).coerceAtLeast(0f)
                                val rightLeft = left + availWidth - pad - w1
                                drawNode(context, canvas, c1, rightLeft, top1, w1, h1, totalHeight, density, false, bindings)

                                val maxLeftAreaW = (rightLeft - spacing - (left + pad)).coerceAtLeast(30f)
                                val w0 = if (c0.optString("type") == "VStack") {
                                    maxLeftAreaW
                                } else {
                                    min(maxLeftAreaW, measureNodeWidth(context, c0, maxLeftAreaW, density))
                                }
                                val h0 = measureNodeHeight(context, c0, w0, density)
                                val top0 = top + pad + ((innerH - h0) / 2f).coerceAtLeast(0f)
                                drawNode(context, canvas, c0, left + pad, top0, w0, h0, totalHeight, density, false, bindings)
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
                }
                rowH
            }

            "Text" -> {
                val text = props?.optString("text", "") ?: ""
                val fontScale = context.resources.configuration.fontScale
                val dynamicType = props?.optBoolean("dynamicType", true) ?: true
                val effectiveScale = if (dynamicType) fontScale else 1.0f

                var fontSize = (props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density * effectiveScale
                var weight = props?.optString("fontWeight", "regular") ?: "regular"

                val typo = props?.optString("typography", "")
                if (!typo.isNullOrEmpty()) {
                    when (typo) {
                        "largeTitle" -> { fontSize = 34f * density * effectiveScale; weight = "bold" }
                        "title1", "title" -> { fontSize = 28f * density * effectiveScale; weight = "bold" }
                        "title2" -> { fontSize = 22f * density * effectiveScale; weight = "bold" }
                        "title3" -> { fontSize = 20f * density * effectiveScale; weight = "semibold" }
                        "headline" -> { fontSize = 17f * density * effectiveScale; weight = "semibold" }
                        "subheadline" -> { fontSize = 15f * density * effectiveScale }
                        "body" -> { fontSize = 17f * density * effectiveScale }
                        "callout" -> { fontSize = 16f * density * effectiveScale }
                        "footnote" -> { fontSize = 13f * density * effectiveScale }
                        "caption1", "caption" -> { fontSize = 12f * density * effectiveScale }
                        "caption2" -> { fontSize = 11f * density * effectiveScale }
                    }
                }

                val colorHex = props?.optString("color", "#0F172A") ?: "#0F172A"
                val toggleKey = props?.optString("strikethroughWhenToggled", "") ?: ""
                val isStruck = toggleKey.isNotEmpty() && DynamicWidgetStateStore.isToggled(context, toggleKey)

                paint.color = if (isStruck) Color.parseColor("#94A3B8") else parseDynamicColor(props?.opt("color") ?: colorHex, Color.BLACK)
                paint.textSize = fontSize
                paint.isStrikeThruText = isStruck

                val fontDesign = props?.optString("fontDesign", "default")
                if (fontDesign == "monospaced") {
                    paint.typeface = Typeface.create(Typeface.MONOSPACE, if (weight == "bold" || weight == "heavy") Typeface.BOLD else Typeface.NORMAL)
                } else {
                    paint.typeface = when (weight) {
                        "bold", "heavy" -> Typeface.create("sans-serif", Typeface.BOLD)
                        "semibold", "medium" -> Typeface.create("sans-serif-medium", Typeface.NORMAL)
                        else -> Typeface.create("sans-serif", Typeface.NORMAL)
                    }
                }

                val shadowColor = props?.optString("shadowColor", "")
                val shadowRad = (props?.optDouble("shadowRadius", 0.0) ?: 0.0).toFloat() * density
                if (!shadowColor.isNullOrEmpty() && shadowRad > 0f) {
                    val sOff = props?.optJSONObject("shadowOffset")
                    val sx = (sOff?.optDouble("x", 0.0) ?: 0.0).toFloat() * density
                    val sy = (sOff?.optDouble("y", 1.0) ?: 1.0).toFloat() * density
                    paint.setShadowLayer(shadowRad, sx, sy, parseHexColor(shadowColor, Color.BLACK))
                }

                val display = ellipsizeText(text, paint, availWidth)
                val fm = paint.fontMetrics
                val textH = fm.descent - fm.ascent
                if (props?.optBoolean("redacted", false) == true) {
                    val redW = min(availWidth, paint.measureText(display).coerceAtLeast(24f * density))
                    val c = paint.color
                    paint.style = Paint.Style.FILL
                    paint.color = Color.argb(95, Color.red(c), Color.green(c), Color.blue(c))
                    val rr = 4f * density
                    canvas.drawRoundRect(
                        RectF(left, top + textH * 0.14f, left + redW, top + textH * 0.86f),
                        rr,
                        rr,
                        paint
                    )
                } else {
                    canvas.drawText(display, left, top - fm.ascent, paint)
                }
                paint.clearShadowLayer()
                textH + 1.5f * density
            }

            "Timer" -> {
                val targetTs = props?.optDouble("targetTimestamp", 0.0) ?: 0.0
                val fontSize = (props?.optDouble("fontSize", 13.0) ?: 13.0).toFloat() * density
                val colorHex = props?.optString("color", "#2563EB") ?: "#2563EB"
                val tintColor = parseHexColor(colorHex, Color.BLUE)

                paint.color = tintColor
                paint.textSize = fontSize
                paint.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                val fm = paint.fontMetrics
                val formatted = formatTimerString(props)
                val textH = (fm.descent - fm.ascent) + 1.5f * density

                if (targetTs > 0.0) {
                    val targetEpochMillis = (targetTs * 1000.0).toLong()
                    val remainingMillis = targetEpochMillis - System.currentTimeMillis()
                    val baseMillis = SystemClock.elapsedRealtime() + remainingMillis
                    val isCountdown = props?.optString("mode", "countdown") != "timer"

                    activeTimerInfo = WidgetTimerInfo(
                        baseMillis = baseMillis,
                        isCountDown = isCountdown,
                        leftPx = left.roundToInt(),
                        topPx = top.roundToInt(),
                        fontSizePx = fontSize,
                        color = tintColor
                    )
                } else {
                    canvas.drawText(formatted, left, top - fm.ascent, paint)
                }
                textH
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
                    val canvasW = canvas.width.toFloat().coerceAtLeast(1f)
                    val canvasH = canvas.height.toFloat().coerceAtLeast(1f)
                    val zone = when {
                        top < canvasH * 0.17f -> "top"
                        top > canvasH * 0.80f -> "bot"
                        else -> "mid"
                    }
                    val lF = (left / canvasW).coerceIn(0f, 1f)
                    val rF = ((left + btnW) / canvasW).coerceIn(0f, 1f)
                    val tF = (top / canvasH).coerceIn(0f, 1f)
                    val bF = ((top + btnH) / canvasH).coerceIn(0f, 1f)
                    val xF = ((lF + rF) / 2f).coerceIn(0f, 1f)
                    val yF = ((tF + bF) / 2f).coerceIn(0f, 1f)
                    val wF = (rF - lF).coerceIn(0.05f, 1f)
                    bindings.add(
                        ButtonActionBinding(
                            actionId = actionId,
                            deepLink = deepLink,
                            zone = zone,
                            xFraction = xF,
                            yFraction = yF,
                            widthFraction = if (fullWidth) 1.0f else wF,
                            title = displayTitle,
                            accessibilityLabel = props?.optString("accessibilityLabel", "")?.takeIf { it.isNotEmpty() },
                            accessibilityHint = props?.optString("accessibilityHint", "")?.takeIf { it.isNotEmpty() },
                            leftFraction = lF,
                            rightFraction = rF,
                            topFraction = tF,
                            bottomFraction = bF
                        )
                    )
                }
                btnH + 1.5f * density
            }

            "ZStack" -> {
                val pad = (props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density
                val bgHex = props?.optString("backgroundColor", "") ?: ""
                val radius = (props?.optDouble("borderRadius", 10.0) ?: 10.0).toFloat() * density
                val boxH = measureNodeHeight(context, node, availWidth, density)

                if (!isRoot && bgHex.isNotEmpty()) {
                    paint.style = Paint.Style.FILL
                    paint.color = parseHexColor(bgHex, Color.TRANSPARENT)
                    canvas.drawRoundRect(RectF(left, top, left + availWidth, top + boxH), radius, radius, paint)
                }

                val children = node.optJSONArray("children")
                if (children != null) {
                    val innerW = (availWidth - pad * 2).coerceAtLeast(10f)
                    val innerH = (boxH - pad * 2).coerceAtLeast(10f)
                    for (i in 0 until children.length()) {
                        val child = children.optJSONObject(i) ?: continue
                        val childH = measureNodeHeight(context, child, innerW, density)
                        drawNode(context, canvas, child, left + pad, top + pad, innerW, childH.coerceAtMost(innerH), totalHeight, density, false, bindings)
                    }
                }
                boxH
            }

            "Grid" -> {
                val pad = (props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density
                val cols = (props?.optInt("columns", 2) ?: 2).coerceAtLeast(1)
                val colSpacing = ((props?.optDouble("columnSpacing", props.optDouble("spacing", 8.0)) ?: 8.0).toFloat() * density)
                val rowSpacing = ((props?.optDouble("rowSpacing", props.optDouble("spacing", 8.0)) ?: 8.0).toFloat() * density)
                val bgHex = props?.optString("backgroundColor", "") ?: ""
                val radius = (props?.optDouble("borderRadius", 10.0) ?: 10.0).toFloat() * density
                val gridH = measureNodeHeight(context, node, availWidth, density)

                if (!isRoot && bgHex.isNotEmpty()) {
                    paint.style = Paint.Style.FILL
                    paint.color = parseHexColor(bgHex, Color.TRANSPARENT)
                    canvas.drawRoundRect(RectF(left, top, left + availWidth, top + gridH), radius, radius, paint)
                }

                val children = node.optJSONArray("children")
                var curY = top + pad
                if (children != null && children.length() > 0) {
                    val innerW = (availWidth - pad * 2).coerceAtLeast(20f)
                    val cellW = ((innerW - colSpacing * (cols - 1)) / cols).coerceAtLeast(10f)
                    val rows = (children.length() + cols - 1) / cols

                    for (r in 0 until rows) {
                        var rowMaxH = 0f
                        for (c in 0 until cols) {
                            val idx = r * cols + c
                            if (idx >= children.length()) break
                            val child = children.optJSONObject(idx) ?: continue
                            val cellLeft = left + pad + c * (cellW + colSpacing)
                            val childH = measureNodeHeight(context, child, cellW, density)
                            drawNode(context, canvas, child, cellLeft, curY, cellW, childH, totalHeight, density, false, bindings)
                            rowMaxH = max(rowMaxH, childH)
                        }
                        curY += rowMaxH
                        if (r < rows - 1) curY += rowSpacing
                    }
                }
                gridH
            }

            "Divider" -> {
                val colorHex = props?.optString("color", "#CBD5E1") ?: "#CBD5E1"
                val thickness = ((props?.optDouble("thickness", 1.0) ?: 1.0).toFloat() * density).coerceAtLeast(1f)
                val marginV = ((props?.optDouble("marginVertical", 3.0) ?: 3.0).toFloat() * density)
                val marginH = ((props?.optDouble("marginHorizontal", 0.0) ?: 0.0).toFloat() * density)
                paint.style = Paint.Style.FILL
                paint.color = parseHexColor(colorHex, Color.LTGRAY)
                val y = top + marginV
                canvas.drawRect(left + marginH, y, left + availWidth - marginH, y + thickness, paint)
                thickness + marginV * 2
            }

            "Gauge" -> {
                val value = (props?.optDouble("value", 0.75) ?: 0.75).toFloat().coerceIn(0f, 1f)
                val size = ((props?.optDouble("size", 64.0) ?: 64.0).toFloat() * density)
                val strokeW = ((props?.optDouble("strokeWidth", (size / density * 0.11).coerceAtLeast(4.0)) ?: 6.0).toFloat() * density)
                val tintHex = props?.optString("tintColor", "#2563EB") ?: "#2563EB"
                val trackHex = props?.optString("trackColor", "#CBD5E1") ?: "#CBD5E1"
                val textHex = props?.optString("textColor", "")?.ifEmpty { tintHex } ?: tintHex
                val labelHex = props?.optString("labelColor", "#64748B") ?: "#64748B"
                val valueText = props?.optString("valueText", "${(value * 100).roundToInt()}%") ?: "${(value * 100).roundToInt()}%"
                val label = props?.optString("label", "") ?: ""

                val arcRect = RectF(
                    left + strokeW,
                    top + strokeW,
                    left + size - strokeW,
                    top + size - strokeW
                )
                paint.style = Paint.Style.STROKE
                paint.strokeWidth = strokeW
                paint.strokeCap = Paint.Cap.ROUND
                paint.color = parseHexColor(trackHex, Color.LTGRAY)
                canvas.drawArc(arcRect, 146f, 248f, false, paint)

                paint.color = parseHexColor(tintHex, Color.BLUE)
                canvas.drawArc(arcRect, 146f, 248f * value, false, paint)

                paint.style = Paint.Style.FILL
                paint.color = parseHexColor(textHex, Color.BLACK)
                paint.textSize = size * 0.23f
                paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                paint.textAlign = Paint.Align.CENTER
                val fm = paint.fontMetrics
                val centerY = top + size * 0.50f - (fm.ascent + fm.descent) / 2f
                canvas.drawText(valueText, left + size / 2f, centerY, paint)

                if (label.isNotEmpty()) {
                    paint.color = parseHexColor(labelHex, Color.GRAY)
                    paint.textSize = size * 0.15f
                    paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                    canvas.drawText(label, left + size / 2f, top + size * 0.84f, paint)
                }
                size + 2f * density
            }

            "Chart" -> {
                val style = props?.optString("style", "bar") ?: "bar"
                val valuesArr = props?.optJSONArray("values")
                val labelsArr = props?.optJSONArray("labels")
                val chartH = ((props?.optDouble("height", 52.0) ?: 52.0).toFloat() * density)
                val tintHex = props?.optString("tintColor", "#2563EB") ?: "#2563EB"
                val secondaryHex = props?.optString("secondaryColor", "") ?: ""
                val labelHex = props?.optString("labelColor", "#64748B") ?: "#64748B"
                val tintColor = parseHexColor(tintHex, Color.BLUE)
                val secondaryColor = if (secondaryHex.isNotEmpty()) {
                    parseHexColor(secondaryHex, Color.LTGRAY)
                } else {
                    Color.argb(65, Color.red(tintColor), Color.green(tintColor), Color.blue(tintColor))
                }

                val values = mutableListOf<Float>()
                if (valuesArr != null) {
                    for (i in 0 until valuesArr.length()) {
                        values.add(valuesArr.optDouble(i, 0.0).toFloat())
                    }
                }
                val maxVal = (values.maxOrNull() ?: 1f).coerceAtLeast(0.001f)

                if (values.isNotEmpty()) {
                    if (style == "line" && values.size >= 2) {
                        val stepX = availWidth / (values.size - 1).coerceAtLeast(1)
                        val linePath = Path()
                        val fillPath = Path()
                        fillPath.moveTo(left, top + chartH)

                        for (i in values.indices) {
                            val px = left + i * stepX
                            val py = top + chartH - (values[i].coerceAtLeast(0f) / maxVal) * (chartH - 6f * density) - 3f * density
                            if (i == 0) linePath.moveTo(px, py) else linePath.lineTo(px, py)
                            fillPath.lineTo(px, py)
                        }
                        fillPath.lineTo(left + availWidth, top + chartH)
                        fillPath.close()

                        paint.style = Paint.Style.FILL
                        paint.color = secondaryColor
                        canvas.drawPath(fillPath, paint)

                        paint.style = Paint.Style.STROKE
                        paint.strokeWidth = 2.2f * density
                        paint.strokeCap = Paint.Cap.ROUND
                        paint.color = tintColor
                        canvas.drawPath(linePath, paint)
                    } else {
                        val gap = 6f * density
                        val barW = ((availWidth - gap * (values.size - 1)) / values.size).coerceAtLeast(4f)
                        paint.style = Paint.Style.FILL
                        for (i in values.indices) {
                            val ratio = (values[i] / maxVal).coerceIn(0.08f, 1f)
                            val bH = chartH * ratio
                            val bLeft = left + i * (barW + gap)
                            val bTop = top + chartH - bH
                            paint.color = if (i == values.size - 1) tintColor else secondaryColor
                            canvas.drawRoundRect(
                                RectF(bLeft, bTop, bLeft + barW, top + chartH),
                                4f * density,
                                4f * density,
                                paint
                            )
                        }
                    }
                }

                var labelExtraH = 0f
                if (labelsArr != null && labelsArr.length() > 0 && values.isNotEmpty()) {
                    val count = min(labelsArr.length(), values.size)
                    val colW = availWidth / values.size
                    paint.style = Paint.Style.FILL
                    paint.color = parseHexColor(labelHex, Color.GRAY)
                    paint.textSize = 9f * density
                    paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                    paint.textAlign = Paint.Align.CENTER
                    val labelY = top + chartH + 11f * density
                    for (i in 0 until count) {
                        val lbl = labelsArr.optString(i, "")
                        canvas.drawText(lbl, left + colW * i + colW / 2f, labelY, paint)
                    }
                    labelExtraH = 14f * density
                }
                chartH + labelExtraH + 2f * density
            }

            "Toggle" -> {
                val rawActionId = props?.optString("actionId", "toggle:default") ?: "toggle:default"
                val normalizedActionId = if (rawActionId.startsWith("toggle:")) rawActionId else "toggle:$rawActionId"
                val key = normalizedActionId.removePrefix("toggle:")
                val defaultChecked = (props?.optBoolean("checked", false) == true) || (props?.optBoolean("isChecked", false) == true)
                val isChecked = DynamicWidgetStateStore.isToggled(context, key, defaultChecked)
                val label = props?.optString("label", "") ?: ""
                val style = props?.optString("style", "checkbox") ?: "checkbox"
                val tintHex = props?.optString("tintColor", "#10B981") ?: "#10B981"
                val textHex = props?.optString("textColor", "#0F172A") ?: "#0F172A"
                val checkedTextHex = props?.optString("checkedTextColor", "#64748B") ?: "#64748B"
                val fontSize = ((props?.optDouble("fontSize", 12.0) ?: 12.0).toFloat() * density)
                val strike = props?.optBoolean("strikethroughOnCheck", true) ?: true
                val rowH = fontSize * 1.55f

                val tintColor = parseHexColor(tintHex, Color.GREEN)
                var textStartLeft = left

                if (style == "switch") {
                    val swW = 30f * density
                    val swH = 16f * density
                    val swTop = top + (rowH - swH) / 2f
                    paint.style = Paint.Style.FILL
                    paint.color = if (isChecked) tintColor else Color.parseColor("#CBD5E1")
                    canvas.drawRoundRect(RectF(left, swTop, left + swW, swTop + swH), swH / 2f, swH / 2f, paint)

                    paint.color = Color.WHITE
                    val knobR = 6f * density
                    val knobCx = if (isChecked) left + swW - knobR - 2f * density else left + knobR + 2f * density
                    canvas.drawCircle(knobCx, swTop + swH / 2f, knobR, paint)
                    textStartLeft = left + swW + 8f * density
                } else {
                    val boxSize = 15f * density
                    val boxTop = top + (rowH - boxSize) / 2f
                    val boxRect = RectF(left, boxTop, left + boxSize, boxTop + boxSize)
                    if (isChecked) {
                        paint.style = Paint.Style.FILL
                        paint.color = tintColor
                        canvas.drawRoundRect(boxRect, boxSize / 2f, boxSize / 2f, paint)
                        paint.color = Color.WHITE
                        paint.textSize = 10f * density
                        paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                        paint.textAlign = Paint.Align.CENTER
                        canvas.drawText("✓", left + boxSize / 2f, boxTop + boxSize * 0.74f, paint)
                    } else {
                        paint.style = Paint.Style.STROKE
                        paint.strokeWidth = 1.6f * density
                        paint.color = Color.parseColor("#94A3B8")
                        canvas.drawRoundRect(boxRect, boxSize / 2f, boxSize / 2f, paint)
                    }
                    textStartLeft = left + boxSize + 7f * density
                }

                paint.style = Paint.Style.FILL
                paint.textAlign = Paint.Align.LEFT
                paint.textSize = fontSize
                paint.typeface = if (isChecked) Typeface.create("sans-serif", Typeface.NORMAL) else Typeface.create("sans-serif", Typeface.BOLD)
                paint.isStrikeThruText = isChecked && strike
                paint.color = if (isChecked) parseHexColor(checkedTextHex, Color.GRAY) else parseHexColor(textHex, Color.BLACK)
                val fm = paint.fontMetrics
                val ty = top + rowH / 2f - (fm.ascent + fm.descent) / 2f
                val display = ellipsizeText(label, paint, (left + availWidth - textStartLeft).coerceAtLeast(20f))
                canvas.drawText(display, textStartLeft, ty, paint)
                paint.isStrikeThruText = false

                val canvasW = canvas.width.toFloat().coerceAtLeast(1f)
                val canvasH = canvas.height.toFloat().coerceAtLeast(1f)
                val zone = when {
                    top < canvasH * 0.17f -> "top"
                    top > canvasH * 0.80f -> "bot"
                    else -> "mid"
                }
                val tF = (top / canvasH).coerceIn(0f, 1f)
                val bF = ((top + rowH) / canvasH).coerceIn(0f, 1f)
                val yF = ((tF + bF) / 2f).coerceIn(0f, 1f)
                bindings.add(
                    ButtonActionBinding(
                        actionId = normalizedActionId,
                        deepLink = null,
                        zone = zone,
                        xFraction = 0.5f,
                        yFraction = yF,
                        widthFraction = 1.0f,
                        title = label,
                        accessibilityLabel = props?.optString("accessibilityLabel", "")?.takeIf { it.isNotEmpty() } ?: label,
                        accessibilityHint = if (isChecked) "Đã chọn, bấm để bỏ chọn" else "Chưa chọn, bấm để chọn",
                        leftFraction = (left / canvasW).coerceIn(0f, 1f),
                        rightFraction = ((left + availWidth) / canvasW).coerceIn(0f, 1f),
                        topFraction = tF,
                        bottomFraction = bF
                    )
                )
                rowH + 2f * density
            }

            "Badge" -> {
                val text = props?.optString("text", "") ?: ""
                val bgHex = props?.optString("backgroundColor", "#DBEAFE") ?: "#DBEAFE"
                val textHex = props?.optString("textColor", "#1D4ED8") ?: "#1D4ED8"
                val borderHex = props?.optString("borderColor", "") ?: ""
                val borderW = ((props?.optDouble("borderWidth", if (borderHex.isNotEmpty()) 1.0 else 0.0) ?: 0.0).toFloat() * density)
                val fontSize = ((props?.optDouble("fontSize", 10.0) ?: 10.0).toFloat() * density)
                val padH = ((props?.optDouble("paddingHorizontal", 8.0) ?: 8.0).toFloat() * density)
                val padV = ((props?.optDouble("paddingVertical", 3.5) ?: 3.5).toFloat() * density)
                val radius = ((props?.optDouble("borderRadius", 999.0) ?: 999.0).toFloat() * density)

                paint.textSize = fontSize
                paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                val textW = paint.measureText(text)
                val badgeW = min(availWidth, textW + padH * 2)
                val badgeH = fontSize + padV * 2
                val r = min(badgeH / 2f, radius)
                val rect = RectF(left, top, left + badgeW, top + badgeH)

                paint.style = Paint.Style.FILL
                paint.color = parseHexColor(bgHex, Color.LTGRAY)
                canvas.drawRoundRect(rect, r, r, paint)

                if (borderW > 0f && borderHex.isNotEmpty()) {
                    paint.style = Paint.Style.STROKE
                    paint.strokeWidth = borderW
                    paint.color = parseHexColor(borderHex, Color.BLUE)
                    canvas.drawRoundRect(rect, r, r, paint)
                }

                paint.style = Paint.Style.FILL
                paint.color = parseHexColor(textHex, Color.BLUE)
                paint.textAlign = Paint.Align.CENTER
                val fm = paint.fontMetrics
                val ty = top + badgeH / 2f - (fm.ascent + fm.descent) / 2f
                canvas.drawText(ellipsizeText(text, paint, badgeW - padH), left + badgeW / 2f, ty, paint)
                badgeH + 1.5f * density
            }

            "Link" -> {
                val actionId = props?.optString("actionId", "") ?: ""
                val deepLink = props?.optString("deepLink", "")?.ifEmpty { null }
                val asVStack = JSONObject(node.toString()).apply { put("type", "VStack") }
                val usedH = drawNode(context, canvas, asVStack, left, top, availWidth, availHeight, totalHeight, density, false, bindings)
                if (actionId.isNotEmpty() || !deepLink.isNullOrEmpty()) {
                    val canvasW = canvas.width.toFloat().coerceAtLeast(1f)
                    val canvasH = canvas.height.toFloat().coerceAtLeast(1f)
                    val zone = when {
                        top < canvasH * 0.17f -> "top"
                        top > canvasH * 0.80f -> "bot"
                        else -> "mid"
                    }
                    val lF = (left / canvasW).coerceIn(0f, 1f)
                    val rF = ((left + availWidth) / canvasW).coerceIn(0f, 1f)
                    val tF = (top / canvasH).coerceIn(0f, 1f)
                    val bF = ((top + usedH) / canvasH).coerceIn(0f, 1f)
                    val xF = ((lF + rF) / 2f).coerceIn(0f, 1f)
                    val yF = ((tF + bF) / 2f).coerceIn(0f, 1f)
                    bindings.add(
                        ButtonActionBinding(
                            actionId = actionId,
                            deepLink = deepLink,
                            zone = zone,
                            xFraction = xF,
                            yFraction = yF,
                            widthFraction = (rF - lF).coerceIn(0.05f, 1f),
                            title = props?.optString("accessibilityLabel", "")?.takeIf { it.isNotEmpty() } ?: "Liên kết",
                            accessibilityLabel = props?.optString("accessibilityLabel", "")?.takeIf { it.isNotEmpty() },
                            accessibilityHint = props?.optString("accessibilityHint", "")?.takeIf { it.isNotEmpty() },
                            leftFraction = lF,
                            rightFraction = rF,
                            topFraction = tF,
                            bottomFraction = bF
                        )
                    )
                }
                usedH
            }

            "Equalizer" -> {
                val isPlaying = props?.optBoolean("isPlaying", true) ?: true
                val barCount = (props?.optInt("barCount", 4) ?: 4).coerceIn(2, 12)
                val tintHex = props?.optString("tintColor", "#10B981") ?: "#10B981"
                val maxHeight = ((props?.optDouble("height", 16.0) ?: 16.0).toFloat() * density)
                val barW = ((props?.optDouble("barWidth", 3.0) ?: 3.0).toFloat() * density).coerceAtLeast(2f)
                val spacing = ((props?.optDouble("spacing", 2.0) ?: 2.0).toFloat() * density).coerceAtLeast(1f)
                val defaultRatios = floatArrayOf(0.45f, 0.9f, 0.6f, 0.8f, 0.35f, 0.95f, 0.5f)

                paint.style = Paint.Style.FILL
                paint.color = parseHexColor(tintHex, Color.parseColor("#10B981"))
                if (!isPlaying) paint.alpha = 140

                val cornerRadius = barW / 2f
                val startX = left

                for (i in 0 until barCount) {
                    val ratio = if (isPlaying) defaultRatios[i % defaultRatios.size] else 0.25f
                    val barH = max(barW, maxHeight * ratio)
                    val bx = startX + i * (barW + spacing)
                    val by = top + (maxHeight - barH)
                    canvas.drawRoundRect(RectF(bx, by, bx + barW, top + maxHeight), cornerRadius, cornerRadius, paint)
                }
                maxHeight + 1.5f * density
            }

            "Custom" -> {
                val customComp = DynamicNodeRegistry.resolve(node)
                if (customComp != null) {
                    val h = customComp.heightDpProvider(props) * density
                    val rect = RectF(left, top, left + availWidth, top + h)
                    customComp.drawer.draw(context, canvas, rect, props, density)
                    h + 2f * density
                } else {
                    val children = node.optJSONArray("children")
                    if (children != null && children.length() > 0) {
                        val asVStack = JSONObject(node.toString()).apply { put("type", "VStack") }
                        drawNode(context, canvas, asVStack, left, top, availWidth, availHeight, totalHeight, density, false, bindings)
                    } else {
                        val title = props?.optString("title", props.optString("componentName", "CustomView")) ?: "CustomView"
                        val h = 28f * density
                        paint.style = Paint.Style.FILL
                        paint.color = parseHexColor(props?.optString("backgroundColor", "#F1F5F9") ?: "#F1F5F9", Color.LTGRAY)
                        canvas.drawRoundRect(RectF(left, top, left + availWidth, top + h), 8f * density, 8f * density, paint)
                        paint.color = parseHexColor(props?.optString("textColor", "#0F172A") ?: "#0F172A", Color.BLACK)
                        paint.textSize = 11f * density
                        paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                        paint.textAlign = Paint.Align.LEFT
                        canvas.drawText(title, left + 10f * density, top + h * 0.65f, paint)
                        h + 2f * density
                    }
                }
            }

            else -> {
                val customComp = DynamicNodeRegistry.resolve(node)
                if (customComp != null) {
                    val h = customComp.heightDpProvider(props) * density
                    val rect = RectF(left, top, left + availWidth, top + h)
                    customComp.drawer.draw(context, canvas, rect, props, density)
                    h + 2f * density
                } else 0f
            }
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
                fs * 1.45f + 2.5f * density
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
            "ZStack" -> {
                val pad = ((props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density)
                val children = node.optJSONArray("children")
                var maxH = 20f * density
                if (children != null) {
                    for (i in 0 until children.length()) {
                        val c = children.optJSONObject(i) ?: continue
                        maxH = max(maxH, measureNodeHeight(context, c, (availWidth - pad * 2).coerceAtLeast(10f), density))
                    }
                }
                maxH + pad * 2
            }
            "Grid" -> {
                val pad = ((props?.optDouble("padding", 0.0) ?: 0.0).toFloat() * density)
                val cols = (props?.optInt("columns", 2) ?: 2).coerceAtLeast(1)
                val colSpacing = ((props?.optDouble("columnSpacing", props.optDouble("spacing", 8.0)) ?: 8.0).toFloat() * density)
                val rowSpacing = ((props?.optDouble("rowSpacing", props.optDouble("spacing", 8.0)) ?: 8.0).toFloat() * density)
                val children = node.optJSONArray("children")
                var totalH = pad * 2
                if (children != null && children.length() > 0) {
                    val innerW = (availWidth - pad * 2).coerceAtLeast(20f)
                    val cellW = ((innerW - colSpacing * (cols - 1)) / cols).coerceAtLeast(10f)
                    val rows = (children.length() + cols - 1) / cols
                    for (r in 0 until rows) {
                        var rowMax = 0f
                        for (c in 0 until cols) {
                            val idx = r * cols + c
                            if (idx >= children.length()) break
                            val child = children.optJSONObject(idx) ?: continue
                            rowMax = max(rowMax, measureNodeHeight(context, child, cellW, density))
                        }
                        totalH += rowMax
                        if (r < rows - 1) totalH += rowSpacing
                    }
                }
                totalH
            }
            "Divider" -> {
                val thickness = ((props?.optDouble("thickness", 1.0) ?: 1.0).toFloat() * density).coerceAtLeast(1f)
                val marginV = ((props?.optDouble("marginVertical", 3.0) ?: 3.0).toFloat() * density)
                thickness + marginV * 2
            }
            "Gauge" -> ((props?.optDouble("size", 64.0) ?: 64.0).toFloat() * density) + 2f * density
            "Chart" -> {
                val h = ((props?.optDouble("height", 52.0) ?: 52.0).toFloat() * density)
                val hasLabels = (props?.optJSONArray("labels")?.length() ?: 0) > 0
                h + (if (hasLabels) 14f * density else 0f) + 2f * density
            }
            "Toggle" -> {
                val fs = ((props?.optDouble("fontSize", 12.0) ?: 12.0).toFloat() * density)
                fs * 1.55f + 2f * density
            }
            "Badge" -> {
                val fs = ((props?.optDouble("fontSize", 10.0) ?: 10.0).toFloat() * density)
                val padV = ((props?.optDouble("paddingVertical", 3.5) ?: 3.5).toFloat() * density)
                fs + padV * 2 + 1.5f * density
            }
            "Link" -> {
                val asVStack = JSONObject(node.toString()).apply { put("type", "VStack") }
                measureNodeHeight(context, asVStack, availWidth, density)
            }
            "Equalizer" -> ((props?.optDouble("height", 16.0) ?: 16.0).toFloat() * density) + 1.5f * density

            "Custom" -> {
                val customComp = DynamicNodeRegistry.resolve(node)
                if (customComp != null) {
                    customComp.heightDpProvider(props) * density + 2f * density
                } else 30f * density
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
            "Badge" -> {
                val text = props?.optString("text", "") ?: ""
                val fs = ((props?.optDouble("fontSize", 10.0) ?: 10.0).toFloat() * density)
                val padH = ((props?.optDouble("paddingHorizontal", 8.0) ?: 8.0).toFloat() * density)
                paint.textSize = fs
                paint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
                paint.measureText(text) + padH * 2
            }
            "Gauge" -> ((props?.optDouble("size", 64.0) ?: 64.0).toFloat() * density)
            "Equalizer" -> {
                val barCount = (props?.optInt("barCount", 4) ?: 4).coerceIn(2, 12)
                val barW = ((props?.optDouble("barWidth", 3.0) ?: 3.0).toFloat() * density).coerceAtLeast(2f)
                val spacing = ((props?.optDouble("spacing", 2.0) ?: 2.0).toFloat() * density).coerceAtLeast(1f)
                barCount * barW + (barCount - 1) * spacing
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
        val trimmed = hex.trim()
        if (trimmed.isEmpty()) return fallback
        if (trimmed.startsWith("{")) {
            return try {
                parseDynamicColor(JSONObject(trimmed), fallback)
            } catch (_: Exception) {
                fallback
            }
        }
        return try {
            Color.parseColor(trimmed)
        } catch (_: Exception) {
            fallback
        }
    }

    private fun parseDynamicColor(raw: Any?, fallback: Int): Int {
        if (raw == null) return fallback
        if (raw is String) return parseHexColor(raw, fallback)
        if (raw is JSONObject) {
            val hex = raw.optString("dark", "")
                .ifEmpty { raw.optString("light", "") }
                .ifEmpty { raw.optString("tinted", "") }
            if (hex.isNotEmpty()) return parseHexColor(hex, fallback)
        }
        return fallback
    }

    private fun createLinearGradient(
        gradObj: JSONObject?,
        rect: RectF
    ): Shader? {
        if (gradObj == null) return null
        val colorsArr = gradObj.optJSONArray("colors") ?: return null
        if (colorsArr.length() < 2) return null
        val colors = IntArray(colorsArr.length())
        for (i in 0 until colorsArr.length()) {
            val item = colorsArr.opt(i)
            colors[i] = parseDynamicColor(item, Color.TRANSPARENT)
        }
        val startPt = gradObj.optJSONObject("startPoint")
        val endPt = gradObj.optJSONObject("endPoint")
        val x0 = rect.left + rect.width() * (startPt?.optDouble("x", 0.0)?.toFloat() ?: 0f)
        val y0 = rect.top + rect.height() * (startPt?.optDouble("y", 0.0)?.toFloat() ?: 0f)
        val x1 = rect.left + rect.width() * (endPt?.optDouble("x", 1.0)?.toFloat() ?: 1f)
        val y1 = rect.top + rect.height() * (endPt?.optDouble("y", 1.0)?.toFloat() ?: 1f)
        return android.graphics.LinearGradient(x0, y0, x1, y1, colors, null, Shader.TileMode.CLAMP)
    }
}

