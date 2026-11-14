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
    DynamicWidgetEntry(date: Date(), layoutJson: nil)
  }

  public func getSnapshot(in context: Context, completion: @escaping (DynamicWidgetEntry) -> Void) {
    let json = readLayoutJson()
    completion(DynamicWidgetEntry(date: Date(), layoutJson: json))
  }

  public func getTimeline(in context: Context, completion: @escaping (Timeline<DynamicWidgetEntry>) -> Void) {
    let json = readLayoutJson()
    let entry = DynamicWidgetEntry(date: Date(), layoutJson: json)
    // Cập nhật sau 15 phút
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
    let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
    completion(timeline)
  }

  private func readLayoutJson() -> String? {
    let defaults = !appGroup.isEmpty ? UserDefaults(suiteName: appGroup) : UserDefaults.standard
    return defaults?.string(forKey: "widget_layout_\(widgetKey)")
  }
}

public struct DynamicHomeScreenWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: DynamicWidgetEntry

  public init(entry: DynamicWidgetEntry) {
    self.entry = entry
  }

  public var body: some View {
    Group {
      if let json = entry.layoutJson,
         let data = json.data(using: .utf8),
         let layoutConfig = try? JSONDecoder().decode([String: LayoutNodeDTO].self, from: data) {
        
        switch family {
        case .systemSmall:
          if let small = layoutConfig["small"] {
            DynamicNodeView(node: small)
          } else {
            fallbackView()
          }
        case .systemMedium:
          if let medium = layoutConfig["medium"] ?? layoutConfig["small"] {
            DynamicNodeView(node: medium)
          } else {
            fallbackView()
          }
        case .systemLarge, .systemExtraLarge:
          if let large = layoutConfig["large"] ?? layoutConfig["medium"] ?? layoutConfig["small"] {
            DynamicNodeView(node: large)
          } else {
            fallbackView()
          }
        default:
          fallbackView()
        }
      } else {
        fallbackView()
      }
    }
    .applyWidgetBackground()
  }

  @ViewBuilder
  private func fallbackView() -> some View {
    VStack {
      Text("Live Widgets")
        .font(.headline)
      Text("Mở app để đồng bộ dữ liệu")
        .font(.caption)
        .foregroundColor(.secondary)
    }
    .padding()
  }
}

extension View {
  /// Tương thích iOS 17+: Bắt buộc dùng `containerBackground(for: .widget)`
  /// Fallback cho iOS 16: Dùng background thông thường
  @ViewBuilder
  func applyWidgetBackground() -> some View {
    if #available(iOS 17.0, *) {
      self.containerBackground(for: .widget) {
        Color(.systemBackground)
      }
    } else {
      self.padding().background(Color(.systemBackground))
    }
  }
}

