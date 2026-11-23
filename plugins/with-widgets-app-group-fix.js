const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PATCH_MARKER = "resolveAppGroupIdentifier";

const PATCHED_WIDGETS_STORAGE_SWIFT = `import Foundation

public enum WidgetsStorage {
  private static func readAppGroupsFromProvisioningProfile() -> [String] {
    guard let profileUrl = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
          let profileData = try? Data(contentsOf: profileUrl),
          let plistStart = profileData.range(of: Data("<?xml".utf8)) ?? profileData.range(of: Data("<plist".utf8)),
          let plistEnd = profileData.range(of: Data("</plist>".utf8)),
          plistStart.lowerBound < plistEnd.upperBound else {
      return []
    }

    let xmlData = profileData.subdata(in: plistStart.lowerBound..<plistEnd.upperBound)
    guard let plist = try? PropertyListSerialization.propertyList(from: xmlData, options: [], format: nil) as? [String: Any],
          let entitlements = plist["Entitlements"] as? [String: Any],
          let groups = entitlements["com.apple.security.application-groups"] as? [String] else {
      return []
    }

    return groups
  }

  private static func collectAppGroupCandidates(configured: String?) -> [String] {
    var rawCandidates: [String] = []

    if let configured, !configured.isEmpty {
      rawCandidates.append(configured)
    }

    if let altGroups = Bundle.main.object(forInfoDictionaryKey: "ALTAppGroups") as? [String] {
      rawCandidates.append(contentsOf: altGroups)
    }

    rawCandidates.append(contentsOf: readAppGroupsFromProvisioningProfile())

    if let bundleId = Bundle.main.bundleIdentifier, !bundleId.isEmpty {
      let strippedBundleId: String
      if bundleId.hasSuffix(".widgets") {
        strippedBundleId = String(bundleId.dropLast(".widgets".count))
      } else if bundleId.hasSuffix(".ExpoWidgetsTarget") {
        strippedBundleId = String(bundleId.dropLast(".ExpoWidgetsTarget".count))
      } else {
        strippedBundleId = bundleId
      }
      rawCandidates.append("group.\\(strippedBundleId)")
      rawCandidates.append("group.\\(bundleId)")
    }

    var unique: [String] = []
    var seen = Set<String>()
    for item in rawCandidates {
      let trimmed = item.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !trimmed.isEmpty, !trimmed.contains("*"), !seen.contains(trimmed) else {
        continue
      }
      seen.insert(trimmed)
      unique.append(trimmed)
    }
    return unique
  }

  private static func resolveAppGroupIdentifier() -> String? {
    let rawConfigured = Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String
    let configured = rawConfigured?.trimmingCharacters(in: .whitespacesAndNewlines)

    // Voie rapide standard (App Store / EAS Build / signature avec l'App Group exact)
    if let configured,
       !configured.isEmpty,
       FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: configured) != nil {
      return configured
    }

    // Repli dynamique pour les IPA non signés re-signés (AltStore, SideStore, Sideloadly, Feather, Xcode)
    let candidates = collectAppGroupCandidates(configured: configured)
    let accessible = candidates.filter {
      FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: $0) != nil
    }

    if let configured, !configured.isEmpty {
      let baseSlug = configured.replacingOccurrences(of: "group.", with: "")
      if let matchingPrefix = accessible.first(where: { $0.hasPrefix(configured) }) {
        return matchingPrefix
      }
      if !baseSlug.isEmpty, let matchingSlug = accessible.first(where: { $0.contains(baseSlug) }) {
        return matchingSlug
      }
    }

    if let firstAccessible = accessible.first {
      return firstAccessible
    }

    return (configured?.isEmpty == false) ? configured : candidates.first
  }

  public static var appGroupIdentifier: String? = resolveAppGroupIdentifier()
  static let defaults = UserDefaults(suiteName: appGroupIdentifier)

  static func set(_ value: [String: Any], forKey key: String) {
    guard let defaults else { return }

    defaults.set(value, forKey: key)
    defaults.synchronize()
  }

  static func set(_ value: [[String: Any]], forKey key: String) {
    guard let defaults else { return }

    defaults.set(value, forKey: key)
    defaults.synchronize()
  }

  static func set(_ value: String, forKey key: String) {
    guard let defaults else { return }

    defaults.set(value, forKey: key)
    defaults.synchronize()
  }

  static func set(_ value: Data, forKey key: String) {
    guard let defaults else { return }

    defaults.set(value, forKey: key)
    defaults.synchronize()
  }

  public static func getDictionary(forKey key: String) -> [String: Any]? {
    guard let defaults else { return nil }

    return defaults.dictionary(forKey: key)
  }

  public static func getArray(forKey key: String) -> [Any]? {
    guard let defaults else { return nil }

    return defaults.array(forKey: key)
  }

  public static func getData(forKey key: String) -> Data? {
    guard let defaults else { return nil }

    return defaults.data(forKey: key)
  }

  public static func getString(forKey key: String) -> String? {
    guard let defaults else { return nil }

    return defaults.string(forKey: key)
  }

  static func removeObject(forKey key: String) {
    guard let defaults else { return }

    defaults.removeObject(forKey: key)
    defaults.synchronize()
  }
}
`;

function patchWidgetsStorageContent(currentContent) {
  if (typeof currentContent === "string" && currentContent.includes(PATCH_MARKER)) {
    return currentContent;
  }
  return PATCHED_WIDGETS_STORAGE_SWIFT;
}

function getWidgetsStoragePath() {
  try {
    const pkgPath = require.resolve("expo-widgets/package.json");
    return path.join(path.dirname(pkgPath), "ios", "WidgetsStorage.swift");
  } catch {
    return path.join(process.cwd(), "node_modules", "expo-widgets", "ios", "WidgetsStorage.swift");
  }
}

const withWidgetsAppGroupFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const targetPath = getWidgetsStoragePath();
      if (fs.existsSync(targetPath)) {
        const current = fs.readFileSync(targetPath, "utf8");
        const next = patchWidgetsStorageContent(current);
        if (next !== current) {
          fs.writeFileSync(targetPath, next, "utf8");
        }
      }
      return modConfig;
    },
  ]);
};

module.exports = withWidgetsAppGroupFix;
module.exports.PATCH_MARKER = PATCH_MARKER;
module.exports.patchWidgetsStorageContent = patchWidgetsStorageContent;
module.exports.getWidgetsStoragePath = getWidgetsStoragePath;
