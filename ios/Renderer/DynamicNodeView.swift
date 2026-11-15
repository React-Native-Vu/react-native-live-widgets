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
    case "ZStack":
      renderZStack()
    case "Grid":
      renderGrid()
    case "Divider":
      renderDivider()
    case "Text":
      renderText()
    case "Timer":
      renderTimer()
    case "Progress":
      renderProgress()
    case "Gauge":
      renderGauge()
    case "Chart":
      renderChart()
    case "Image":
      renderImage()
    case "Button":
      renderButton()
    case "Toggle":
      renderToggle()
    case "Badge":
      renderBadge()
    case "Link":
      renderLink()
    case "Equalizer":
      renderEqualizer()
    case "Spacer":
      if let minLength = node.props?["minLength"]?.doubleValue {
        Spacer(minLength: CGFloat(minLength))
      } else {
        Spacer()
      }
    case "Custom":
      renderCustom()
    default:
      if let customView = DynamicNodeRegistry.shared.resolve(node) {
        customView
      } else {
        EmptyView()
      }
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

  // MARK: - New Advanced Native Components (ZStack, Grid, Divider, Gauge, Chart, Toggle, Badge, Link, Custom)

  @ViewBuilder
  private func renderZStack() -> some View {
    let zAlignStr = node.props?["zAlignment"]?.stringValue ?? "center"
    let align: Alignment = {
      switch zAlignStr {
      case "topLeading": return .topLeading
      case "top": return .top
      case "topTrailing": return .topTrailing
      case "leading": return .leading
      case "trailing": return .trailing
      case "bottomLeading": return .bottomLeading
      case "bottom": return .bottom
      case "bottomTrailing": return .bottomTrailing
      default: return .center
      }
    }()
    ZStack(alignment: align) {
      if let children = node.children {
        ForEach(0..<children.count, id: \.self) { index in
          DynamicNodeView(node: children[index])
        }
      }
    }
    .modifier(ContainerStyleModifier(props: node.props))
  }

  @ViewBuilder
  private func renderGrid() -> some View {
    let columnsCount = max(1, Int(node.props?["columns"]?.doubleValue ?? 2))
    let colSpacing = CGFloat(node.props?["columnSpacing"]?.doubleValue ?? node.props?["spacing"]?.doubleValue ?? 8)
    let rowSpacing = CGFloat(node.props?["rowSpacing"]?.doubleValue ?? node.props?["spacing"]?.doubleValue ?? 8)
    let children = node.children ?? []
    let rowsCount = (children.count + columnsCount - 1) / columnsCount

    VStack(alignment: .leading, spacing: rowSpacing) {
      ForEach(0..<rowsCount, id: \.self) { rowIdx in
        HStack(alignment: .top, spacing: colSpacing) {
          ForEach(0..<columnsCount, id: \.self) { colIdx in
            let itemIdx = rowIdx * columnsCount + colIdx
            if itemIdx < children.count {
              DynamicNodeView(node: children[itemIdx])
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
              Spacer(minLength: 0)
                .frame(maxWidth: .infinity)
            }
          }
        }
      }
    }
    .modifier(ContainerStyleModifier(props: node.props))
  }

  @ViewBuilder
  private func renderDivider() -> some View {
    let colorHex = node.props?["color"]?.stringValue
    let color = colorHex.flatMap { Color(hex: $0) } ?? Color.gray.opacity(0.25)
    let thickness = CGFloat(node.props?["thickness"]?.doubleValue ?? 1)
    let direction = node.props?["direction"]?.stringValue ?? "horizontal"
    let marginV = CGFloat(node.props?["marginVertical"]?.doubleValue ?? 2)
    let marginH = CGFloat(node.props?["marginHorizontal"]?.doubleValue ?? 0)

    if direction == "vertical" {
      Rectangle()
        .fill(color)
        .frame(width: thickness)
        .padding(.vertical, marginV)
        .padding(.horizontal, marginH)
    } else {
      Rectangle()
        .fill(color)
        .frame(height: thickness)
        .frame(maxWidth: .infinity)
        .padding(.vertical, marginV)
        .padding(.horizontal, marginH)
    }
  }

  @ViewBuilder
  private func renderGauge() -> some View {
    let rawVal = node.props?["value"]?.doubleValue ?? 0.0
    let clamped = max(0.0, min(1.0, rawVal))
    let size = CGFloat(node.props?["size"]?.doubleValue ?? 64)
    let strokeW = CGFloat(node.props?["strokeWidth"]?.doubleValue ?? max(4, size * 0.11))
    let tintHex = node.props?["tintColor"]?.stringValue
    let tint = tintHex.flatMap { Color(hex: $0) } ?? .blue
    let trackHex = node.props?["trackColor"]?.stringValue
    let track = trackHex.flatMap { Color(hex: $0) } ?? Color.gray.opacity(0.25)
    let textHex = node.props?["textColor"]?.stringValue
    let textColor = textHex.flatMap { Color(hex: $0) } ?? .primary
    let labelHex = node.props?["labelColor"]?.stringValue
    let labelColor = labelHex.flatMap { Color(hex: $0) } ?? .secondary
    let valueText = node.props?["valueText"]?.stringValue ?? "\(Int(round(clamped * 100)))%"
    let label = node.props?["label"]?.stringValue

    ZStack {
      // Cung đồng hồ 240 độ (từ 150 độ đến 390 độ -> tương đương trim 0.0 -> 0.667 xoay 150 độ)
      Circle()
        .trim(from: 0.0, to: 0.68)
        .stroke(track, style: StrokeStyle(lineWidth: strokeW, lineCap: .round))
        .rotationEffect(.degrees(146))

      Circle()
        .trim(from: 0.0, to: CGFloat(clamped) * 0.68)
        .stroke(tint, style: StrokeStyle(lineWidth: strokeW, lineCap: .round))
        .rotationEffect(.degrees(146))

      VStack(spacing: 1) {
        Text(valueText)
          .font(.system(size: max(10, size * 0.24), weight: .bold))
          .foregroundColor(textColor)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        if let label = label, !label.isEmpty {
          Text(label)
            .font(.system(size: max(8, size * 0.16), weight: .semibold))
            .foregroundColor(labelColor)
            .lineLimit(1)
        }
      }
      .offset(y: size * 0.04)
    }
    .frame(width: size, height: size)
  }

  @ViewBuilder
  private func renderChart() -> some View {
    let style = node.props?["style"]?.stringValue ?? "bar"
    let values = node.props?["values"]?.doubleArrayValue ?? []
    let labels = node.props?["labels"]?.stringArrayValue ?? []
    let height = CGFloat(node.props?["height"]?.doubleValue ?? 56)
    let tintHex = node.props?["tintColor"]?.stringValue
    let tint = tintHex.flatMap { Color(hex: $0) } ?? .blue
    let secondaryHex = node.props?["secondaryColor"]?.stringValue
    let secondary = secondaryHex.flatMap { Color(hex: $0) } ?? tint.opacity(0.22)
    let labelHex = node.props?["labelColor"]?.stringValue
    let labelColor = labelHex.flatMap { Color(hex: $0) } ?? .secondary
    let maxVal = max(values.max() ?? 1.0, 0.0001)

    VStack(spacing: 4) {
      if style == "line", values.count >= 2 {
        GeometryReader { geo in
          let w = geo.size.width
          let h = geo.size.height
          let stepX = w / CGFloat(max(1, values.count - 1))

          ZStack {
            // Vùng tô mờ phía dưới đường Sparkline
            Path { path in
              path.move(to: CGPoint(x: 0, y: h))
              for (idx, val) in values.enumerated() {
                let x = CGFloat(idx) * stepX
                let y = h - CGFloat(max(0, val) / maxVal) * (h - 6) - 3
                path.addLine(to: CGPoint(x: x, y: y))
              }
              path.addLine(to: CGPoint(x: w, y: h))
              path.closeSubpath()
            }
            .fill(secondary)

            // Đường kẻ chính
            Path { path in
              for (idx, val) in values.enumerated() {
                let x = CGFloat(idx) * stepX
                let y = h - CGFloat(max(0, val) / maxVal) * (h - 6) - 3
                if idx == 0 {
                  path.move(to: CGPoint(x: x, y: y))
                } else {
                  path.addLine(to: CGPoint(x: x, y: y))
                }
              }
            }
            .stroke(tint, style: StrokeStyle(lineWidth: 2.2, lineCap: .round, lineJoin: .round))
          }
        }
        .frame(height: height)
      } else {
        // Biểu đồ cột (Bar Chart)
        HStack(alignment: .bottom, spacing: 6) {
          ForEach(0..<values.count, id: \.self) { idx in
            let ratio = CGFloat(max(0.08, values[idx] / maxVal))
            let isLast = idx == values.count - 1
            VStack(spacing: 3) {
              Spacer(minLength: 0)
              RoundedRectangle(cornerRadius: 4)
                .fill(isLast ? tint : secondary)
                .frame(height: max(4, height * ratio))
            }
            .frame(maxWidth: .infinity)
          }
        }
        .frame(height: height)
      }

      if !labels.isEmpty {
        HStack(spacing: 4) {
          ForEach(0..<min(labels.count, max(1, values.count)), id: \.self) { idx in
            Text(labels[idx])
              .font(.system(size: 9, weight: .semibold))
              .foregroundColor(labelColor)
              .lineLimit(1)
              .frame(maxWidth: .infinity)
          }
        }
      }
    }
  }

  @ViewBuilder
  private func renderToggle() -> some View {
    let rawActionId = node.props?["actionId"]?.stringValue ?? "toggle:default"
    let normalizedActionId = rawActionId.hasPrefix("toggle:") ? rawActionId : "toggle:\(rawActionId)"
    let itemKey = String(normalizedActionId.dropFirst(7))
    let isChecked = DynamicWidgetStateStore.isToggled(itemKey) || (node.props?["checked"]?.boolValue == true && DynamicWidgetStateStore.loadState().toggledItems[itemKey] == nil)
    let label = node.props?["label"]?.stringValue ?? ""
    let subtitle = node.props?["subtitle"]?.stringValue
    let style = node.props?["style"]?.stringValue ?? "checkbox"
    let tintHex = node.props?["tintColor"]?.stringValue
    let tint = tintHex.flatMap { Color(hex: $0) } ?? .green
    let textHex = node.props?["textColor"]?.stringValue
    let checkedTextHex = node.props?["checkedTextColor"]?.stringValue
    let fontSize = CGFloat(node.props?["fontSize"]?.doubleValue ?? 12)
    let strikethrough = node.props?["strikethroughOnCheck"]?.boolValue ?? true

    let rowView = HStack(spacing: 8) {
      if style == "switch" {
        ZStack(alignment: isChecked ? .trailing : .leading) {
          Capsule()
            .fill(isChecked ? tint : Color.gray.opacity(0.35))
            .frame(width: 32, height: 18)
          Circle()
            .fill(Color.white)
            .frame(width: 14, height: 14)
            .padding(.horizontal, 2)
        }
      } else {
        Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
          .font(.system(size: fontSize + 3, weight: .bold))
          .foregroundColor(isChecked ? tint : Color.gray.opacity(0.6))
      }

      VStack(alignment: .leading, spacing: 1) {
        Text(label)
          .font(.system(size: fontSize, weight: isChecked ? .regular : .semibold))
          .strikethrough(isChecked && strikethrough)
          .foregroundColor(
            isChecked
              ? (checkedTextHex.flatMap { Color(hex: $0) } ?? .secondary)
              : (textHex.flatMap { Color(hex: $0) } ?? .primary)
          )
          .lineLimit(1)
        if let subtitle = subtitle, !subtitle.isEmpty {
          Text(subtitle)
            .font(.system(size: max(9, fontSize - 2)))
            .foregroundColor(.secondary)
            .lineLimit(1)
        }
      }
      Spacer(minLength: 0)
    }

    if #available(iOS 17.0, *) {
      Button(intent: DynamicWidgetActionIntent(actionId: normalizedActionId)) {
        rowView
      }
      .buttonStyle(.plain)
    } else {
      rowView
    }
  }

  @ViewBuilder
  private func renderBadge() -> some View {
    let text = node.props?["text"]?.stringValue ?? ""
    let systemName = node.props?["systemName"]?.stringValue
    let bgHex = node.props?["backgroundColor"]?.stringValue
    let bgColor = bgHex.flatMap { Color(hex: $0) } ?? Color.blue.opacity(0.15)
    let textHex = node.props?["textColor"]?.stringValue
    let textColor = textHex.flatMap { Color(hex: $0) } ?? .blue
    let borderHex = node.props?["borderColor"]?.stringValue
    let borderW = CGFloat(node.props?["borderWidth"]?.doubleValue ?? (borderHex != nil ? 1 : 0))
    let fontSize = CGFloat(node.props?["fontSize"]?.doubleValue ?? 10)
    let padH = CGFloat(node.props?["paddingHorizontal"]?.doubleValue ?? 8)
    let padV = CGFloat(node.props?["paddingVertical"]?.doubleValue ?? 3)
    let cornerRadius = CGFloat(node.props?["borderRadius"]?.doubleValue ?? 999)

    HStack(spacing: 4) {
      if let systemName = systemName, !systemName.isEmpty {
        Image(systemName: systemName)
          .font(.system(size: fontSize, weight: .bold))
          .foregroundColor(textColor)
      }
      Text(text)
        .font(.system(size: fontSize, weight: .bold))
        .foregroundColor(textColor)
        .lineLimit(1)
    }
    .padding(.horizontal, padH)
    .padding(.vertical, padV)
    .background(
      RoundedRectangle(cornerRadius: cornerRadius)
        .fill(bgColor)
    )
    .overlay(
      Group {
        if borderW > 0, let borderHex = borderHex, let bColor = Color(hex: borderHex) {
          RoundedRectangle(cornerRadius: cornerRadius)
            .stroke(bColor, lineWidth: borderW)
        }
      }
    )
  }

  @ViewBuilder
  private func renderLink() -> some View {
    let deepLink = node.props?["deepLink"]?.stringValue
    let actionId = node.props?["actionId"]?.stringValue ?? ""
    let spacing = node.props?["spacing"]?.doubleValue.map { CGFloat($0) }

    let innerContent = VStack(alignment: .leading, spacing: spacing) {
      if let children = node.children {
        ForEach(0..<children.count, id: \.self) { index in
          DynamicNodeView(node: children[index])
        }
      }
    }
    .modifier(ContainerStyleModifier(props: node.props))

    if let deepLink = deepLink, let url = URL(string: deepLink) {
      Link(destination: url) {
        innerContent
      }
    } else if #available(iOS 17.0, *), !actionId.isEmpty {
      Button(intent: DynamicWidgetActionIntent(actionId: actionId)) {
        innerContent
      }
      .buttonStyle(.plain)
    } else {
      innerContent
    }
  }

  @ViewBuilder
  private func renderEqualizer() -> some View {
    let isPlaying = node.props?["isPlaying"]?.boolValue ?? true
    let barCount = max(2, min(12, Int(node.props?["barCount"]?.doubleValue ?? 4)))
    let tintHex = node.props?["tintColor"]?.stringValue
    let tint = tintHex.flatMap { Color(hex: $0) } ?? Color(hex: "#10B981") ?? .green
    let maxHeight = CGFloat(node.props?["height"]?.doubleValue ?? 16)
    let barWidth = CGFloat(node.props?["barWidth"]?.doubleValue ?? 3)
    let spacing = CGFloat(node.props?["spacing"]?.doubleValue ?? 2)

    if #available(iOS 15.0, *) {
      AnimatedEqualizerView(
        isPlaying: isPlaying,
        barCount: barCount,
        tintColor: tint,
        maxHeight: maxHeight,
        barWidth: barWidth,
        spacing: spacing
      )
    } else {
      StaticEqualizerView(
        barCount: barCount,
        tintColor: tint,
        maxHeight: maxHeight,
        barWidth: barWidth,
        spacing: spacing
      )
    }
  }

  @ViewBuilder
  private func renderCustom() -> some View {
    if let registeredView = DynamicNodeRegistry.shared.resolve(node) {
      registeredView
    } else if let children = node.children, !children.isEmpty {
      VStack(alignment: .leading, spacing: 6) {
        ForEach(0..<children.count, id: \.self) { index in
          DynamicNodeView(node: children[index])
        }
      }
      .modifier(ContainerStyleModifier(props: node.props))
    } else {
      let compName = node.props?["componentName"]?.stringValue ?? "CustomView"
      let title = node.props?["title"]?.stringValue ?? compName
      let subtitle = node.props?["subtitle"]?.stringValue
      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.system(size: 12, weight: .bold))
          .foregroundColor(.primary)
        if let subtitle = subtitle {
          Text(subtitle)
            .font(.system(size: 10))
            .foregroundColor(.secondary)
        }
      }
      .modifier(ContainerStyleModifier(props: node.props))
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
  @Environment(\.widgetFamily) var family
  let props: [String: AnyCodable]?

  private var isAccessory: Bool {
    if #available(iOS 16.0, *) {
      return family == .accessoryRectangular || family == .accessoryCircular || family == .accessoryInline
    }
    return false
  }

  func body(content: Content) -> some View {
    let rawPad = props?["padding"]?.doubleValue.map { CGFloat($0) } ?? 0
    let pad = isAccessory ? min(rawPad, 2) : rawPad
    // Trên Lock Screen widgets, nền luôn trong suốt để hiển thị tự nhiên trên hình nền điện thoại
    let bgHex = isAccessory ? nil : props?["backgroundColor"]?.stringValue
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

// MARK: - Animated Equalizer Components (Audio Waveform for Live Activity & Dynamic Island)

@available(iOS 15.0, *)
struct AnimatedEqualizerView: View {
  let isPlaying: Bool
  let barCount: Int
  let tintColor: Color
  let maxHeight: CGFloat
  let barWidth: CGFloat
  let spacing: CGFloat

  var body: some View {
    if isPlaying {
      TimelineView(.animation(minimumInterval: 0.16)) { timeline in
        let time = timeline.date.timeIntervalSinceReferenceDate
        HStack(alignment: .bottom, spacing: spacing) {
          ForEach(0..<barCount, id: \.self) { idx in
            let phase = time * 6.5 + Double(idx) * 1.85
            let wave = sin(phase) * 0.44 + 0.56
            let h = max(barWidth, CGFloat(wave) * maxHeight)
            RoundedRectangle(cornerRadius: barWidth / 2)
              .fill(tintColor)
              .frame(width: barWidth, height: h)
          }
        }
      }
      .frame(height: maxHeight)
    } else {
      StaticEqualizerView(
        barCount: barCount,
        tintColor: tintColor.opacity(0.5),
        maxHeight: maxHeight,
        barWidth: barWidth,
        spacing: spacing
      )
    }
  }
}

struct StaticEqualizerView: View {
  let barCount: Int
  let tintColor: Color
  let maxHeight: CGFloat
  let barWidth: CGFloat
  let spacing: CGFloat

  private let defaultRatios: [CGFloat] = [0.4, 0.85, 0.55, 0.7, 0.35, 0.9, 0.6]

  var body: some View {
    HStack(alignment: .bottom, spacing: spacing) {
      ForEach(0..<barCount, id: \.self) { idx in
        let ratio = defaultRatios[idx % defaultRatios.count]
        RoundedRectangle(cornerRadius: barWidth / 2)
          .fill(tintColor)
          .frame(width: barWidth, height: max(barWidth, maxHeight * ratio))
      }
    }
    .frame(height: maxHeight)
  }
}

