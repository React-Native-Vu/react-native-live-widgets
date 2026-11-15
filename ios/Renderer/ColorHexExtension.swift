import SwiftUI

// MARK: - SwiftUI Color Hex Parser

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

  /// Tự động resolve màu theo chuỗi Hex đơn hoặc Object Dynamic Color { light: "...", dark: "..." }
  static func resolve(from anyCodable: AnyCodable?, colorScheme: ColorScheme? = nil) -> Color? {
    guard let anyCodable = anyCodable else { return nil }
    if let hex = anyCodable.stringValue {
      return Color(hex: hex)
    }
    if let dict = anyCodable.value as? [String: Any] {
      let schemeKey = (colorScheme == .dark) ? "dark" : "light"
      if let hex = dict[schemeKey] as? String {
        return Color(hex: hex)
      }
      if let fallbackHex = dict["light"] as? String ?? dict["dark"] as? String {
        return Color(hex: fallbackHex)
      }
    }
    return nil
  }
}

