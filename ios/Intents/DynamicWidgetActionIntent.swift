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
      await DynamicWidgetStateStore.performRemoteSync(widgetKey: key)
    } else {
      DynamicWidgetStateStore.handleAction(actionId)
    }
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}
