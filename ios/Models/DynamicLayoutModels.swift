import Foundation

// MARK: - Declarative Layout Models (Shared between Live Activity & Home Screen Widgets)

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

// MARK: - Multi-Page Home Screen Widget & Remote Sync DTOs

public struct WidgetSinglePageDTO: Codable {
  public let small: LayoutNodeDTO?
  public let medium: LayoutNodeDTO?
  public let large: LayoutNodeDTO?
  public let accessoryRectangular: LayoutNodeDTO?
  public let accessoryCircular: LayoutNodeDTO?
  public let accessoryInline: LayoutNodeDTO?
}

public struct WidgetMultiPagePayloadDTO: Codable {
  public let small: LayoutNodeDTO?
  public let medium: LayoutNodeDTO?
  public let large: LayoutNodeDTO?
  public let accessoryRectangular: LayoutNodeDTO?
  public let accessoryCircular: LayoutNodeDTO?
  public let accessoryInline: LayoutNodeDTO?
  public let pages: [String: WidgetSinglePageDTO]?
  public let pageOrder: [String]?
  public let initialPage: String?
  public let rootDeepLink: String?
  public let containerBackground: WidgetContainerBackgroundDTO?
}

public struct WidgetContainerBackgroundDTO: Codable {
  public let backgroundColor: AnyCodable?
  public let gradientColors: [String]?
}

// MARK: - Timeline Entries DTO (Widget Timeline Provider)

public struct WidgetTimelineEntryDTO: Codable {
  public let date: Double
  public let layout: WidgetMultiPagePayloadDTO
}

public struct WidgetTimelineConfigDTO: Codable {
  public let entries: [WidgetTimelineEntryDTO]
  public let policy: String?
  public let afterDate: Double?
}

public struct WidgetRemoteConfigDTO: Codable {
  public let url: String
  public let method: String?
  public let headers: [String: String]?
  public let refreshIntervalMinutes: Int?
}

public struct InteractiveWidgetState: Codable {
  public var activePage: String?
  public var pageOrder: [String]?
  public var toggledItems: [String: Bool]
  public var lastActionId: String?
  public var lastSyncTime: String?
  public var remoteVariables: [String: String]?
  public var updatedAt: Double

  public init(
    activePage: String? = nil,
    pageOrder: [String]? = nil,
    toggledItems: [String: Bool] = [:],
    lastActionId: String? = nil,
    lastSyncTime: String? = nil,
    remoteVariables: [String: String]? = nil,
    updatedAt: Double = Date().timeIntervalSince1970
  ) {
    self.activePage = activePage
    self.pageOrder = pageOrder
    self.toggledItems = toggledItems
    self.lastActionId = lastActionId
    self.lastSyncTime = lastSyncTime
    self.remoteVariables = remoteVariables
    self.updatedAt = updatedAt
  }
}

// MARK: - AnyCodable Helper

public struct AnyCodingKey: CodingKey {
  public var stringValue: String
  public var intValue: Int?

  public init?(stringValue: String) {
    self.stringValue = stringValue
    self.intValue = nil
  }

  public init?(intValue: Int) {
    self.stringValue = "\(intValue)"
    self.intValue = intValue
  }
}

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

  public func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    if let str = value as? String {
      try container.encode(str)
    } else if let bool = value as? Bool {
      try container.encode(bool)
    } else if let int = value as? Int {
      try container.encode(int)
    } else if let double = value as? Double {
      try container.encode(double)
    } else if let dict = value as? [String: Any] {
      var keyedContainer = encoder.container(keyedBy: AnyCodingKey.self)
      for (k, v) in dict {
        if let key = AnyCodingKey(stringValue: k) {
          try keyedContainer.encode(AnyCodable(v), forKey: key)
        }
      }
    } else if let arr = value as? [Any] {
      var unkeyedContainer = encoder.unkeyedContainer()
      for item in arr {
        try unkeyedContainer.encode(AnyCodable(item))
      }
    } else {
      try container.encodeNil()
    }
  }

  public var stringValue: String? { value as? String }
  public var doubleValue: Double? { value as? Double }
  public var boolValue: Bool? { value as? Bool }
  public var arrayValue: [Any]? { value as? [Any] }
  public var doubleArrayValue: [Double]? {
    guard let arr = value as? [Any] else { return nil }
    return arr.compactMap { item in
      if let d = item as? Double { return d }
      if let i = item as? Int { return Double(i) }
      if let n = item as? NSNumber { return n.doubleValue }
      if let s = item as? String { return Double(s) }
      return nil
    }
  }
  public var stringArrayValue: [String]? {
    guard let arr = value as? [Any] else { return nil }
    return arr.compactMap { item in
      if let s = item as? String { return s }
      if let n = item as? NSNumber { return n.stringValue }
      return nil
    }
  }
}

