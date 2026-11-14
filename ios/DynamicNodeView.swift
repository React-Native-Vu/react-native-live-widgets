import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Interactive Widget State Store & AppIntent (iOS 17+ / iOS 27)

public struct WidgetSinglePageDTO: Codable {
  public let small: LayoutNodeDTO?
  public let medium: LayoutNodeDTO?
  public let large: LayoutNodeDTO?
}

public struct WidgetMultiPagePayloadDTO: Codable {
  public let small: LayoutNodeDTO?
  public let medium: LayoutNodeDTO?
  public let large: LayoutNodeDTO?
  public let pages: [String: WidgetSinglePageDTO]?
  public let pageOrder: [String]?
  public let initialPage: String?
}

public struct InteractiveWidgetState: Codable {
  public var activePage: String?
  public var pageOrder: [String]?
  public var toggledItems: [String: Bool]
  public var lastActionId: String?
  public var updatedAt: Double

  public init(
    activePage: String? = nil,
    pageOrder: [String]? = nil,
    toggledItems: [String: Bool] = [:],
    lastActionId: String? = nil,
    updatedAt: Double = Date().timeIntervalSince1970
  ) {
    self.activePage = activePage
    self.pageOrder = pageOrder
    self.toggledItems = toggledItems
    self.lastActionId = lastActionId
    self.updatedAt = updatedAt
  }
}

public enum DynamicWidgetStateStore {
  private static let stateKey = "interactive_state"
  private static var memoryCache: InteractiveWidgetState?

  public static func loadState() -> InteractiveWidgetState {
    if let fileURL = DynamicWidgetProvider.sharedFileURL(key: stateKey, appGroup: ""),
       let data = try? Data(contentsOf: fileURL),
       let state = try? JSONDecoder().decode(InteractiveWidgetState.self, from: data) {
      memoryCache = state
      return state
    }

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(stateKey).json"
    if let data = try? Data(contentsOf: URL(fileURLWithPath: simPath)),
       let state = try? JSONDecoder().decode(InteractiveWidgetState.self, from: data) {
      memoryCache = state
      return state
    }
    #endif

    let resolvedGroup = DynamicWidgetProvider.resolveAppGroup("")
    if !resolvedGroup.isEmpty,
       let defaults = UserDefaults(suiteName: resolvedGroup),
       let jsonStr = defaults.string(forKey: stateKey),
       let data = jsonStr.data(using: .utf8),
       let state = try? JSONDecoder().decode(InteractiveWidgetState.self, from: data) {
      memoryCache = state
      return state
    }

    return memoryCache ?? InteractiveWidgetState()
  }

  public static func saveState(_ state: InteractiveWidgetState) {
    memoryCache = state
    guard let data = try? JSONEncoder().encode(state),
          let jsonStr = String(data: data, encoding: .utf8) else {
      return
    }

    if let fileURL = DynamicWidgetProvider.sharedFileURL(key: stateKey, appGroup: "") {
      try? jsonStr.write(to: fileURL, atomically: true, encoding: .utf8)
    }

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(stateKey).json"
    try? jsonStr.write(toFile: simPath, atomically: true, encoding: .utf8)
    #endif

    let resolvedGroup = DynamicWidgetProvider.resolveAppGroup("")
    if !resolvedGroup.isEmpty, let defaults = UserDefaults(suiteName: resolvedGroup) {
      defaults.set(jsonStr, forKey: stateKey)
      defaults.synchronize()
    }
  }

  public static func handleAction(_ actionId: String) {
    var state = loadState()
    state.lastActionId = actionId
    state.updatedAt = Date().timeIntervalSince1970

    if actionId.hasPrefix("page:") {
      let target = String(actionId.dropFirst(5))
      let order = state.pageOrder ?? []
      if target == "next", !order.isEmpty {
        let current = state.activePage ?? order[0]
        if let idx = order.firstIndex(of: current) {
          state.activePage = order[(idx + 1) % order.count]
        } else {
          state.activePage = order[0]
        }
      } else if target == "prev", !order.isEmpty {
        let current = state.activePage ?? order[0]
        if let idx = order.firstIndex(of: current) {
          state.activePage = order[(idx - 1 + order.count) % order.count]
        } else {
          state.activePage = order[0]
        }
      } else {
        state.activePage = target
      }
    } else if actionId.hasPrefix("toggle:") {
      let key = String(actionId.dropFirst(7))
      let current = state.toggledItems[key] ?? false
      state.toggledItems[key] = !current
    }

    saveState(state)
  }

  public static func isToggled(_ key: String) -> Bool {
    return loadState().toggledItems[key] ?? false
  }
}

@available(iOS 17.0, *)
public struct DynamicWidgetActionIntent: AppIntent {
  public static var title: LocalizedStringResource = "Interactive Widget Action"
  public static var description = IntentDescription("Perform interactive tab/page switching or toggling right on the widget.")

  @Parameter(title: "Action ID")
  public var actionId: String

  public init() {
    self.actionId = ""
  }

  public init(actionId: String) {
    self.actionId = actionId
  }

  public func perform() async throws -> some IntentResult {
    DynamicWidgetStateStore.handleAction(actionId)
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}

// MARK: - Decodable Models

public struct LayoutNodeDTO: Codable {
  public let type: String
  public let props: [String: AnyCodable]?
  public let children: [LayoutNodeDTO]?

  public init(type: String, props: [String: AnyCodable]? = nil, children: [LayoutNodeDTO]? = nil) {
    self.type = type
    self.props = props
    self.children = children
  }
}

public struct DynamicPayloadDTO: Codable {
  public let activityId: String?
  public let lockScreen: LayoutNodeDTO?
  public let dynamicIsland: DynamicIslandDTO?
  public let staleTimestamp: Double?

  public init(
    activityId: String? = nil,
    lockScreen: LayoutNodeDTO? = nil,
    dynamicIsland: DynamicIslandDTO? = nil,
    staleTimestamp: Double? = nil
  ) {
    self.activityId = activityId
    self.lockScreen = lockScreen
    self.dynamicIsland = dynamicIsland
    self.staleTimestamp = staleTimestamp
  }
}

public struct DynamicIslandDTO: Codable {
  public let compactLeading: LayoutNodeDTO?
  public let compactTrailing: LayoutNodeDTO?
  public let minimal: LayoutNodeDTO?
  public let expanded: ExpandedIslandDTO?

  public init(
    compactLeading: LayoutNodeDTO? = nil,
    compactTrailing: LayoutNodeDTO? = nil,
    minimal: LayoutNodeDTO? = nil,
    expanded: ExpandedIslandDTO? = nil
  ) {
    self.compactLeading = compactLeading
    self.compactTrailing = compactTrailing
    self.minimal = minimal
    self.expanded = expanded
  }
}

public struct ExpandedIslandDTO: Codable {
  public let leading: LayoutNodeDTO?
  public let trailing: LayoutNodeDTO?
  public let bottom: LayoutNodeDTO?
  public let center: LayoutNodeDTO?

  public init(
    leading: LayoutNodeDTO? = nil,
    trailing: LayoutNodeDTO? = nil,
    bottom: LayoutNodeDTO? = nil,
    center: LayoutNodeDTO? = nil
  ) {
    self.leading = leading
    self.trailing = trailing
    self.bottom = bottom
    self.center = center
  }
}

// AnyCodable helper để decode props linh hoạt
public struct AnyCodable: Codable {
  public let value: Any

  public init(_ value: Any) {
    self.value = value
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if let string = try? container.decode(String.self) {
      value = string
    } else if let double = try? container.decode(Double.self) {
      value = double
    } else if let bool = try? container.decode(Bool.self) {
      value = bool
    } else if let array = try? container.decode([AnyCodable].self) {
      value = array.map { $0.value }
    } else if let dict = try? container.decode([String: AnyCodable].self) {
      value = dict.mapValues { $0.value }
    } else {
      value = ()
    }
  }

  public func encode(to encoder: Encoder) throws {}
  
  public var stringValue: String? { value as? String }
  public var doubleValue: Double? { value as? Double }
  public var boolValue: Bool? { value as? Bool }
  public var arrayValue: [Any]? { value as? [Any] }
}

// MARK: - SwiftUI Recursive Dynamic Node View

public struct DynamicNodeView: View {
  public let node: LayoutNodeDTO

  public init(node: LayoutNodeDTO) {
    self.node = node
  }

  public var body: some View {
    switch node.type {
    case "VStack":
      renderVStack()
    case "HStack":
      renderHStack()
    case "Text":
      renderText()
    case "Timer":
      renderTimer()
    case "Progress":
      renderProgress()
    case "Image":
      renderImage()
    case "Button":
      renderButton()
    case "Spacer":
      if let minLength = node.props?["minLength"]?.doubleValue {
        Spacer(minLength: CGFloat(minLength))
      } else {
        Spacer()
      }
    default:
      EmptyView()
    }
  }

  @ViewBuilder
  private func renderVStack() -> some View {
    let spacing = node.props?["spacing"]?.doubleValue.map { CGFloat($0) }
    VStack(alignment: .leading, spacing: spacing) {
      if let children = node.children {
        ForEach(0..<children.count, id: \.self) { index in
          DynamicNodeView(node: children[index])
        }
      }
    }
    .modifier(ContainerStyleModifier(props: node.props))
  }

  @ViewBuilder
  private func renderHStack() -> some View {
    let spacing = node.props?["spacing"]?.doubleValue.map { CGFloat($0) }
    HStack(alignment: .center, spacing: spacing) {
      if let children = node.children {
        ForEach(0..<children.count, id: \.self) { index in
          DynamicNodeView(node: children[index])
        }
      }
    }
    .modifier(ContainerStyleModifier(props: node.props))
  }

  @ViewBuilder
  private func renderText() -> some View {
    let text = node.props?["text"]?.stringValue ?? ""
    let colorHex = node.props?["color"]?.stringValue
    let fontSize = node.props?["fontSize"]?.doubleValue ?? 14
    let fontWeightStr = node.props?["fontWeight"]?.stringValue ?? "regular"

    Text(text)
      .font(.system(size: CGFloat(fontSize), weight: parseFontWeight(fontWeightStr)))
      .foregroundColor(colorHex.flatMap { Color(hex: $0) } ?? .primary)
  }

  @ViewBuilder
  private func renderTimer() -> some View {
    let targetTimestamp = node.props?["targetTimestamp"]?.doubleValue ?? 0
    let targetDate = Date(timeIntervalSince1970: targetTimestamp)
    let colorHex = node.props?["color"]?.stringValue
    let fontSize = node.props?["fontSize"]?.doubleValue ?? 14
    let fontWeightStr = node.props?["fontWeight"]?.stringValue ?? "semibold"

    if #available(iOS 16.0, *) {
      Text(timerInterval: min(Date(), targetDate)...max(Date(), targetDate))
        .font(.system(size: CGFloat(fontSize), weight: parseFontWeight(fontWeightStr)))
        .foregroundColor(colorHex.flatMap { Color(hex: $0) } ?? .orange)
        .monospacedDigit()
    } else {
      Text(targetDate, style: .timer)
        .font(.system(size: CGFloat(fontSize), weight: parseFontWeight(fontWeightStr)))
        .foregroundColor(colorHex.flatMap { Color(hex: $0) } ?? .orange)
    }
  }

  @ViewBuilder
  private func renderProgress() -> some View {
    let style = node.props?["style"]?.stringValue ?? "bar"

    if style == "segmented" {
      renderSegmentedProgress()
    } else if style == "circular" {
      renderCircularProgress()
    } else {
      renderBarProgress()
    }
  }

  @ViewBuilder
  private func renderBarProgress() -> some View {
    let countsDown = node.props?["countsDown"]?.boolValue ?? false
    let height = node.props?["height"]?.doubleValue.map { CGFloat($0) } ?? 6
    let cornerRadius = node.props?["borderRadius"]?.doubleValue.map { CGFloat($0) } ?? (height / 2)
    
    // Tính toán màu sắc thông minh: nếu còn dưới warningSeconds thì đổi màu cảnh báo
    let tint = resolveProgressTintColor()

    VStack(alignment: .leading, spacing: 4) {
      if let startTimestamp = node.props?["startTimestamp"]?.doubleValue,
         let targetTimestamp = node.props?["targetTimestamp"]?.doubleValue,
         targetTimestamp > startTimestamp {
        let startDate = Date(timeIntervalSince1970: startTimestamp)
        let targetDate = Date(timeIntervalSince1970: targetTimestamp)

        if #available(iOS 16.0, *) {
          ProgressView(timerInterval: startDate...targetDate, countsDown: countsDown)
            .tint(tint)
            .frame(height: height)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        } else {
          let elapsed = max(0.0, min(1.0, (Date().timeIntervalSince1970 - startTimestamp) / (targetTimestamp - startTimestamp)))
          let progressVal = countsDown ? (1.0 - elapsed) : elapsed
          ProgressView(value: progressVal)
            .tint(tint)
            .frame(height: height)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        }
      } else {
        let value = node.props?["value"]?.doubleValue ?? 0.0
        let clampedValue = max(0.0, min(1.0, value))

        HStack {
          ProgressView(value: clampedValue)
            .tint(tint)
            .frame(height: height)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))

          if node.props?["showPercentage"]?.boolValue == true {
            let pctColorHex = node.props?["percentageColor"]?.stringValue
            Text("\(Int(clampedValue * 100))%")
              .font(.system(size: 11, weight: .bold))
              .foregroundColor(pctColorHex.flatMap { Color(hex: $0) } ?? .secondary)
          }
        }
      }
    }
  }

  @ViewBuilder
  private func renderSegmentedProgress() -> some View {
    let segments = max(1, Int(node.props?["segments"]?.doubleValue ?? 4))
    let value = max(0.0, min(1.0, node.props?["value"]?.doubleValue ?? 0.5))
    let currentSegment: Int = {
      if let explicit = node.props?["currentSegment"]?.doubleValue {
        return Int(explicit)
      }
      return Int(round(value * Double(segments)))
    }()
    let height = node.props?["height"]?.doubleValue.map { CGFloat($0) } ?? 6
    let spacing = node.props?["segmentSpacing"]?.doubleValue.map { CGFloat($0) } ?? 4
    let tint = resolveProgressTintColor()
    let trackHex = node.props?["trackColor"]?.stringValue
    let trackColor = trackHex.flatMap { Color(hex: $0) } ?? Color.gray.opacity(0.3)

    HStack(spacing: 6) {
      HStack(spacing: spacing) {
        ForEach(1...segments, id: \.self) { index in
          RoundedRectangle(cornerRadius: height / 2)
            .fill(index <= currentSegment ? tint : trackColor)
            .frame(height: height)
        }
      }

      if node.props?["showPercentage"]?.boolValue == true {
        let pctColorHex = node.props?["percentageColor"]?.stringValue
        Text("\(Int(round(Double(currentSegment) / Double(segments) * 100)))%")
          .font(.system(size: 11, weight: .bold))
          .foregroundColor(pctColorHex.flatMap { Color(hex: $0) } ?? tint)
      }
    }
  }

  @ViewBuilder
  private func renderCircularProgress() -> some View {
    let value = node.props?["value"]?.doubleValue ?? 0.0
    let clampedValue = max(0.0, min(1.0, value))
    let size = node.props?["height"]?.doubleValue.map { CGFloat($0) } ?? 44
    let lineWidth = max(3, size * 0.11)
    let tint = resolveProgressTintColor()
    let trackHex = node.props?["trackColor"]?.stringValue
    let trackColor = trackHex.flatMap { Color(hex: $0) } ?? Color.gray.opacity(0.25)

    ZStack {
      Circle()
        .stroke(trackColor, lineWidth: lineWidth)
      Circle()
        .trim(from: 0.0, to: CGFloat(clampedValue))
        .stroke(tint, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
        .rotationEffect(.degrees(-90))

      if node.props?["showPercentage"]?.boolValue == true {
        let pctColorHex = node.props?["percentageColor"]?.stringValue
        Text("\(Int(clampedValue * 100))%")
          .font(.system(size: max(9, size * 0.25), weight: .bold))
          .foregroundColor(pctColorHex.flatMap { Color(hex: $0) } ?? tint)
      }
    }
    .frame(width: size, height: size)
  }

  private func resolveProgressTintColor() -> Color {
    let now = Date().timeIntervalSince1970
    if let targetTimestamp = node.props?["targetTimestamp"]?.doubleValue,
       let warningSecs = node.props?["warningSeconds"]?.doubleValue {
      let secondsRemaining = targetTimestamp - now
      if secondsRemaining <= warningSecs {
        let warningHex = node.props?["warningTintColor"]?.stringValue ?? "#FFA500"
        return Color(hex: warningHex) ?? .orange
      }
    }

    let tintHex = node.props?["tintColor"]?.stringValue
    return tintHex.flatMap { Color(hex: $0) } ?? .blue
  }

  @ViewBuilder
  private func renderImage() -> some View {
    let width = node.props?["width"]?.doubleValue.map { CGFloat($0) } ?? 24
    let height = node.props?["height"]?.doubleValue.map { CGFloat($0) } ?? 24
    let tintHex = node.props?["tintColor"]?.stringValue
    let tint = tintHex.flatMap { Color(hex: $0) }

    if let systemName = node.props?["systemName"]?.stringValue {
      Image(systemName: systemName)
        .resizable()
        .aspectRatio(contentMode: .fit)
        .frame(width: width, height: height)
        .foregroundColor(tint ?? .primary)
    } else if let assetName = node.props?["assetName"]?.stringValue {
      Image(assetName)
        .resizable()
        .aspectRatio(contentMode: .fit)
        .frame(width: width, height: height)
    } else if let filePath = node.props?["filePath"]?.stringValue,
              let uiImage = UIImage(contentsOfFile: filePath) {
      Image(uiImage: uiImage)
        .resizable()
        .aspectRatio(contentMode: .fit)
        .frame(width: width, height: height)
    } else {
      EmptyView()
    }
  }

  @ViewBuilder
  private func renderButton() -> some View {
    let rawTitle = node.props?["title"]?.stringValue ?? "Button"
    let actionId = node.props?["actionId"]?.stringValue ?? ""
    let deepLink = node.props?["deepLink"]?.stringValue

    let isToggled: Bool = {
      if actionId.hasPrefix("toggle:") {
        let key = String(actionId.dropFirst(7))
        return DynamicWidgetStateStore.isToggled(key)
      }
      return false
    }()

    let displayTitle: String = {
      if isToggled, let checkedTitle = node.props?["checkedTitle"]?.stringValue {
        return checkedTitle
      }
      return rawTitle
    }()

    let bgHex: String? = {
      if isToggled, let checkedBg = node.props?["checkedBackgroundColor"]?.stringValue {
        return checkedBg
      }
      return node.props?["backgroundColor"]?.stringValue
    }()

    let textHex: String? = {
      if isToggled, let checkedText = node.props?["checkedTextColor"]?.stringValue {
        return checkedText
      }
      return node.props?["textColor"]?.stringValue
    }()

    let fontSize = node.props?["fontSize"]?.doubleValue ?? 12
    let fontWeightStr = node.props?["fontWeight"]?.stringValue ?? "bold"
    let cornerRadius = node.props?["borderRadius"]?.doubleValue.map { CGFloat($0) } ?? 8
    let padH = node.props?["paddingHorizontal"]?.doubleValue.map { CGFloat($0) }
      ?? node.props?["padding"]?.doubleValue.map { CGFloat($0) } ?? 10
    let padV = node.props?["paddingVertical"]?.doubleValue.map { CGFloat($0) }
      ?? node.props?["padding"]?.doubleValue.map { CGFloat($0) } ?? 6
    let fullWidth = node.props?["fullWidth"]?.boolValue ?? false

    let labelView = HStack(spacing: 4) {
      Text(displayTitle)
        .font(.system(size: CGFloat(fontSize), weight: parseFontWeight(fontWeightStr)))
        .foregroundColor(textHex.flatMap { Color(hex: $0) } ?? .white)
        .lineLimit(1)
      if fullWidth {
        Spacer(minLength: 0)
      }
    }
    .padding(.horizontal, padH)
    .padding(.vertical, padV)
    .frame(maxWidth: fullWidth ? .infinity : nil, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: cornerRadius)
        .fill(bgHex.flatMap { Color(hex: $0) } ?? Color.blue)
    )

    if let deepLink = deepLink, let url = URL(string: deepLink) {
      Link(destination: url) {
        labelView
      }
    } else if #available(iOS 17.0, *), !actionId.isEmpty {
      Button(intent: DynamicWidgetActionIntent(actionId: actionId)) {
        labelView
      }
      .buttonStyle(.plain)
    } else {
      labelView
    }
  }

  private func parseFontWeight(_ str: String) -> Font.Weight {
    switch str {
    case "bold": return .bold
    case "semibold": return .semibold
    case "medium": return .medium
    default: return .regular
    }
  }
}

// Container padding, background modifier
struct ContainerStyleModifier: ViewModifier {
  let props: [String: AnyCodable]?

  func body(content: Content) -> some View {
    let pad = props?["padding"]?.doubleValue.map { CGFloat($0) } ?? 0
    let bgHex = props?["backgroundColor"]?.stringValue
    let cornerRadius = props?["borderRadius"]?.doubleValue.map { CGFloat($0) } ?? 0

    content
      .padding(pad)
      .background(
        Group {
          if let bgHex = bgHex, let color = Color(hex: bgHex) {
            RoundedRectangle(cornerRadius: cornerRadius).fill(color)
          }
        }
      )
  }
}

// Extension parse Color từ Hex
extension Color {
  init?(hex: String) {
    var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if hexSanitized.hasPrefix("#") {
      hexSanitized.remove(at: hexSanitized.startIndex)
    }
    var rgb: UInt64 = 0
    guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }

    let r, g, b, a: Double
    if hexSanitized.count == 6 {
      r = Double((rgb & 0xFF0000) >> 16) / 255.0
      g = Double((rgb & 0x00FF00) >> 8) / 255.0
      b = Double(rgb & 0x0000FF) / 255.0
      a = 1.0
    } else if hexSanitized.count == 8 {
      r = Double((rgb & 0xFF000000) >> 24) / 255.0
      g = Double((rgb & 0x00FF0000) >> 16) / 255.0
      b = Double((rgb & 0x0000FF00) >> 8) / 255.0
      a = Double(rgb & 0x000000FF) / 255.0
    } else {
      return nil
    }
    self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
  }
}
