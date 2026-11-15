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

        return null
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
