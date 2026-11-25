import ExpoModulesCore
import Foundation
#if canImport(UIKit)
import UIKit
#endif

public final class ScheduleIntentsModule: Module {
  private static let snapshotDirName = "GEIIEdtIntents"
  private static let snapshotFileName = "schedule_snapshot.json"
  private static let defaultsKey = "geii_edt_intents_snapshot_v1"

  private static func snapshotFileUrl(createDir: Bool) -> URL? {
    guard let appSupport = FileManager.default.urls(
      for: .applicationSupportDirectory,
      in: .userDomainMask
    ).first else {
      return nil
    }
    let dirUrl = appSupport.appendingPathComponent(snapshotDirName, isDirectory: true)
    if createDir && !FileManager.default.fileExists(atPath: dirUrl.path) {
      try? FileManager.default.createDirectory(
        at: dirUrl,
        withIntermediateDirectories: true
      )
    }
    return dirUrl.appendingPathComponent(snapshotFileName, isDirectory: false)
  }

  public func definition() -> ModuleDefinition {
    Name("ScheduleIntents")

    Constant("isSupported") {
      if #available(iOS 16.4, *) {
        return true
      }
      return false
    }

    Function("writeSnapshot") { (json: String) -> Bool in
      var fileWritten = false
      if let fileUrl = Self.snapshotFileUrl(createDir: true) {
        do {
          try Data(json.utf8).write(to: fileUrl, options: [.atomic])
          fileWritten = true
        } catch {
          fileWritten = false
        }
      }

      UserDefaults.standard.set(json, forKey: Self.defaultsKey)
      let defaultsWritten = UserDefaults.standard.string(forKey: Self.defaultsKey) != nil
      return fileWritten || defaultsWritten
    }

    Function("clearSnapshot") {
      if let fileUrl = Self.snapshotFileUrl(createDir: false),
         FileManager.default.fileExists(atPath: fileUrl.path) {
        try? FileManager.default.removeItem(at: fileUrl)
      }
      UserDefaults.standard.removeObject(forKey: Self.defaultsKey)
    }

    Function("openShortcutsApp") { () -> Bool in
      #if canImport(UIKit)
      guard let url = URL(string: "shortcuts://") else {
        return false
      }
      Task { @MainActor in
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
      }
      return true
      #else
      return false
      #endif
    }
  }
}
