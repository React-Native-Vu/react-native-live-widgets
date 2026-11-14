import ActivityKit
import Foundation
import React
import WidgetKit

@objc(LiveActivityModule)
public class LiveActivityModule: RCTEventEmitter {
  private static var currentPushToStartToken: String?
  private static var isObservingTokens = false
  private var hasListeners = false

  public override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  public override func supportedEvents() -> [String]! {
    return ["LiveActivityTokenChanged", "LiveActivityActionClicked"]
  }

  public override func startObserving() {
    hasListeners = true
  }

  public override func stopObserving() {
    hasListeners = false
  }

  // MARK: - Live Activity Lifecycle

  @objc(start:payloadJson:resolver:rejecter:)
  public func start(
    activityId: String,
    payloadJson: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      reject("E_ACTIVITY_DISABLED", "Live Activities are disabled in system settings", nil)
      return
    }

    let attributes = DynamicActivityAttributes(activityId: activityId)
    let initialContentState = DynamicActivityAttributes.ContentState(payloadJson: payloadJson)

    do {
      let activity = try Activity.request(
        attributes: attributes,
        content: .init(state: initialContentState, staleDate: nil),
        pushType: .token
      )

      Task {
        for await pushToken in activity.pushTokenUpdates {
          let tokenStr = pushToken.map { String(format: "%02x", $0) }.joined()
          NSLog("🔔 [LiveActivityModule] Activity Push Token: \(tokenStr)")
        }
      }

      resolve(true)
    } catch {
      reject("E_START_FAILED", error.localizedDescription, error)
    }
  }

  @objc(update:payloadJson:resolver:rejecter:)
  public func update(
    activityId: String,
    payloadJson: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    let updatedState = DynamicActivityAttributes.ContentState(payloadJson: payloadJson)

    Task {
      for activity in Activity<DynamicActivityAttributes>.activities {
        if activity.attributes.activityId == activityId {
          await activity.update(.init(state: updatedState, staleDate: nil))
        }
      }
      resolve(true)
    }
  }

  @objc(end:resolver:rejecter:)
  public func end(
    activityId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    Task {
      for activity in Activity<DynamicActivityAttributes>.activities {
        if activity.attributes.activityId == activityId {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
      }
      resolve(true)
    }
  }

  @objc(endAll:rejecter:)
  public func endAll(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    Task {
      for activity in Activity<DynamicActivityAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      resolve(true)
    }
  }

  // MARK: - Push to Start Token (iOS 17.2+)

  @objc(getPushToStartToken:rejecter:)
  public func getPushToStartToken(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 17.2, *) {
      startObservingPushToStartTokenIfNeeded()
      resolve(Self.currentPushToStartToken)
    } else {
      resolve(nil)
    }
  }

  private func startObservingPushToStartTokenIfNeeded() {
    guard #available(iOS 17.2, *), !Self.isObservingTokens else { return }
    Self.isObservingTokens = true

    Task {
      for await tokenData in Activity<DynamicActivityAttributes>.pushToStartTokenUpdates {
        let tokenStr = tokenData.map { String(format: "%02x", $0) }.joined()
        Self.currentPushToStartToken = tokenStr

        if hasListeners {
          sendEvent(withName: "LiveActivityTokenChanged", body: tokenStr)
        }
      }
    }
  }

  // MARK: - Home Screen Widgets

  @objc(reloadAllWidgets:rejecter:)
  public func reloadAllWidgets(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    WidgetCenter.shared.reloadAllTimelines()
    resolve(true)
  }

  @objc(reloadWidget:resolver:rejecter:)
  public func reloadWidget(
    kind: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    WidgetCenter.shared.reloadTimelines(ofKind: kind)
    resolve(true)
  }

  // MARK: - Shared Storage (App Group)

  @objc(setSharedItem:value:appGroup:resolver:rejecter:)
  public func setSharedItem(
    key: String,
    value: String,
    appGroup: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = getDefaults(appGroup: appGroup)
    defaults.set(value, forKey: key)
    defaults.synchronize()

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(key).json"
    try? value.write(toFile: simPath, atomically: true, encoding: .utf8)
    #endif

    resolve(true)
  }

  @objc(getSharedItem:appGroup:resolver:rejecter:)
  public func getSharedItem(
    key: String,
    appGroup: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = getDefaults(appGroup: appGroup)
    if let value = defaults.string(forKey: key) {
      resolve(value)
      return
    }

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(key).json"
    if let simVal = try? String(contentsOfFile: simPath, encoding: .utf8) {
      resolve(simVal)
      return
    }
    #endif

    resolve(nil)
  }

  @objc(removeSharedItem:appGroup:resolver:rejecter:)
  public func removeSharedItem(
    key: String,
    appGroup: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = getDefaults(appGroup: appGroup)
    defaults.removeObject(forKey: key)

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(key).json"
    try? FileManager.default.removeItem(atPath: simPath)
    #endif

    resolve(true)
  }

  @objc(clearSharedItems:resolver:rejecter:)
  public func clearSharedItems(
    appGroup: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = getDefaults(appGroup: appGroup)
    let dict = defaults.dictionaryRepresentation()
    for key in dict.keys {
      defaults.removeObject(forKey: key)
    }
    resolve(true)
  }

  private func getDefaults(appGroup: String) -> UserDefaults {
    let resolvedGroup = DynamicWidgetProvider.resolveAppGroup(appGroup)
    if !resolvedGroup.isEmpty, let groupDefaults = UserDefaults(suiteName: resolvedGroup) {
      return groupDefaults
    }
    return UserDefaults.standard
  }
}
