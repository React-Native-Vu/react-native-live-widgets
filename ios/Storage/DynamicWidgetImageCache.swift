import Foundation
import UIKit

// MARK: - Image Cache & Prefetcher for WidgetKit & ActivityKit

public enum DynamicWidgetImageCache {
  private static let memCache = NSCache<NSString, UIImage>()

  public static func cacheKey(for urlStr: String) -> String {
    var hash: UInt64 = 5381
    for byte in urlStr.utf8 {
      hash = ((hash << 5) &+ hash) &+ UInt64(byte)
    }
    return String(format: "img_%016llx", hash)
  }

  public static func cachedImage(for urlStr: String) -> UIImage? {
    let key = cacheKey(for: urlStr)
    if let mem = memCache.object(forKey: key as NSString) {
      return mem
    }

    if let fileURL = DynamicWidgetProvider.sharedFileURL(key: key, appGroup: ""),
       let data = try? Data(contentsOf: fileURL),
       let img = UIImage(data: data) {
      memCache.setObject(img, forKey: key as NSString)
      return img
    }

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(key).dat"
    if let data = try? Data(contentsOf: URL(fileURLWithPath: simPath)),
       let img = UIImage(data: data) {
      memCache.setObject(img, forKey: key as NSString)
      return img
    }
    #endif

    return nil
  }

  public static func saveImageData(_ rawData: Data, for urlStr: String) {
    guard UIImage(data: rawData) != nil else { return }
    let key = cacheKey(for: urlStr)
    let optimizedData = downscaleImageData(rawData, maxDimension: 360) ?? rawData

    if let img = UIImage(data: optimizedData) {
      memCache.setObject(img, forKey: key as NSString)
    }

    if let fileURL = DynamicWidgetProvider.sharedFileURL(key: key, appGroup: "") {
      try? optimizedData.write(to: fileURL, options: .atomic)
    }

    #if targetEnvironment(simulator)
    let simPath = "/tmp/rn_live_widgets_\(key).dat"
    try? optimizedData.write(to: URL(fileURLWithPath: simPath), options: .atomic)
    #endif
  }

  public static func hasUncachedUrls(in jsonString: String) -> Bool {
    guard jsonString.contains("http") else { return false }
    let pattern = #""url"\s*:\s*"(https?://[^"]+)""#
    guard let regex = try? NSRegularExpression(pattern: pattern) else { return false }
    let nsRange = NSRange(jsonString.startIndex..<jsonString.endIndex, in: jsonString)
    let matches = regex.matches(in: jsonString, range: nsRange)
    for match in matches {
      if match.numberOfRanges > 1,
         let r = Range(match.range(at: 1), in: jsonString) {
        let urlStr = String(jsonString[r])
        if cachedImage(for: urlStr) == nil {
          return true
        }
      }
    }
    return false
  }

  public static func prefetchUrls(in jsonString: String) async {
    guard jsonString.contains("http") else { return }
    let pattern = #""url"\s*:\s*"(https?://[^"]+)""#
    guard let regex = try? NSRegularExpression(pattern: pattern) else { return }
    let nsRange = NSRange(jsonString.startIndex..<jsonString.endIndex, in: jsonString)
    let matches = regex.matches(in: jsonString, range: nsRange)

    var urls = Set<String>()
    for match in matches {
      if match.numberOfRanges > 1,
         let r = Range(match.range(at: 1), in: jsonString) {
        urls.insert(String(jsonString[r]))
      }
    }

    guard !urls.isEmpty else { return }

    await withTaskGroup(of: Void.self) { group in
      for urlStr in urls {
        if cachedImage(for: urlStr) != nil { continue }
        guard let url = URL(string: urlStr) else { continue }
        group.addTask {
          var req = URLRequest(url: url)
          req.timeoutInterval = 6
          if let (data, _) = try? await URLSession.shared.data(for: req), !data.isEmpty {
            saveImageData(data, for: urlStr)
          }
        }
      }
    }
  }

  private static func downscaleImageData(_ data: Data, maxDimension: CGFloat) -> Data? {
    guard let image = UIImage(data: data) else { return nil }
    let size = image.size
    guard size.width > 0, size.height > 0 else { return data }
    let maxSide = max(size.width, size.height)
    if maxSide <= maxDimension {
      return image.pngData() ?? image.jpegData(compressionQuality: 0.85) ?? data
    }
    let scale = maxDimension / maxSide
    let newSize = CGSize(width: max(1, round(size.width * scale)), height: max(1, round(size.height * scale)))
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1.0
    let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
    let resized = renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: newSize))
    }
    return resized.jpegData(compressionQuality: 0.85) ?? data
  }
}

