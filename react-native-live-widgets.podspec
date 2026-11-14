require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-live-widgets"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/vu-tran/react-native-live-widgets"
  s.license      = package["license"]
  s.authors      = "vu-tran"
  s.platforms    = { :ios => "14.0" }
  s.source       = { :git => "https://github.com/vu-tran/react-native-live-widgets.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.swift_version = "5.0"

  s.dependency "React-Core"
end
