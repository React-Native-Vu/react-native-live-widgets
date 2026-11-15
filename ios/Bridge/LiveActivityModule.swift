import ActivityKit
import Foundation
import React
import UIKit
import UserNotifications
import WidgetKit

@objc(LiveActivityModule)
public class LiveActivityModule: RCTEventEmitter {
  private static var currentDevicePushToken: String?
  private static var currentPushToStartToken: String?
  private static var activityUpdateTokens: [String: String] = [:]
  private static var isObservingTokens = false
  private static var isObservingActivities = false
  private var hasListeners = false

  public override init() {
    super.init()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleDeviceTokenNotification(_:)),
      name: Notification.Name("RNLiveWidgetsDidRegisterDeviceToken"),
      object: nil
    )
    startObservingPushToStartTokenIfNeeded()
    startObservingActivityUpdatesIfNeeded()
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  @objc private func handleDeviceTokenNotification(_ notification: Notification) {
    guard let token = notification.userInfo?["token"] as? String, !token.isEmpty else { return }
    Self.currentDevicePushToken = token
    if hasListeners {
      sendEvent(withName: "DevicePushTokenChanged", body: token)
    }
  }

  /// Hàm tĩnh để AppDelegate có thể gọi trực tiếp nếu muốn truyền Data
  @objc public static func didRegisterDeviceToken(_ deviceToken: Data) {
    let tokenHex = deviceToken.map { String(format: "%02x", $0) }.joined()
    currentDevicePushToken = tokenHex
    NotificationCenter.default.post(
      name: Notification.Name("RNLiveWidgetsDidRegisterDeviceToken"),
      object: nil,
      userInfo: ["token": tokenHex]
    )
  }

  public override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  public override func supportedEvents() -> [String]! {
    return [
      "DevicePushTokenChanged",
      "LiveActivityTokenChanged",
      "LiveActivityUpdateTokenChanged",
      "LiveActivityActionClicked",
    ]
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

    Task {
      await DynamicWidgetImageCache.prefetchUrls(in: payloadJson)

      do {
        do {
          let activity = try Activity.request(
            attributes: attributes,
            content: .init(state: initialContentState, staleDate: nil),
            pushType: .token
          )
          self.observePushToken(for: activity)
        } catch {
          // Fallback sang local Live Activity (pushType: nil) khi chạy môi trường chưa cấu hình APNs
          let activity = try Activity.request(
            attributes: attributes,
            content: .init(state: initialContentState, staleDate: nil),
            pushType: nil
          )
          self.observePushToken(for: activity)
        }

        #if targetEnvironment(simulator)
        if Self.activityUpdateTokens[activityId] == nil {
          let simUpdateToken = Self.generateSimulatorHexToken(seed: "apns_update_\(activityId)", byteLength: 64)
          Self.activityUpdateTokens[activityId] = simUpdateToken
          if self.hasListeners {
            self.sendEvent(
              withName: "LiveActivityUpdateTokenChanged",
              body: ["activityId": activityId, "token": simUpdateToken]
            )
          }
        }
        #endif

        resolve(true)
      } catch {
        reject("E_START_FAILED", error.localizedDescription, error)
      }
    }
  }

  @available(iOS 16.2, *)
  private func observePushToken(for activity: Activity<DynamicActivityAttributes>) {
    let actId = activity.attributes.activityId
    Task {
      for await pushToken in activity.pushTokenUpdates {
        let tokenStr = pushToken.map { String(format: "%02x", $0) }.joined()
        Self.activityUpdateTokens[actId] = tokenStr
        NSLog("🔔 [LiveActivityModule] Activity (\(actId)) Update APNs Token: \(tokenStr)")
        if self.hasListeners {
          self.sendEvent(
            withName: "LiveActivityUpdateTokenChanged",
            body: ["activityId": actId, "token": tokenStr]
          )
        }
      }
    }
  }

  private func startObservingActivityUpdatesIfNeeded() {
    guard #available(iOS 16.2, *), !Self.isObservingActivities else { return }
    Self.isObservingActivities = true

    Task {
      for await activity in Activity<DynamicActivityAttributes>.activityUpdates {
        self.observePushToken(for: activity)
      }
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
      await DynamicWidgetImageCache.prefetchUrls(in: payloadJson)
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

  // MARK: - APNs Tokens (Device Token, Push-to-Start Token, Activity Update Token)

  @objc(registerForPushNotifications:rejecter:)
  public func registerForPushNotifications(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
      DispatchQueue.main.async {
        UIApplication.shared.registerForRemoteNotifications()
      }

      DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
        #if targetEnvironment(simulator)
        if Self.currentDevicePushToken == nil {
          let vendorId = UIDevice.current.identifierForVendor?.uuidString ?? "simulator_device"
          let simDeviceToken = Self.generateSimulatorHexToken(seed: "apns_device_\(vendorId)", byteLength: 32)
          Self.currentDevicePushToken = simDeviceToken
          if self.hasListeners {
            self.sendEvent(withName: "DevicePushTokenChanged", body: simDeviceToken)
          }
        }
        #endif
        resolve(Self.currentDevicePushToken)
      }
    }
  }

  @objc(getDevicePushToken:rejecter:)
  public func getDevicePushToken(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if let existing = Self.currentDevicePushToken {
      resolve(existing)
      return
    }
    registerForPushNotifications(resolve: resolve, reject: reject)
  }

  @objc(getPushToStartToken:rejecter:)
  public func getPushToStartToken(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 17.2, *) {
      startObservingPushToStartTokenIfNeeded()
      #if targetEnvironment(simulator)
      if Self.currentPushToStartToken == nil {
        let vendorId = UIDevice.current.identifierForVendor?.uuidString ?? "simulator_device"
        Self.currentPushToStartToken = Self.generateSimulatorHexToken(
          seed: "apns_push_to_start_\(vendorId)",
          byteLength: 64
        )
      }
      #endif
      resolve(Self.currentPushToStartToken)
    } else {
      resolve(nil)
    }
  }

  @objc(getActivityPushToken:resolver:rejecter:)
  public func getActivityPushToken(
    activityId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if let token = Self.activityUpdateTokens[activityId] {
      resolve(token)
      return
    }
    resolve(nil)
  }

  @objc(getAllPushTokens:resolver:rejecter:)
  public func getAllPushTokens(
    activityId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    #if targetEnvironment(simulator)
    let vendorId = UIDevice.current.identifierForVendor?.uuidString ?? "simulator_device"
    if Self.currentDevicePushToken == nil {
      Self.currentDevicePushToken = Self.generateSimulatorHexToken(seed: "apns_device_\(vendorId)", byteLength: 32)
    }
    if #available(iOS 17.2, *), Self.currentPushToStartToken == nil {
      Self.currentPushToStartToken = Self.generateSimulatorHexToken(seed: "apns_push_to_start_\(vendorId)", byteLength: 64)
    }
    #endif

    let specificUpdateToken: String? = {
      if !activityId.isEmpty, let tok = Self.activityUpdateTokens[activityId] {
        return tok
      }
      return Self.activityUpdateTokens.values.first
    }()

    let result: [String: Any] = [
      "devicePushToken": Self.currentDevicePushToken as Any,
      "pushToStartToken": Self.currentPushToStartToken as Any,
      "activityUpdateToken": specificUpdateToken as Any,
      "allActivityUpdateTokens": Self.activityUpdateTokens,
    ]
    resolve(result)
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

  private static func generateSimulatorHexToken(seed: String, byteLength: Int) -> String {
    var bytes = [UInt8]()
    bytes.reserveCapacity(byteLength)
    let seedBytes = Array(seed.utf8)
    for i in 0..<byteLength {
      let b = seedBytes[i % seedBytes.count]
      let mixed = UInt8((Int(b) &* 31 &+ i &* 17) & 0xFF)
      bytes.append(mixed)
    }
    return bytes.map { String(format: "%02x", $0) }.joined()
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
    if let fileURL = DynamicWidgetProvider.sharedFileURL(key: key, appGroup: appGroup) {
      try? value.write(to: fileURL, atomically: true, encoding: .utf8)
    }

    if key.hasPrefix("widget_layout_"),
       let data = value.data(using: .utf8),
       let dto = try? JSONDecoder().decode(WidgetMultiPagePayloadDTO.self, from: data) {
      var state = DynamicWidgetStateStore.loadState()
      state.updatedAt = Date().timeIntervalSince1970
      if let initial = dto.initialPage {
        state.activePage = initial
      }
      if let order = dto.pageOrder {
        state.pageOrder = order
      } else if let pages = dto.pages {
        state.pageOrder = Array(pages.keys).sorted()
      }
      DynamicWidgetStateStore.saveState(state)

      // Nếu đẩy mẫu UI tĩnh không chứa biến {{...}}, tự động dọn cấu hình Remote Config cũ
      // để Widget không bị gọi API ngầm không cần thiết khi đổi kích thước.
      if !value.contains("{{") {
        let wKey = String(key.dropFirst("widget_layout_".count))
        let remoteKey = "widget_remote_config_\(wKey)"
        if let remoteFileURL = DynamicWidgetProvider.sharedFileURL(key: remoteKey, appGroup: appGroup) {
          try? FileManager.default.removeItem(at: remoteFileURL)
        }
        getDefaults(appGroup: appGroup).removeObject(forKey: remoteKey)
        #if targetEnvironment(simulator)
        try? FileManager.default.removeItem(atPath: "/tmp/rn_live_widgets_\(remoteKey).json")
        #endif
      }
    }

    let defaults = getDefaults(appGroup: appGroup)
    defaults.set(value, forKey: key)
    defaults.synchronize()

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(key).json"
    try? value.write(toFile: simPath, atomically: true, encoding: .utf8)
    #endif

    Task {
      await DynamicWidgetImageCache.prefetchUrls(in: value)
      WidgetCenter.shared.reloadAllTimelines()
      resolve(true)
    }
  }

  @objc(getSharedItem:appGroup:resolver:rejecter:)
  public func getSharedItem(
    key: String,
    appGroup: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if let fileURL = DynamicWidgetProvider.sharedFileURL(key: key, appGroup: appGroup),
       let fileVal = try? String(contentsOf: fileURL, encoding: .utf8),
       !fileVal.isEmpty {
      resolve(fileVal)
      return
    }

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
    if let fileURL = DynamicWidgetProvider.sharedFileURL(key: key, appGroup: appGroup) {
      try? FileManager.default.removeItem(at: fileURL)
    }

    let defaults = getDefaults(appGroup: appGroup)
    defaults.removeObject(forKey: key)

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(key).json"
    try? FileManager.default.removeItem(atPath: simPath)
    #endif

    WidgetCenter.shared.reloadAllTimelines()
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
