import AppIntents
import WidgetKit

// MARK: - AppIntent for Interactive Widgets & Live Activities (iOS 17+)

@available(iOS 17.0, *)
public struct DynamicWidgetActionIntent: AppIntent {
  public static var title: LocalizedStringResource = "Interactive Widget Action"
  public static var description = IntentDescription("Perform interactive tab/page switching, toggling, or background API sync right on the widget.")

  @Parameter(title: "Action ID")
  public var actionId: String

  public init() {
    self.actionId = ""
  }

  public init(actionId: String) {
    self.actionId = actionId
  }

  public func perform() async throws -> some IntentResult {
    if actionId == "refresh" || actionId.hasPrefix("refresh:") {
      let key = actionId.hasPrefix("refresh:") ? String(actionId.dropFirst(8)) : "main"
      await DynamicWidgetStateStore.performRemoteSync(widgetKey: key, forceRefresh: true)
    } else {
      DynamicWidgetStateStore.handleAction(actionId)
    }

    // Thông báo cho Main App nếu đang chạy ngầm hoặc nền
    let center = CFNotificationCenterGetDarwinNotifyCenter()
    CFNotificationCenterPostNotification(center, CFNotificationName("rn_live_widgets_action_clicked" as CFString), nil, nil, true)

    WidgetCenter.shared.reloadAllTimelines()
    if #available(iOS 18.0, *) {
      ControlCenter.shared.reloadAllControls()
    }
    return .result()
  }
}

@available(iOS 18.0, *)
public struct DynamicControlToggleIntent: SetValueIntent {
  public static var title: LocalizedStringResource = "Toggle Control Widget"
  public static var description = IntentDescription("Toggle interactive Control Center widget state.")

  @Parameter(title: "Action ID")
  public var actionId: String

  @Parameter(title: "Value")
  public var value: Bool

  public init() {
    self.actionId = ""
    self.value = false
  }

  public init(actionId: String, value: Bool = false) {
    self.actionId = actionId
    self.value = value
  }

  public func perform() async throws -> some IntentResult {
    let key = actionId.hasPrefix("toggle:") ? String(actionId.dropFirst(7)) : actionId
    DynamicWidgetStateStore.setToggle(key, value: value)

    let center = CFNotificationCenterGetDarwinNotifyCenter()
    CFNotificationCenterPostNotification(center, CFNotificationName("rn_live_widgets_action_clicked" as CFString), nil, nil, true)

    WidgetCenter.shared.reloadAllTimelines()
    ControlCenter.shared.reloadAllControls()
    return .result()
  }
}

