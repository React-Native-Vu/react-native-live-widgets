import AppIntents
import SwiftUI
import WidgetKit

// MARK: - iOS 18+ Interactive Control Widgets (Control Center, Lock Screen & Action Button)

@available(iOS 18.0, *)
public enum ControlWidgetConfigReader {
  public static func load(controlId: String = "main") -> ControlWidgetConfigDTO? {
    guard let json = DynamicWidgetProvider.readSharedString(forKey: "widget_control_\(controlId)", appGroup: ""),
          let data = json.data(using: .utf8) else {
      return nil
    }
    return try? JSONDecoder().decode(ControlWidgetConfigDTO.self, from: data)
  }
}

@available(iOS 18.0, *)
public struct DynamicControlWidget: ControlWidget {
  public init() {}

  public var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "DynamicControlWidget") {
      let config = ControlWidgetConfigReader.load(controlId: "main")
      let title = config?.title ?? "Live Widget"
      let systemName = config?.systemName ?? "bolt.fill"
      let actionId = config?.actionId ?? "control_action_main"

      ControlWidgetButton(action: DynamicWidgetActionIntent(actionId: actionId)) {
        Label(title, systemImage: systemName)
      }
    }
    .displayName("Live Widgets Action")
    .description("Kích hoạt nhanh hành động hoặc mở rộng Control Widget từ React Native.")
  }
}

@available(iOS 18.0, *)
public struct DynamicControlToggleWidget: ControlWidget {
  public init() {}

  public var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "DynamicControlToggleWidget") {
      let config = ControlWidgetConfigReader.load(controlId: "toggle")
        ?? ControlWidgetConfigReader.load(controlId: "main")
      let rawActionId = config?.actionId ?? "toggle:control_main"
      let key = rawActionId.hasPrefix("toggle:") ? String(rawActionId.dropFirst(7)) : rawActionId
      let state = DynamicWidgetStateStore.loadState()
      let isOn = state.toggledItems[key] ?? (config?.checked ?? false)
      let title = isOn ? (config?.checkedTitle ?? config?.title ?? "Đang bật") : (config?.title ?? "Tạm tắt")
      let systemName = config?.systemName ?? "checkmark.circle.fill"

      ControlWidgetToggle(
        isOn: isOn,
        action: DynamicControlToggleIntent(actionId: rawActionId, value: !isOn)
      ) {
        Label(title, systemImage: systemName)
      }
    }
    .displayName("Live Widgets Toggle")
    .description("Bật/tắt trạng thái đồng bộ trực tiếp với React Native SharedStorage.")
  }
}
