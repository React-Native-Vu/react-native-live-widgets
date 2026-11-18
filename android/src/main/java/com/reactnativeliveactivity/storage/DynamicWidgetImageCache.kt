package com.reactnativeliveactivity

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.LruCache
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.regex.Pattern
import kotlin.math.max
import kotlin.math.roundToInt

object DynamicWidgetImageCache {
    private val memCache = object : LruCache<String, Bitmap>(16 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.byteCount
    }

    fun cacheKey(urlStr: String): String {
        var hash = 5381L
        for (b in urlStr.toByteArray(Charsets.UTF_8)) {
            hash = ((hash shl 5) + hash) + (b.toLong() and 0xFF)
        }
        return String.format("img_%016x", hash)
    }

    fun getCachedBitmap(context: Context, urlStr: String): Bitmap? {
        val key = cacheKey(urlStr)
        memCache.get(key)?.let { return it }

        val file = File(context.cacheDir, "rn_live_widgets_$key.png")
        if (file.exists()) {
            BitmapFactory.decodeFile(file.absolutePath)?.let { bmp ->
                memCache.put(key, bmp)
                return bmp
            }
        }
        return null
    }

    fun prefetchUrlsSync(context: Context, jsonString: String) {
        if (!jsonString.contains("http")) return
        val pattern = Pattern.compile("\"url\"\\s*:\\s*\"(https?://[^\"]+)\"")
        val matcher = pattern.matcher(jsonString)
        val urls = mutableSetOf<String>()
        while (matcher.find()) {
            matcher.group(1)?.let { urls.add(it) }
        }
        for (urlStr in urls) {
            if (getCachedBitmap(context, urlStr) != null) continue
            try {
                val conn = (URL(urlStr).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 6000
                    readTimeout = 6000
                    instanceFollowRedirects = true
                }
                val bytes = conn.inputStream.use { it.readBytes() }
                conn.disconnect()
                val rawBmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: continue
                val scaled = downscaleBitmap(rawBmp, 360)
                val key = cacheKey(urlStr)
                memCache.put(key, scaled)
                val file = File(context.cacheDir, "rn_live_widgets_$key.png")
                FileOutputStream(file).use { out ->
                    scaled.compress(Bitmap.CompressFormat.PNG, 90, out)
                }
            } catch (_: Exception) {
            }
        }
    }

    fun resolveNodeBitmap(context: Context, props: JSONObject?): Bitmap? {
        if (props == null) return null

        val urlStr = props.optString("url", "")
        if (urlStr.isNotEmpty()) {
            getCachedBitmap(context, urlStr)?.let { return it }
        }

        val base64Str = props.optString("base64", "")
        if (base64Str.isNotEmpty()) {
            try {
                val clean = base64Str.substringAfter(",", base64Str)
                val bytes = Base64.decode(clean, Base64.DEFAULT)
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.let { return it }
            } catch (_: Exception) {
            }
        }

        val filePath = props.optString("filePath", "")
        if (filePath.isNotEmpty()) {
            BitmapFactory.decodeFile(filePath)?.let { return it }
        }

        val assetName = props.optString("assetName", "")
        if (assetName.isNotEmpty()) {
            val resId = context.resources.getIdentifier(assetName, "drawable", context.packageName)
                .takeIf { it != 0 }
                ?: context.resources.getIdentifier(assetName, "mipmap", context.packageName)
            if (resId != 0) {
                BitmapFactory.decodeResource(context.resources, resId)?.let { return it }
            }
        }

        val systemName = props.optString("systemName", "")
        if (systemName.isNotEmpty()) {
            resolveSystemNameBitmap(context, systemName)?.let { return it }
        }

        return null
    }

    fun resolveSystemNameBitmap(context: Context, systemName: String): Bitmap? {
        val clean = systemName.replace('.', '_').replace('-', '_').lowercase()
        // 1. Thử tìm drawable trong res/drawable của ứng dụng
        val appResId = context.resources.getIdentifier(clean, "drawable", context.packageName)
        if (appResId != 0) {
            decodeResourceToBitmap(context, appResId)?.let { return it }
        }

        // 2. Thử ánh xạ sang biểu tượng hệ thống Android (android.R.drawable)
        val sysResId = when {
            clean.contains("check") -> android.R.drawable.checkbox_on_background
            clean.contains("sync") || clean.contains("clockwise") -> android.R.drawable.ic_popup_sync
            clean.contains("play") -> android.R.drawable.ic_media_play
            clean.contains("pause") -> android.R.drawable.ic_media_pause
            clean.contains("star") -> android.R.drawable.btn_star_big_on
            clean.contains("bell") -> android.R.drawable.ic_popup_reminder
            clean.contains("lock") -> android.R.drawable.ic_lock_idle_lock
            clean.contains("trash") || clean.contains("delete") -> android.R.drawable.ic_menu_delete
            clean.contains("camera") -> android.R.drawable.ic_menu_camera
            clean.contains("phone") -> android.R.drawable.stat_sys_phone_call
            else -> 0
        }
        if (sysResId != 0) {
            decodeResourceToBitmap(context, sysResId)?.let { return it }
        }

        return null
    }

    private fun decodeResourceToBitmap(context: Context, resId: Int): Bitmap? {
        return try {
            val drawable = androidx.core.content.ContextCompat.getDrawable(context, resId) ?: return null
            if (drawable is android.graphics.drawable.BitmapDrawable) {
                drawable.bitmap
            } else {
                val w = drawable.intrinsicWidth.takeIf { it > 0 } ?: 64
                val h = drawable.intrinsicHeight.takeIf { it > 0 } ?: 64
                val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
                val canvas = android.graphics.Canvas(bmp)
                drawable.setBounds(0, 0, canvas.width, canvas.height)
                drawable.draw(canvas)
                bmp
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun downscaleBitmap(bmp: Bitmap, maxDimension: Int): Bitmap {
        val maxSide = max(bmp.width, bmp.height)
        if (maxSide <= maxDimension) return bmp
        val ratio = maxDimension.toFloat() / maxSide.toFloat()
        val w = (bmp.width * ratio).roundToInt().coerceAtLeast(1)
        val h = (bmp.height * ratio).roundToInt().coerceAtLeast(1)
        return Bitmap.createScaledBitmap(bmp, w, h, true)
    }
}

