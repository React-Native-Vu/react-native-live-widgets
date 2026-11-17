import Foundation

// MARK: - Interactive Widget State Store & Background Data Engine 2.0

public enum DynamicWidgetStateStore {
  private static let stateKey = "interactive_state"
  private static var memoryCache: InteractiveWidgetState?

  public static func loadState() -> InteractiveWidgetState {
    if let fileURL = DynamicWidgetProvider.sharedFileURL(key: stateKey, appGroup: ""),
       let data = try? Data(contentsOf: fileURL),
       let state = try? JSONDecoder().decode(InteractiveWidgetState.self, from: data) {
      return state
    }

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(stateKey).json"
    if let data = try? Data(contentsOf: URL(fileURLWithPath: simPath)),
       let state = try? JSONDecoder().decode(InteractiveWidgetState.self, from: data) {
      return state
    }
    #endif

    let resolvedGroup = DynamicWidgetProvider.resolveAppGroup("")
    if !resolvedGroup.isEmpty,
       let defaults = UserDefaults(suiteName: resolvedGroup),
       let jsonStr = defaults.string(forKey: stateKey),
       let data = jsonStr.data(using: .utf8),
       let state = try? JSONDecoder().decode(InteractiveWidgetState.self, from: data) {
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

  public static func setToggle(_ key: String, value: Bool) {
    var state = loadState()
    state.lastActionId = "toggle:\(key)"
    state.updatedAt = Date().timeIntervalSince1970
    state.toggledItems[key] = value
    saveState(state)
  }

  // MARK: - JSON Flattener, Schema Validator & Pipe Template Evaluator

  public static func flattenJsonObject(_ value: Any, prefix: String = "", into out: inout [String: String]) {
    if let dict = value as? [String: Any] {
      for (k, v) in dict {
        let nextKey = prefix.isEmpty ? k : "\(prefix).\(k)"
        flattenJsonObject(v, prefix: nextKey, into: &out)
      }
    } else if let arr = value as? [Any] {
      for (idx, item) in arr.enumerated() {
        let nextKey = prefix.isEmpty ? "\(idx)" : "\(prefix).\(idx)"
        flattenJsonObject(item, prefix: nextKey, into: &out)
      }
    } else if !prefix.isEmpty {
      if let s = value as? String {
        out[prefix] = s
      } else if let num = value as? NSNumber {
        if CFGetTypeID(num) == CFBooleanGetTypeID() {
          out[prefix] = num.boolValue ? "true" : "false"
        } else {
          out[prefix] = num.stringValue
        }
      }
    }
  }

  private static func validateSchema(
    flatVars: inout [String: String],
    schema: WidgetDataSchemaDTO?
  ) -> (ok: Bool, error: String?) {
    guard let schema = schema else { return (true, nil) }

    if let defaults = schema.defaults {
      for (k, codable) in defaults {
        let existing = flatVars[k]
        if existing == nil || existing?.isEmpty == true {
          if let s = codable.stringValue {
            flatVars[k] = s
          } else if let b = codable.boolValue {
            flatVars[k] = b ? "true" : "false"
          } else if let d = codable.doubleValue {
            flatVars[k] = formatNumber(d)
          }
        }
      }
    }

    if let required = schema.requiredKeys {
      for reqKey in required {
        if let val = flatVars[reqKey], !val.isEmpty {
          continue
        }
        return (false, "Missing required key '\(reqKey)'")
      }
    }

    if let types = schema.types {
      for (key, expectedType) in types {
        guard let val = flatVars[key] else { continue }
        switch expectedType {
        case "number":
          if Double(val.trimmingCharacters(in: .whitespaces)) == nil {
            return (false, "Key '\(key)' expected number")
          }
        case "boolean":
          let lower = val.trimmingCharacters(in: .whitespaces).lowercased()
          if lower != "true" && lower != "false" && lower != "1" && lower != "0" {
            return (false, "Key '\(key)' expected boolean")
          }
        default:
          break
        }
      }
    }

    return (true, nil)
  }

  private static func formatNumber(_ value: Double) -> String {
    if value.isFinite && value.rounded() == value && abs(value) <= Double(Int64.max) {
      return "\(Int64(value))"
    }
    return "\(value)"
  }

  private static func sanitizeVariableValue(_ raw: String?) -> String? {
    guard let raw = raw else { return nil }
    let trimmed = raw.trimmingCharacters(in: .whitespaces)
    if trimmed.hasPrefix("{{"), trimmed.hasSuffix("}}") {
      let inner = String(trimmed.dropFirst(2).dropLast(2))
      if !inner.contains("{"), !inner.contains("}"), !inner.contains("|") {
        return inner.trimmingCharacters(in: .whitespaces)
      }
    }
    return raw
  }

  public static func evaluateTemplatePipe(_ rawValue: String?, pipes: [String]) -> String {
    var current = sanitizeVariableValue(rawValue) ?? ""

    for rawPipe in pipes {
      let colonIdx = rawPipe.firstIndex(of: ":")
      let op: String
      let arg: String
      if let idx = colonIdx {
        op = String(rawPipe[..<idx]).trimmingCharacters(in: .whitespaces)
        arg = String(rawPipe[rawPipe.index(after: idx)...])
      } else {
        op = rawPipe.trimmingCharacters(in: .whitespaces)
        arg = ""
      }

      switch op {
      case "default":
        if current.isEmpty {
          current = arg
        }
      case "divide":
        if let num = Double(current.trimmingCharacters(in: .whitespaces)), let div = Double(arg), div != 0 {
          current = formatNumber(num / div)
        }
      case "multiply":
        if let num = Double(current.trimmingCharacters(in: .whitespaces)), let mul = Double(arg) {
          current = formatNumber(num * mul)
        }
      case "add":
        if let num = Double(current.trimmingCharacters(in: .whitespaces)), let offset = Double(arg) {
          current = formatNumber(num + offset)
        }
      case "round":
        if let num = Double(current.trimmingCharacters(in: .whitespaces)) {
          let decimals = max(0, Int(arg) ?? 0)
          current = decimals == 0 ? "\(Int64(num.rounded()))" : String(format: "%.\(decimals)f", num)
        }
      case "upper":
        current = current.uppercased()
      case "lower":
        current = current.lowercased()
      case "currency":
        if let num = Double(current.trimmingCharacters(in: .whitespaces)) {
          let symbol = arg.isEmpty ? "₫" : arg
          let formatter = NumberFormatter()
          formatter.numberStyle = .decimal
          formatter.usesGroupingSeparator = true
          formatter.locale = Locale(identifier: "en_US")
          let formatted = formatter.string(from: NSNumber(value: Int64(num.rounded()))) ?? "\(Int64(num.rounded()))"
          current = "\(formatted)\(symbol)"
        }
      case "percent":
        if let num = Double(current.trimmingCharacters(in: .whitespaces)) {
          let decimals = max(0, Int(arg) ?? 0)
          let numStr = decimals == 0 ? "\(Int64(num.rounded()))" : String(format: "%.\(decimals)f", num)
          current = "\(numStr)%"
        }
      case "if":
        let parts = arg.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
        let thenVal = parts.first.map(String.init) ?? arg
        let elseVal = parts.count > 1 ? String(parts[1]) : ""
        let trimmed = current.trimmingCharacters(in: .whitespaces).lowercased()
        let isTruthy = !trimmed.isEmpty && trimmed != "false" && trimmed != "0" && trimmed != "null"
        current = isTruthy ? thenVal : elseVal
      default:
        break
      }
    }

    return current
  }

  public static func resolveTemplateString(
    _ input: String,
    with vars: [String: String],
    escapeForJson: Bool = false
  ) -> String {
    guard input.contains("{{"),
          let regex = try? NSRegularExpression(pattern: "\\{\\{([^}]+)\\}\\}") else {
      return input
    }

    let nsInput = input as NSString
    let matches = regex.matches(in: input, range: NSRange(location: 0, length: nsInput.length))
    if matches.isEmpty { return input }

    var result = input
    for match in matches.reversed() {
      guard match.numberOfRanges > 1,
            let fullRange = Range(match.range, in: result),
            let exprRange = Range(match.range(at: 1), in: result) else {
        continue
      }
      let expr = String(result[exprRange])
      let parts = expr.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
      let pathKey = parts[0].trimmingCharacters(in: .whitespaces)
      let pipes = Array(parts.dropFirst())
      let rawVal = vars[pathKey]
      let hasFallbackPipe = pipes.contains { p in
        let trimmed = p.trimmingCharacters(in: .whitespaces)
        return trimmed.hasPrefix("default:") || trimmed.hasPrefix("if:")
      }
      if rawVal == nil && !hasFallbackPipe {
        continue
      }
      var evaluated = evaluateTemplatePipe(rawVal, pipes: pipes)
      if escapeForJson {
        evaluated = evaluated
          .replacingOccurrences(of: "\\", with: "\\\\")
          .replacingOccurrences(of: "\"", with: "\\\"")
          .replacingOccurrences(of: "\n", with: "\\n")
          .replacingOccurrences(of: "\r", with: "\\r")
          .replacingOccurrences(of: "\t", with: "\\t")
      }
      result.replaceSubrange(fullRange, with: evaluated)
    }

    return result
  }

  // MARK: - Background Data Engine 2.0 (REST, TTL, ETag/304, Retry/Backoff, Multi-Source, Auth Refresh)

  private enum SourceFetchResult {
    case updated(data: Data, etag: String?, lastModified: String?, statusCode: Int)
    case notModified(statusCode: Int)
    case failed(error: String, statusCode: Int?)
  }

  private static func buildRequestBody(_ body: AnyCodable?) -> (data: Data?, contentType: String?) {
    guard let body = body else { return (nil, nil) }
    if let str = body.stringValue {
      return (str.data(using: .utf8), "application/json")
    }
    if let data = try? JSONEncoder().encode(body) {
      return (data, "application/json")
    }
    return (nil, nil)
  }

  private static func performAuthRefresh(
    auth: WidgetAuthRefreshConfigDTO,
    timeoutSeconds: TimeInterval
  ) async -> String? {
    guard let url = URL(string: auth.url) else { return nil }
    var req = URLRequest(url: url)
    req.httpMethod = auth.method ?? "POST"
    req.timeoutInterval = timeoutSeconds
    if let headers = auth.headers {
      for (k, v) in headers {
        req.setValue(v, forHTTPHeaderField: k)
      }
    }
    let (bodyData, contentType) = buildRequestBody(auth.body)
    if let bodyData = bodyData {
      req.httpBody = bodyData
      if let ct = contentType, req.value(forHTTPHeaderField: "Content-Type") == nil {
        req.setValue(ct, forHTTPHeaderField: "Content-Type")
      }
    }

    do {
      let (data, response) = try await URLSession.shared.data(for: req)
      guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode),
            let jsonObj = try? JSONSerialization.jsonObject(with: data) else {
        return nil
      }
      var flat: [String: String] = [:]
      flattenJsonObject(jsonObj, into: &flat)
      let tokenPath = auth.tokenPath ?? "accessToken"
      return flat[tokenPath] ?? flat["token"] ?? flat["access_token"]
    } catch {
      return nil
    }
  }

  private static func fetchWithRetryAndAuth(
    cacheKey: String,
    urlString: String,
    method: String?,
    headers: [String: String]?,
    body: AnyCodable?,
    timeoutMs: Int,
    enableETag: Bool,
    maxRetries: Int,
    retryDelayMs: Int,
    authRefresh: WidgetAuthRefreshConfigDTO?,
    state: inout InteractiveWidgetState
  ) async -> SourceFetchResult {
    let resolvedUrlStr = urlString.replacingOccurrences(of: "{{_randomId}}", with: "\(Int.random(in: 1...20))")
    guard let url = URL(string: resolvedUrlStr) else {
      return .failed(error: "Invalid URL", statusCode: nil)
    }

    let timeoutSecs = max(1.0, Double(timeoutMs) / 1000.0)
    var didRefreshAuth = false
    var lastError = "Network error"
    var lastStatus: Int? = nil

    for attempt in 0...max(0, maxRetries) {
      if attempt > 0 {
        let backoffMs = Double(max(100, retryDelayMs)) * pow(2.0, Double(attempt - 1))
        let nanos = UInt64(min(backoffMs, 10_000.0) * 1_000_000.0)
        try? await Task.sleep(nanoseconds: nanos)
      }

      var req = URLRequest(url: url)
      req.httpMethod = method ?? "GET"
      req.timeoutInterval = timeoutSecs
      if let headers = headers {
        for (k, v) in headers {
          req.setValue(v, forHTTPHeaderField: k)
        }
      }

      if let refreshedToken = state.accessToken, !refreshedToken.isEmpty {
        let hName = authRefresh?.headerName ?? "Authorization"
        let hPrefix = authRefresh?.headerPrefix ?? "Bearer "
        req.setValue("\(hPrefix)\(refreshedToken)", forHTTPHeaderField: hName)
      }

      if enableETag {
        if let savedEtag = state.etags?[cacheKey], !savedEtag.isEmpty {
          req.setValue(savedEtag, forHTTPHeaderField: "If-None-Match")
        }
        if let savedMod = state.lastModified?[cacheKey], !savedMod.isEmpty {
          req.setValue(savedMod, forHTTPHeaderField: "If-Modified-Since")
        }
      }

      let (bodyData, contentType) = buildRequestBody(body)
      if let bodyData = bodyData {
        req.httpBody = bodyData
        if let ct = contentType, req.value(forHTTPHeaderField: "Content-Type") == nil {
          req.setValue(ct, forHTTPHeaderField: "Content-Type")
        }
      }

      do {
        let (data, response) = try await URLSession.shared.data(for: req)
        let http = response as? HTTPURLResponse
        let status = http?.statusCode ?? 200
        lastStatus = status

        if status == 304 {
          return .notModified(statusCode: 304)
        }

        if status == 401, let auth = authRefresh, !didRefreshAuth {
          didRefreshAuth = true
          if let newToken = await performAuthRefresh(auth: auth, timeoutSeconds: timeoutSecs) {
            state.accessToken = newToken
            // Thử gọi lại ngay với token mới mà không tiêu tốn lượt retry backoff
            var retryReq = req
            let hName = auth.headerName ?? "Authorization"
            let hPrefix = auth.headerPrefix ?? "Bearer "
            retryReq.setValue("\(hPrefix)\(newToken)", forHTTPHeaderField: hName)
            let (retryData, retryResp) = try await URLSession.shared.data(for: retryReq)
            let retryHttp = retryResp as? HTTPURLResponse
            let retryStatus = retryHttp?.statusCode ?? 200
            lastStatus = retryStatus
            if retryStatus == 304 {
              return .notModified(statusCode: 304)
            }
            if (200...299).contains(retryStatus) {
              let etag = retryHttp?.value(forHTTPHeaderField: "ETag")
              let lastMod = retryHttp?.value(forHTTPHeaderField: "Last-Modified")
              return .updated(data: retryData, etag: etag, lastModified: lastMod, statusCode: retryStatus)
            }
            lastError = "HTTP \(retryStatus)"
            if retryStatus < 500 && retryStatus != 429 {
              return .failed(error: lastError, statusCode: retryStatus)
            }
            continue
          }
          return .failed(error: "HTTP 401 Unauthorized", statusCode: 401)
        }

        if (200...299).contains(status) {
          let etag = http?.value(forHTTPHeaderField: "ETag")
          let lastMod = http?.value(forHTTPHeaderField: "Last-Modified")
          return .updated(data: data, etag: etag, lastModified: lastMod, statusCode: status)
        }

        lastError = "HTTP \(status)"
        if status < 500 && status != 429 {
          return .failed(error: lastError, statusCode: status)
        }
      } catch {
        lastError = error.localizedDescription
      }
    }

    return .failed(error: lastError, statusCode: lastStatus)
  }

  /// Chạy ngầm độc lập bên trong Widget Extension (kể cả khi Main App đã bị kill hoàn toàn)
  public static func performRemoteSync(widgetKey: String = "main", forceRefresh: Bool = false) async {
    let configKey = "widget_remote_config_\(widgetKey)"
    guard let configJson = DynamicWidgetProvider.readSharedString(forKey: configKey, appGroup: ""),
          let configData = configJson.data(using: .utf8),
          let config = try? JSONDecoder().decode(WidgetRemoteConfigDTO.self, from: configData) else {
      stampSyncTimeOnly()
      return
    }

    var state = loadState()
    let now = Date().timeIntervalSince1970
    let ttlSeconds = config.cacheTtlSeconds ?? 0
    if !forceRefresh && ttlSeconds > 0 && state.lastSyncTime != nil && state.syncStatus != "error" {
      if (now - state.updatedAt) < Double(ttlSeconds) {
        return
      }
    }

    let timeoutMs = config.timeoutMs ?? 8000
    let enableETag = config.enableETag ?? false
    let maxRetries = config.maxRetries ?? 0
    let retryDelayMs = config.retryDelayMs ?? 500

    var mergedVars = state.remoteVariables ?? [:]
    var anyFailedError: String? = nil
    var finalStatusCode: Int? = nil
    var fetchedAnyData = false
    var allNotModified = true

    if let primaryUrl = config.url, !primaryUrl.isEmpty {
      let result = await fetchWithRetryAndAuth(
        cacheKey: "\(widgetKey):main",
        urlString: primaryUrl,
        method: config.method,
        headers: config.headers,
        body: config.body,
        timeoutMs: timeoutMs,
        enableETag: enableETag,
        maxRetries: maxRetries,
        retryDelayMs: retryDelayMs,
        authRefresh: config.authRefresh,
        state: &state
      )
      switch result {
      case .updated(let data, let etag, let lastMod, let status):
        fetchedAnyData = true
        allNotModified = false
        finalStatusCode = status
        if let etag = etag {
          var etags = state.etags ?? [:]
          etags["\(widgetKey):main"] = etag
          state.etags = etags
        }
        if let lastMod = lastMod {
          var lms = state.lastModified ?? [:]
          lms["\(widgetKey):main"] = lastMod
          state.lastModified = lms
        }
        if let jsonObj = try? JSONSerialization.jsonObject(with: data) {
          if let dict = jsonObj as? [String: Any],
             (dict["small"] != nil || dict["medium"] != nil || dict["large"] != nil || dict["pages"] != nil),
             let rawStr = String(data: data, encoding: .utf8) {
            DynamicWidgetProvider.writeSharedString(rawStr, forKey: "widget_layout_\(widgetKey)", appGroup: "")
          }
          flattenJsonObject(jsonObj, into: &mergedVars)
        }
      case .notModified(let status):
        finalStatusCode = status
      case .failed(let err, let status):
        allNotModified = false
        anyFailedError = err
        finalStatusCode = status
      }
    }

    if let sources = config.sources, !sources.isEmpty {
      for (srcKey, srcCfg) in sources {
        let result = await fetchWithRetryAndAuth(
          cacheKey: "\(widgetKey):\(srcKey)",
          urlString: srcCfg.url,
          method: srcCfg.method ?? config.method,
          headers: srcCfg.headers ?? config.headers,
          body: srcCfg.body,
          timeoutMs: srcCfg.timeoutMs ?? timeoutMs,
          enableETag: srcCfg.enableETag ?? enableETag,
          maxRetries: maxRetries,
          retryDelayMs: retryDelayMs,
          authRefresh: config.authRefresh,
          state: &state
        )
        switch result {
        case .updated(let data, let etag, let lastMod, let status):
          fetchedAnyData = true
          allNotModified = false
          if finalStatusCode == nil { finalStatusCode = status }
          if let etag = etag {
            var etags = state.etags ?? [:]
            etags["\(widgetKey):\(srcKey)"] = etag
            state.etags = etags
          }
          if let lastMod = lastMod {
            var lms = state.lastModified ?? [:]
            lms["\(widgetKey):\(srcKey)"] = lastMod
            state.lastModified = lms
          }
          if let jsonObj = try? JSONSerialization.jsonObject(with: data) {
            flattenJsonObject(jsonObj, prefix: srcKey, into: &mergedVars)
          }
        case .notModified(let status):
          if finalStatusCode == nil { finalStatusCode = status }
        case .failed(let err, let status):
          allNotModified = false
          if anyFailedError == nil { anyFailedError = "\(srcKey): \(err)" }
          if finalStatusCode == nil { finalStatusCode = status }
        }
      }
    }

    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm:ss"
    let nowStr = formatter.string(from: Date())
    state.lastSyncTime = nowStr
    state.updatedAt = Date().timeIntervalSince1970
    state.lastHttpStatus = finalStatusCode

    if let err = anyFailedError, !fetchedAnyData && !allNotModified {
      state.syncStatus = "error"
      state.lastSyncError = err
      var vars = state.remoteVariables ?? [:]
      vars["_syncStatus"] = "error"
      vars["_syncError"] = err
      if let code = finalStatusCode { vars["_httpStatus"] = "\(code)" }
      state.remoteVariables = vars
      saveState(state)
      return
    }

    let validation = validateSchema(flatVars: &mergedVars, schema: config.schema)
    if !validation.ok {
      let errMsg = validation.error ?? "Schema validation failed"
      state.syncStatus = "error"
      state.lastSyncError = errMsg
      var vars = state.remoteVariables ?? [:]
      vars["_syncStatus"] = "error"
      vars["_syncError"] = errMsg
      if let code = finalStatusCode { vars["_httpStatus"] = "\(code)" }
      state.remoteVariables = vars
      saveState(state)
      return
    }

    if let mapping = config.mapping {
      for (targetKey, expr) in mapping {
        if expr.contains("{{") {
          mergedVars[targetKey] = resolveTemplateString(expr, with: mergedVars)
        } else {
          let parts = expr.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
          let pathKey = parts[0].trimmingCharacters(in: .whitespaces)
          let pipes = Array(parts.dropFirst())
          if let existing = mergedVars[pathKey] {
            mergedVars[targetKey] = pipes.isEmpty
              ? (sanitizeVariableValue(existing) ?? existing)
              : evaluateTemplatePipe(existing, pipes: pipes)
          } else if !pipes.isEmpty {
            mergedVars[targetKey] = evaluateTemplatePipe(nil, pipes: pipes)
          } else {
            mergedVars[targetKey] = expr
          }
        }
      }
    }

    state.syncStatus = anyFailedError != nil ? "partial" : "ok"
    state.lastSyncError = anyFailedError
    mergedVars["_syncStatus"] = state.syncStatus ?? "ok"
    mergedVars["_syncError"] = anyFailedError ?? ""
    if let code = finalStatusCode {
      mergedVars["_httpStatus"] = "\(code)"
    }
    state.remoteVariables = mergedVars
    saveState(state)
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
