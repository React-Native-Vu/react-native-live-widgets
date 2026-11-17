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

    // 1. Kiểm tra xem có cấu hình Timeline nhiều mốc thời gian không (widget_timeline_<key>)
    if let timelineRaw = Self.readSharedString(forKey: "widget_timeline_\(wKey)", appGroup: group),
       let data = timelineRaw.data(using: .utf8),
       let timelineDTO = try? JSONDecoder().decode(WidgetTimelineConfigDTO.self, from: data),
       !timelineDTO.entries.isEmpty {
      var entries: [DynamicWidgetEntry] = []
      for item in timelineDTO.entries {
        let entryDate: Date
        if item.date > 10_000_000_000 {
          entryDate = Date(timeIntervalSince1970: item.date / 1000.0)
        } else {
          entryDate = Date(timeIntervalSince1970: item.date)
        }
        let layoutJson: String
        if let encoded = try? JSONEncoder().encode(item.layout),
           let str = String(data: encoded, encoding: .utf8) {
          layoutJson = str
        } else {
          layoutJson = ""
        }
        entries.append(DynamicWidgetEntry(date: entryDate, layoutJson: layoutJson))
      }

      entries.sort { $0.date < $1.date }

      let policy: TimelineReloadPolicy
      switch timelineDTO.policy {
      case "never":
        policy = .never
      case "afterDate":
        if let after = timelineDTO.afterDate {
          let afterDate = after > 10_000_000_000 ? Date(timeIntervalSince1970: after / 1000.0) : Date(timeIntervalSince1970: after)
          policy = .after(afterDate)
        } else {
          policy = .atEnd
        }
      default:
        policy = .atEnd
      }

      completion(Timeline(entries: entries, policy: policy))
      return
    }

    // 2. Chạy cơ chế đơn mốc mặc định (Layout snapshot hiện tại)
    let rawLayout = Self.readSharedString(forKey: "widget_layout_\(wKey)", appGroup: group)
    let hasTemplateVars = rawLayout?.contains("{{") == true
    let hasRemoteConfig = Self.readSharedString(forKey: "widget_remote_config_\(wKey)", appGroup: group) != nil
    let state = DynamicWidgetStateStore.loadState()
    let secondsSinceLastUpdate = Date().timeIntervalSince1970 - (state.updatedAt ?? 0)
    let needsRemoteSync = hasRemoteConfig && hasTemplateVars && (state.lastSyncTime == nil || secondsSinceLastUpdate >= 20)
    let needsImagePrefetch = rawLayout.map { DynamicWidgetImageCache.hasUncachedUrls(in: $0) } ?? false

    // Trả Timeline ngay lập tức để chuyển đổi giữa các mẫu Widget mượt mà tức thì
    let json = readLayoutJson()
    let entry = DynamicWidgetEntry(date: Date(), layoutJson: json)
    let intervalMins = readRefreshIntervalMinutes()
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: intervalMins, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))

    // Tác vụ đồng bộ ngầm và tải trước ảnh URL nếu cần
    if needsRemoteSync || needsImagePrefetch {
      Task {
        if needsRemoteSync {
          await DynamicWidgetStateStore.performRemoteSync(widgetKey: wKey)
        }
        if let json = json, needsImagePrefetch {
          await DynamicWidgetImageCache.prefetchUrls(in: json)
        }
      }
    }
  }

  private func readRefreshIntervalMinutes() -> Int {
    let configKey = "widget_remote_config_\(widgetKey)"
    if let json = Self.readSharedString(forKey: configKey, appGroup: appGroup),
       let data = json.data(using: .utf8),
       let config = try? JSONDecoder().decode(WidgetRemoteConfigDTO.self, from: data) {
      return max(1, config.effectiveIntervalMinutes)
    }
    return 15
  }

  private func readLayoutJson() -> String? {
    let key = "widget_layout_\(widgetKey)"
    var raw: String? = Self.readSharedString(forKey: key, appGroup: appGroup)
    if raw == nil && widgetKey != "main" {
      raw = Self.readSharedString(forKey: "widget_layout_main", appGroup: appGroup)
    }
    guard var raw = raw else {
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

    if let selectedConfig = Self.readSharedString(forKey: "widget_selected_config_\(widgetKey)", appGroup: appGroup) {
      raw = raw.replacingOccurrences(of: "{{_selectedConfigId}}", with: selectedConfig)
      raw = raw.replacingOccurrences(of: "{{selectedConfigId}}", with: selectedConfig)
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
  @Environment(\.colorScheme) var colorScheme
  let entry: DynamicWidgetEntry

  public init(entry: DynamicWidgetEntry) {
    self.entry = entry
  }

  private var parsedPayload: WidgetMultiPagePayloadDTO? {
    guard let json = entry.layoutJson,
          let data = json.data(using: .utf8),
          let payload = try? JSONDecoder().decode(WidgetMultiPagePayloadDTO.self, from: data) else {
      return nil
    }
    return payload
  }

  private var rootDeepLink: String? {
    parsedPayload?.rootDeepLink
  }

  private var containerGradientColors: [String]? {
    parsedPayload?.containerBackground?.gradientColors
  }

  private var activeNode: LayoutNodeDTO? {
    guard let payload = parsedPayload else {
      return nil
    }

    // Hỗ trợ trực tiếp UI Intermediate Representation (IR v2.0)
    if let root = payload.root {
      return root
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
          small: pageConfig.small ?? payload.small,
          medium: pageConfig.medium ?? payload.medium,
          large: pageConfig.large ?? payload.large,
          accessoryRectangular: pageConfig.accessoryRectangular ?? payload.accessoryRectangular,
          accessoryCircular: pageConfig.accessoryCircular ?? payload.accessoryCircular,
          accessoryInline: pageConfig.accessoryInline ?? payload.accessoryInline
        )
      }
    }

    return selectFamilyNode(
      small: payload.small,
      medium: payload.medium,
      large: payload.large,
      accessoryRectangular: payload.accessoryRectangular,
      accessoryCircular: payload.accessoryCircular,
      accessoryInline: payload.accessoryInline
    )
  }

  private func selectFamilyNode(
    small: LayoutNodeDTO?,
    medium: LayoutNodeDTO?,
    large: LayoutNodeDTO?,
    accessoryRectangular: LayoutNodeDTO? = nil,
    accessoryCircular: LayoutNodeDTO? = nil,
    accessoryInline: LayoutNodeDTO? = nil
  ) -> LayoutNodeDTO? {
    if #available(iOS 16.0, *) {
      switch family {
      case .accessoryRectangular:
        return accessoryRectangular ?? small
      case .accessoryCircular:
        return accessoryCircular
      case .accessoryInline:
        return accessoryInline
      default:
        break
      }
    }

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

  private var isAccessoryFamily: Bool {
    if #available(iOS 16.0, *) {
      return family == .accessoryRectangular || family == .accessoryCircular || family == .accessoryInline
    }
    return false
  }

  private var rootBackgroundColor: Color {
    if isAccessoryFamily {
      return Color.clear
    }
    if let bgCodable = parsedPayload?.containerBackground?.backgroundColor,
       let color = Color.resolve(from: bgCodable, colorScheme: colorScheme) {
      return color
    }
    if let bgCodable = activeNode?.props?["backgroundColor"],
       let color = Color.resolve(from: bgCodable, colorScheme: colorScheme) {
      return color
    }
    return Color(.systemBackground)
  }

  public var body: some View {
    Group {
      if let node = activeNode {
        DynamicNodeView(node: node)
          .frame(
            maxWidth: .infinity,
            maxHeight: .infinity,
            alignment: isAccessoryFamily ? .center : .topLeading
          )
      } else {
        fallbackView()
      }
    }
    .applyWidgetURL(rootDeepLink)
    .applyWidgetBackground(rootBackgroundColor, gradientColors: containerGradientColors, isAccessory: isAccessoryFamily)
  }

  @ViewBuilder
  private func fallbackView() -> some View {
    if isAccessoryFamily {
      if family == .accessoryCircular {
        Image(systemName: "clock.badge.checkmark.fill")
          .font(.system(size: 22, weight: .bold))
          .foregroundColor(.white)
      } else {
        VStack(alignment: .leading, spacing: 2) {
          Text("Live Widgets")
            .font(.caption2.weight(.bold))
          Text("Chưa có dữ liệu")
            .font(.system(size: 9))
            .foregroundColor(.secondary)
        }
      }
    } else {
      VStack(spacing: 6) {
        Text("Live Widgets")
          .font(.headline)
        Text("Chọn 1 mẫu UI trong app để hiển thị")
          .font(.caption)
          .foregroundColor(.secondary)
          .multilineTextAlignment(.center)
      }
      .padding(12)
    }
  }
}

extension View {
  @ViewBuilder
  func applyWidgetURL(_ urlString: String?) -> some View {
    if let urlStr = urlString, let url = URL(string: urlStr) {
      self.widgetURL(url)
    } else {
      self
    }
  }

  /// Tương thích iOS 17+ / iOS 18+: Bắt buộc dùng `containerBackground(for: .widget)`
  @ViewBuilder
  func applyWidgetBackground(
    _ color: Color,
    gradientColors: [String]? = nil,
    isAccessory: Bool = false
  ) -> some View {
    if #available(iOS 17.0, *) {
      if isAccessory {
        self.containerBackground(for: .widget) {
          Color.clear
        }
      } else {
        self.containerBackground(for: .widget) {
          if let grad = gradientColors, grad.count >= 2 {
            LinearGradient(
              colors: grad.compactMap { Color(hex: $0) },
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          } else {
            color
          }
        }
      }
    } else {
      if isAccessory {
        self
      } else {
        if let grad = gradientColors, grad.count >= 2 {
          self.padding().background(
            LinearGradient(
              colors: grad.compactMap { Color(hex: $0) },
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
        } else {
          self.padding().background(color)
        }
      }
    }
  }
}
