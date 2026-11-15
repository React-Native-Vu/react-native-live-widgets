import Foundation
import SwiftUI

// MARK: - Custom Native SwiftUI Component Registry

/// Cho phép Developer đăng ký thêm bất kỳ SwiftUI View tùy chỉnh nào để gọi từ React Native qua `UI.Custom("ComponentName", props)`
public final class DynamicNodeRegistry {
  public static let shared = DynamicNodeRegistry()
  public typealias CustomNodeBuilder = (LayoutNodeDTO) -> AnyView

  private var builders: [String: CustomNodeBuilder] = [:]
  private let lock = NSLock()

  private init() {}

  /// Đăng ký một SwiftUI View tùy chỉnh theo tên `componentName`
  /// Ví dụ:
  /// ```swift
  /// DynamicNodeRegistry.shared.register("WeatherCard") { node in
  ///   let temp = node.props?["temp"]?.stringValue ?? "28°C"
  ///   return AnyView(Text(temp).font(.title.bold()))
  /// }
  /// ```
  public func register(_ componentName: String, builder: @escaping CustomNodeBuilder) {
    lock.lock()
    defer { lock.unlock() }
    builders[componentName] = builder
  }

  /// Đăng ký trực tiếp bằng `@ViewBuilder` mà không cần tự bọc `AnyView`
  public func registerView<V: View>(
    _ componentName: String,
    @ViewBuilder builder: @escaping (LayoutNodeDTO) -> V
  ) {
    register(componentName) { node in
      AnyView(builder(node))
    }
  }

  public func resolve(_ node: LayoutNodeDTO) -> AnyView? {
    let key: String = {
      if node.type == "Custom", let name = node.props?["componentName"]?.stringValue {
        return name
      }
      return node.type
    }()

    lock.lock()
    let builder = builders[key]
    lock.unlock()
    return builder?(node)
  }
}
