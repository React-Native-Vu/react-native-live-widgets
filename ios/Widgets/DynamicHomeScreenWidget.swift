import SwiftUI
import WidgetKit

public struct DynamicWidgetEntry: TimelineEntry {
  public let date: Date
  public let layoutJson: String?

  public init(date: Date, layoutJson: String?) {
    self.date = date
    self.layoutJson = layoutJson
  }
}

public struct DynamicWidgetProvider: TimelineProvider {
  let widgetKey: String
  let appGroup: String

  public init(widgetKey: String, appGroup: String = "") {
    self.widgetKey = widgetKey
    self.appGroup = appGroup
  }

  public func placeholder(in context: Context) -> DynamicWidgetEntry {
    DynamicWidgetEntry(date: Date(), layoutJson: readLayoutJson())
  }

  public func getSnapshot(in context: Context, completion: @escaping (DynamicWidgetEntry) -> Void) {
    let json = readLayoutJson()
    completion(DynamicWidgetEntry(date: Date(), layoutJson: json))
  }

  public func getTimeline(in context: Context, completion: @escaping (Timeline<DynamicWidgetEntry>) -> Void) {
    let wKey = widgetKey
    let group = appGroup
    let rawLayout = Self.readSharedString(forKey: "widget_layout_\(wKey)", appGroup: group)
    let hasTemplateVars = rawLayout?.contains("{{") == true
    let hasRemoteConfig = Self.readSharedString(forKey: "widget_remote_config_\(wKey)", appGroup: group) != nil
    let state = DynamicWidgetStateStore.loadState()
    let secondsSinceLastUpdate = Date().timeIntervalSince1970 - (state.updatedAt ?? 0)
    let needsRemoteSync = hasRemoteConfig && hasTemplateVars && (state.lastSyncTime == nil || secondsSinceLastUpdate >= 20)
    let needsImagePrefetch = rawLayout.map { DynamicWidgetImageCache.hasUncachedUrls(in: $0) } ?? false

    // Đường dẫn nhanh (Fast-path): Nếu dữ liệu đã sẵn sàng và không cần tải mạng, trả kết quả ngay lập tức
    // để khi chuyển sang Widget cỡ lớn (Large) hoặc thêm Widget mới không bao giờ bị treo màn hình chờ (skeleton).
    if !needsRemoteSync && !needsImagePrefetch {
      let json = readLayoutJson()
      let entry = DynamicWidgetEntry(date: Date(), layoutJson: json)
      let intervalMins = readRefreshIntervalMinutes()
      let nextUpdate = Calendar.current.date(byAdding: .minute, value: intervalMins, to: Date())!
      completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
      return
    }

    Task {
      if needsRemoteSync {
        await DynamicWidgetStateStore.performRemoteSync(widgetKey: wKey)
      }

      let json = readLayoutJson()
      if let json = json, needsImagePrefetch {
        await DynamicWidgetImageCache.prefetchUrls(in: json)
      }
      let entry = DynamicWidgetEntry(date: Date(), layoutJson: json)
      let intervalMins = readRefreshIntervalMinutes()
      let nextUpdate = Calendar.current.date(byAdding: .minute, value: intervalMins, to: Date())!
      let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
      completion(timeline)
    }
  }

  private func readRefreshIntervalMinutes() -> Int {
    let configKey = "widget_remote_config_\(widgetKey)"
    if let json = Self.readSharedString(forKey: configKey, appGroup: appGroup),
       let data = json.data(using: .utf8),
       let config = try? JSONDecoder().decode(WidgetRemoteConfigDTO.self, from: data),
       let mins = config.refreshIntervalMinutes, mins >= 1 {
      return mins
    }
    return 15
  }

  private func readLayoutJson() -> String? {
    let key = "widget_layout_\(widgetKey)"
    guard var raw = Self.readSharedString(forKey: key, appGroup: appGroup) else {
      return nil
    }

    let state = DynamicWidgetStateStore.loadState()
    let syncTime = state.lastSyncTime ?? {
      let f = DateFormatter()
      f.dateFormat = "HH:mm:ss"
      return f.string(from: Date())
    }()
    raw = raw.replacingOccurrences(of: "{{_lastSyncTime}}", with: syncTime)

    if let vars = state.remoteVariables {
      for (k, v) in vars {
        let escaped = v.replacingOccurrences(of: "\"", with: "\\\"")
        raw = raw.replacingOccurrences(of: "{{\(k)}}", with: escaped)
      }
    }
    return raw
  }

  public static func readSharedString(forKey key: String, appGroup: String) -> String? {
    let resolvedGroup = resolveAppGroup(appGroup)

    if let fileURL = sharedFileURL(key: key, appGroup: appGroup),
       let fileVal = try? String(contentsOf: fileURL, encoding: .utf8),
       !fileVal.isEmpty {
      return fileVal
    }

    if !resolvedGroup.isEmpty,
       let groupDefaults = UserDefaults(suiteName: resolvedGroup),
       let val = groupDefaults.string(forKey: key),
       !val.isEmpty {
      return val
    }

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(key).json"
    if let simVal = try? String(contentsOfFile: simPath, encoding: .utf8), !simVal.isEmpty {
      return simVal
    }
    #endif

    return UserDefaults.standard.string(forKey: key)
  }

  public static func writeSharedString(_ value: String, forKey key: String, appGroup: String) {
    let resolvedGroup = resolveAppGroup(appGroup)
    if let fileURL = sharedFileURL(key: key, appGroup: appGroup) {
      try? value.write(to: fileURL, atomically: true, encoding: .utf8)
    }
    if !resolvedGroup.isEmpty, let groupDefaults = UserDefaults(suiteName: resolvedGroup) {
      groupDefaults.set(value, forKey: key)
      groupDefaults.synchronize()
    }
    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(key).json"
    try? value.write(toFile: simPath, atomically: true, encoding: .utf8)
    #endif
  }

  public static func sharedFileURL(key: String, appGroup: String) -> URL? {
    let resolvedGroup = resolveAppGroup(appGroup)
    guard !resolvedGroup.isEmpty,
          let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: resolvedGroup) else {
      return nil
    }
    return containerURL.appendingPathComponent("rn_live_widgets_\(key).json")
  }

  public static func resolveAppGroup(_ explicit: String) -> String {
    if !explicit.isEmpty { return explicit }
    guard let bundleId = Bundle.main.bundleIdentifier else { return "" }
    if Bundle.main.bundlePath.hasSuffix(".appex"),
       let dotIndex = bundleId.lastIndex(of: ".") {
      let hostBundleId = String(bundleId[..<dotIndex])
      return "group.\(hostBundleId)"
    }
    return "group.\(bundleId)"
  }
}

public struct DynamicHomeScreenWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: DynamicWidgetEntry

  public init(entry: DynamicWidgetEntry) {
    self.entry = entry
  }

  private var activeNode: LayoutNodeDTO? {
    guard let json = entry.layoutJson,
          let data = json.data(using: .utf8),
          let payload = try? JSONDecoder().decode(WidgetMultiPagePayloadDTO.self, from: data) else {
      return nil
    }

    if let pages = payload.pages, !pages.isEmpty {
      let state = DynamicWidgetStateStore.loadState()
      let defaultOrder = payload.pageOrder ?? Array(pages.keys).sorted()
      let activePageId: String = {
        if let saved = state.activePage, pages[saved] != nil {
          return saved
        }
        if let initial = payload.initialPage, pages[initial] != nil {
          return initial
        }
        return defaultOrder.first ?? ""
      }()

      if let pageConfig = pages[activePageId] {
        return selectFamilyNode(
          small: pageConfig.small,
          medium: pageConfig.medium,
          large: pageConfig.large
        )
      }
    }

    return selectFamilyNode(
      small: payload.small,
      medium: payload.medium,
      large: payload.large
    )
  }

  private func selectFamilyNode(
    small: LayoutNodeDTO?,
    medium: LayoutNodeDTO?,
    large: LayoutNodeDTO?
  ) -> LayoutNodeDTO? {
    switch family {
    case .systemSmall:
      return small ?? medium ?? large
    case .systemMedium:
      return medium ?? small ?? large
    case .systemLarge, .systemExtraLarge:
      return large ?? medium ?? small
    default:
      return small ?? medium ?? large
    }
  }

  private var rootBackgroundColor: Color {
    if let bgHex = activeNode?.props?["backgroundColor"]?.stringValue,
       let color = Color(hex: bgHex) {
      return color
    }
    return Color(.systemBackground)
  }

  public var body: some View {
    Group {
      if let node = activeNode {
        DynamicNodeView(node: node)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      } else {
        fallbackView()
      }
    }
    .applyWidgetBackground(rootBackgroundColor)
  }

  @ViewBuilder
  private func fallbackView() -> some View {
    VStack(spacing: 6) {
      Text("Live Widgets")
        .font(.headline)
      Text("Chọn 1 mẫu UI trong app để hiển thị")
        .font(.caption)
        .foregroundColor(.secondary)
        .multilineTextAlignment(.center)
    }
    .padding()
  }
}

extension View {
  /// Tương thích iOS 17+ / iOS 27: Bắt buộc dùng `containerBackground(for: .widget)`
  @ViewBuilder
  func applyWidgetBackground(_ color: Color) -> some View {
    if #available(iOS 17.0, *) {
      self.containerBackground(for: .widget) {
        color
      }
    } else {
      self.padding().background(color)
    }
  }
}
