import AppIntents
import SwiftUI
import UIKit
import WidgetKit

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
    let numberOfLines = node.props?["numberOfLines"]?.doubleValue.map { Int($0) }

    Text(text)
      .font(.system(size: CGFloat(fontSize), weight: parseFontWeight(fontWeightStr)))
      .foregroundColor(colorHex.flatMap { Color(hex: $0) } ?? .primary)
      .lineLimit(numberOfLines)
      .minimumScaleFactor(0.85)
  }

  @ViewBuilder
  private func renderTimer() -> some View {
    let targetTimestamp = node.props?["targetTimestamp"]?.doubleValue ?? 0
    let targetDate = Date(timeIntervalSince1970: targetTimestamp)
    let colorHex = node.props?["color"]?.stringValue
    let fontSize = node.props?["fontSize"]?.doubleValue ?? 14
    let fontWeightStr = node.props?["fontWeight"]?.stringValue ?? "semibold"
    let mode = node.props?["mode"]?.stringValue ?? "countdown"
    let isCountdown = mode != "countup"

    // Giới hạn frame width cho Text(timerInterval:) để không bị giãn tràn toàn bộ Dynamic Island
    let remaining = abs(targetTimestamp - Date().timeIntervalSince1970)
    let showsHours = remaining >= 3600
    let compactWidth = CGFloat(fontSize) * (showsHours ? 4.4 : 3.2)

    if #available(iOS 16.0, *) {
      Text(
        timerInterval: min(Date(), targetDate)...max(Date(), targetDate),
        pauseTime: nil,
        countsDown: isCountdown,
        showsHours: showsHours
      )
      .font(.system(size: CGFloat(fontSize), weight: parseFontWeight(fontWeightStr)))
      .foregroundColor(colorHex.flatMap { Color(hex: $0) } ?? .orange)
      .monospacedDigit()
      .multilineTextAlignment(.trailing)
      .frame(width: compactWidth, alignment: .trailing)
      .minimumScaleFactor(0.8)
    } else {
      Text(targetDate, style: .timer)
        .font(.system(size: CGFloat(fontSize), weight: parseFontWeight(fontWeightStr)))
        .foregroundColor(colorHex.flatMap { Color(hex: $0) } ?? .orange)
        .multilineTextAlignment(.trailing)
        .frame(width: compactWidth, alignment: .trailing)
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
    let width = node.props?["width"]?.doubleValue.map { CGFloat($0) } ?? 28
    let height = node.props?["height"]?.doubleValue.map { CGFloat($0) } ?? 28
    let tintHex = node.props?["tintColor"]?.stringValue
    let tint = tintHex.flatMap { Color(hex: $0) }
    let bgHex = node.props?["backgroundColor"]?.stringValue
    let bgColor = bgHex.flatMap { Color(hex: $0) }
    let pad = node.props?["padding"]?.doubleValue.map { CGFloat($0) } ?? 0
    let cornerRadius = node.props?["borderRadius"]?.doubleValue.map { CGFloat($0) } ?? 0
    let borderWidth = node.props?["borderWidth"]?.doubleValue.map { CGFloat($0) } ?? 0
    let borderColorHex = node.props?["borderColor"]?.stringValue
    let borderColor = borderColorHex.flatMap { Color(hex: $0) } ?? .white
    let contentModeStr = node.props?["contentMode"]?.stringValue ?? "fill"
    let isFill = contentModeStr == "fill"

    if let uiImage = resolveBitmapImage() {
      Image(uiImage: uiImage)
        .resizable()
        .aspectRatio(contentMode: isFill ? .fill : .fit)
        .frame(width: width, height: height)
        .background(bgColor ?? Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        .overlay(
          Group {
            if borderWidth > 0 {
              RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(borderColor, lineWidth: borderWidth)
            }
          }
        )
    } else if let symbolName = node.props?["systemName"]?.stringValue
                ?? node.props?["fallbackSystemName"]?.stringValue {
      Image(systemName: symbolName)
        .resizable()
        .aspectRatio(contentMode: .fit)
        .padding(pad)
        .frame(width: width, height: height)
        .foregroundColor(tint ?? .primary)
        .background(
          Group {
            if let bgColor = bgColor {
              RoundedRectangle(cornerRadius: cornerRadius).fill(bgColor)
            }
          }
        )
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        .overlay(
          Group {
            if borderWidth > 0 {
              RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(borderColor, lineWidth: borderWidth)
            }
          }
        )
    } else {
      RoundedRectangle(cornerRadius: cornerRadius)
        .fill(bgColor ?? Color.gray.opacity(0.2))
        .frame(width: width, height: height)
        .overlay(
          Image(systemName: "photo")
            .font(.system(size: min(width, height) * 0.45))
            .foregroundColor(tint ?? .secondary)
        )
    }
  }

  private func resolveBitmapImage() -> UIImage? {
    if let urlStr = node.props?["url"]?.stringValue,
       let cached = DynamicWidgetImageCache.cachedImage(for: urlStr) {
      return cached
    }

    if let base64Str = node.props?["base64"]?.stringValue {
      let cleanBase64: String = {
        if let commaRange = base64Str.range(of: ",") {
          return String(base64Str[commaRange.upperBound...])
        }
        return base64Str
      }()
      if let data = Data(base64Encoded: cleanBase64, options: .ignoreUnknownCharacters),
         let img = UIImage(data: data) {
        return img
      }
    }

    if let filePath = node.props?["filePath"]?.stringValue,
       let img = UIImage(contentsOfFile: filePath) {
      return img
    }

    if let assetName = node.props?["assetName"]?.stringValue,
       let img = UIImage(named: assetName) {
      return img
    }

    return nil
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
