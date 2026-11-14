import SwiftUI
import WidgetKit

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
    let segments = Int(node.props?["segments"]?.doubleValue ?? 4)
    let currentSegment = Int(node.props?["currentSegment"]?.doubleValue ?? 1)
    let height = node.props?["height"]?.doubleValue.map { CGFloat($0) } ?? 6
    let spacing = node.props?["segmentSpacing"]?.doubleValue.map { CGFloat($0) } ?? 4
    let tint = resolveProgressTintColor()
    let trackHex = node.props?["trackColor"]?.stringValue
    let trackColor = trackHex.flatMap { Color(hex: $0) } ?? Color.gray.opacity(0.3)

    HStack(spacing: spacing) {
      ForEach(1...max(1, segments), id: \.self) { index in
        RoundedRectangle(cornerRadius: height / 2)
          .fill(index <= currentSegment ? tint : trackColor)
          .frame(height: height)
      }
    }
  }

  @ViewBuilder
  private func renderCircularProgress() -> some View {
    let value = node.props?["value"]?.doubleValue ?? 0.0
    let clampedValue = max(0.0, min(1.0, value))
    let tint = resolveProgressTintColor()

    ZStack {
      Circle()
        .stroke(Color.gray.opacity(0.3), lineWidth: 4)
      Circle()
        .trim(from: 0.0, to: CGFloat(clampedValue))
        .stroke(tint, style: StrokeStyle(lineWidth: 4, lineCap: .round))
        .rotationEffect(.degrees(-90))

      if node.props?["showPercentage"]?.boolValue == true {
        Text("\(Int(clampedValue * 100))%")
          .font(.system(size: 10, weight: .bold))
          .foregroundColor(tint)
      }
    }
    .frame(width: 32, height: 32)
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
