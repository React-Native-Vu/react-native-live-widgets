require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-live-widgets"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/vu-tran/react-native-live-widgets"
  s.license      = package["license"]
  s.authors      = "vu-tran"
  s.platforms    = { :ios => "16.1" }
  s.source       = { :git => "https://github.com/vu-tran/react-native-live-widgets.git", :tag => "#{s.version}" }
  s.swift_version = "5.0"

  s.default_subspecs = ["Widget", "Bridge"]

  # 1. Subspec Widget: Thuần SwiftUI/WidgetKit/ActivityKit (Không phụ thuộc React-Core)
  # Dùng cho Target Widget Extension (nhẹ, không vướng APPLICATION_EXTENSION_API_ONLY)
  s.subspec "Widget" do |ss|
    ss.source_files = [
      "ios/Models/**/*.swift",
      "ios/Storage/**/*.swift",
      "ios/Intents/**/*.swift",
      "ios/Renderer/**/*.swift",
      "ios/Widgets/**/*.swift"
    ]
  end

  # 2. Subspec Bridge: Native Module giao tiếp với React Native (Dùng cho Main App)
  s.subspec "Bridge" do |ss|
    ss.source_files = [
      "ios/Bridge/**/*.{h,m,swift}"
    ]
    ss.dependency "React-Core"
    ss.dependency "react-native-live-widgets/Widget"
  end
end
