package com.reactnativeliveactivity

import android.content.Context
import android.graphics.Canvas
import android.graphics.RectF
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * Cho phép Developer đăng ký thêm bất kỳ Custom Component nào trên Android để gọi từ React Native
 * thông qua `UI.Custom("ComponentName", props)`.
 *
 * Ví dụ đăng ký trong `MainApplication.onCreate()`:
 * ```kotlin
 * DynamicNodeRegistry.register(
 *   componentName = "WeatherMapCard",
 *   heightDp = { props -> 64f },
 *   drawer = { context, canvas, rect, props, density ->
 *     // Tự vẽ lên Canvas của Widget
 *   }
 * )
 * ```
 */
object DynamicNodeRegistry {

    fun interface CustomCanvasDrawer {
        fun draw(
            context: Context,
            canvas: Canvas,
            rect: RectF,
            props: JSONObject?,
            density: Float
        )
    }

    data class RegisteredComponent(
        val heightDpProvider: (JSONObject?) -> Float,
        val drawer: CustomCanvasDrawer
    )

    private val registry = ConcurrentHashMap<String, RegisteredComponent>()

    @JvmStatic
    fun register(
        componentName: String,
        heightDp: (JSONObject?) -> Float = { props -> (props?.optDouble("height", 48.0) ?: 48.0).toFloat() },
        drawer: CustomCanvasDrawer
    ) {
        registry[componentName] = RegisteredComponent(heightDp, drawer)
    }

    fun resolve(node: JSONObject): RegisteredComponent? {
        val type = node.optString("type", "")
        val props = node.optJSONObject("props")
        val key = if (type == "Custom") {
            props?.optString("componentName", "") ?: ""
        } else {
            type
        }
        if (key.isEmpty()) return null
        return registry[key]
    }
}

