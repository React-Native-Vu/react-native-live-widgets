import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.1, *)
public struct DynamicLiveActivityWidget: Widget {
  public init() {}

  public var body: some WidgetConfiguration {
    ActivityConfiguration(for: DynamicActivityAttributes.self) { context in
      // Render Lock Screen
      let payload = parsePayload(json: context.state.payloadJson)
      if let lockScreen = payload?.lockScreen {
        DynamicNodeView(node: lockScreen)
          .activityBackgroundTint(.black.opacity(0.8))
          .activitySystemActionForegroundColor(.white)
      } else {
        Text("Live Activity")
      }
    } dynamicIsland: { context in
      let payload = parsePayload(json: context.state.payloadJson)
      let island = payload?.dynamicIsland

      return DynamicIsland {
        // Expanded Regions với Safe Padding & Smart Fallback tránh tình trạng Dynamic Island bị đen trống rỗng
        DynamicIslandExpandedRegion(.leading) {
          if let leading = island?.expanded?.leading ?? island?.compactLeading {
            DynamicNodeView(node: leading)
              .padding(.leading, 6)
              .padding(.top, 4)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          if let trailing = island?.expanded?.trailing ?? island?.compactTrailing {
            DynamicNodeView(node: trailing)
              .padding(.trailing, 6)
              .padding(.top, 4)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          if let bottom = island?.expanded?.bottom ?? payload?.lockScreen {
            DynamicNodeView(node: bottom)
              .padding(.horizontal, 8)
              .padding(.bottom, 6)
          }
        }
        DynamicIslandExpandedRegion(.center) {
          if let center = island?.expanded?.center {
            DynamicNodeView(node: center)
              .padding(.top, 4)
          }
        }
      } compactLeading: {
        if let leading = island?.compactLeading {
          DynamicNodeView(node: leading)
            .fixedSize(horizontal: true, vertical: false)
            .padding(.leading, 2)
        }
      } compactTrailing: {
        if let trailing = island?.compactTrailing {
          DynamicNodeView(node: trailing)
            .fixedSize(horizontal: true, vertical: false)
            .padding(.trailing, 2)
        }
      } minimal: {
        if let minimal = island?.minimal ?? island?.compactLeading {
          DynamicNodeView(node: minimal)
            .fixedSize(horizontal: true, vertical: false)
        }
      }
    }
  }

  private func parsePayload(json: String) -> DynamicPayloadDTO? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(DynamicPayloadDTO.self, from: data)
  }
}

