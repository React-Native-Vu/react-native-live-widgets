import Foundation

// MARK: - Interactive Widget State Store & Background Remote Sync

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

  /// Chạy ngầm độc lập bên trong Widget Extension (kể cả khi Main App đã bị kill hoàn toàn)
  public static func performRemoteSync(widgetKey: String = "main") async {
    let configKey = "widget_remote_config_\(widgetKey)"
    guard let configJson = DynamicWidgetProvider.readSharedString(forKey: configKey, appGroup: ""),
          let configData = configJson.data(using: .utf8),
          let config = try? JSONDecoder().decode(WidgetRemoteConfigDTO.self, from: configData) else {
      stampSyncTimeOnly()
      return
    }

    let randomId = Int.random(in: 1...20)
    let resolvedUrlStr = config.url.replacingOccurrences(of: "{{_randomId}}", with: "\(randomId)")
    guard let url = URL(string: resolvedUrlStr) else {
      stampSyncTimeOnly()
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = config.method ?? "GET"
    request.timeoutInterval = 8
    if let headers = config.headers {
      for (k, v) in headers {
        request.setValue(v, forHTTPHeaderField: k)
      }
    }

    do {
      let (data, _) = try await URLSession.shared.data(for: request)
      var state = loadState()
      let formatter = DateFormatter()
      formatter.dateFormat = "HH:mm:ss"
      state.lastSyncTime = formatter.string(from: Date())
      state.updatedAt = Date().timeIntervalSince1970

      if let jsonObj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
        if jsonObj["small"] != nil || jsonObj["medium"] != nil || jsonObj["large"] != nil || jsonObj["pages"] != nil,
           let rawStr = String(data: data, encoding: .utf8) {
          DynamicWidgetProvider.writeSharedString(rawStr, forKey: "widget_layout_\(widgetKey)", appGroup: "")
        }

        var vars = state.remoteVariables ?? [:]
        for (k, v) in jsonObj {
          if let s = v as? String {
            vars[k] = s
          } else if let n = v as? NSNumber {
            vars[k] = n.stringValue
          }
        }
        state.remoteVariables = vars
      }
      saveState(state)
    } catch {
      stampSyncTimeOnly()
    }
  }

  private static func stampSyncTimeOnly() {
    var state = loadState()
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm:ss"
    state.lastSyncTime = formatter.string(from: Date())
    state.updatedAt = Date().timeIntervalSince1970
    saveState(state)
  }
}
