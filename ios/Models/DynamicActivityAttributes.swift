import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct DynamicActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Chuỗi JSON biểu diễn toàn bộ cây giao diện (LockScreen, DynamicIsland, Phases)
    public var payloadJson: String

    public init(payloadJson: String) {
      self.payloadJson = payloadJson
    }
  }

  /// ID phân biệt các Activity khác nhau (vd orderId, shiftId)
  public var activityId: String

  public init(activityId: String) {
    self.activityId = activityId
  }
}

