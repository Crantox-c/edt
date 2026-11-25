const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PATCH_MARKER = "resolveAppGroupIdentifierV4";
const UTILS_PATCH_MARKER = "ExpoWidgetsTimelineSafeParseV2";

const PATCHED_WIDGETS_STORAGE_SWIFT = `import Foundation

public enum WidgetsStorage {
  private static func candidateBundles() -> [Bundle] {
    var bundles: [Bundle] = [Bundle.main]
    if Bundle.main.bundleURL.pathExtension == "appex" {
      let hostAppUrl = Bundle.main.bundleURL
        .deletingLastPathComponent()
        .deletingLastPathComponent()
      if let hostBundle = Bundle(url: hostAppUrl) {
        bundles.append(hostBundle)
      }
    }
    return bundles
  }

  private static func readAppGroupsFromProvisioningProfile(in bundle: Bundle) -> [String] {
    guard let profileUrl = bundle.url(forResource: "embedded", withExtension: "mobileprovision"),
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

  private static func deriveBundleIdVariants(from bundleId: String) -> [String] {
    var variants: [String] = []
    let tokens = [".widgets.", ".ExpoWidgetsTarget."]
    for token in tokens {
      if let range = bundleId.range(of: token) {
        let prefix = String(bundleId[..<range.lowerBound])
        let suffix = String(bundleId[range.upperBound...])
        if !prefix.isEmpty && !suffix.isEmpty {
          variants.append("\\(prefix).\\(suffix)")
          variants.append(prefix)
        }
      }
    }
    for suffixToken in [".widgets", ".ExpoWidgetsTarget"] {
      if bundleId.hasSuffix(suffixToken) {
        let stripped = String(bundleId.dropLast(suffixToken.count))
        if !stripped.isEmpty {
          variants.append(stripped)
        }
      }
    }
    variants.append(bundleId)
    return variants
  }

  private static func collectAppGroupCandidates(configured: String?) -> [String] {
    var rawCandidates: [String] = []

    if let configured, !configured.isEmpty {
      rawCandidates.append(configured)
    }

    for bundle in candidateBundles() {
      if let bundleConfigured = bundle.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String {
        rawCandidates.append(bundleConfigured)
      }
      if let altGroups = bundle.object(forInfoDictionaryKey: "ALTAppGroups") as? [String] {
        rawCandidates.append(contentsOf: altGroups)
      }
      rawCandidates.append(contentsOf: readAppGroupsFromProvisioningProfile(in: bundle))
      if let bundleId = bundle.bundleIdentifier, !bundleId.isEmpty {
        for variant in deriveBundleIdVariants(from: bundleId) {
          rawCandidates.append("group.\\(variant)")
        }
      }
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

  private static func pickBestAppGroup(from list: [String], configured: String?) -> String? {
    guard !list.isEmpty else {
      return nil
    }
    let nonExtension = list.filter {
      !$0.contains(".widgets") && !$0.contains(".ExpoWidgetsTarget")
    }
    let pool = nonExtension.isEmpty ? list : nonExtension
    let sorted = pool.sorted {
      $0.count != $1.count ? $0.count < $1.count : $0 < $1
    }

    if let configured, !configured.isEmpty {
      let baseSlug = configured.replacingOccurrences(of: "group.", with: "")
      if let matchingPrefix = sorted.first(where: { $0.hasPrefix(configured) }) {
        return matchingPrefix
      }
      if !baseSlug.isEmpty, let matchingSlug = sorted.first(where: { $0.contains(baseSlug) }) {
        return matchingSlug
      }
    }

    return sorted.first
  }

  // resolveAppGroupIdentifierV4
  private static func resolveAppGroupIdentifierV4() -> String? {
    var configured: String? = nil
    for bundle in candidateBundles() {
      if let val = (bundle.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
         !val.isEmpty {
        configured = val
        break
      }
    }

    if let configured,
       FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: configured) != nil {
      return configured
    }

    let candidates = collectAppGroupCandidates(configured: configured)
    let accessible = candidates.filter {
      FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: $0) != nil
    }

    if Bundle.main.bundleURL.pathExtension == "appex" {
      let hostAppUrl = Bundle.main.bundleURL
        .deletingLastPathComponent()
        .deletingLastPathComponent()
      if let hostBundle = Bundle(url: hostAppUrl) {
        let selfGroups = Set(readAppGroupsFromProvisioningProfile(in: Bundle.main))
        let hostGroups = Set(readAppGroupsFromProvisioningProfile(in: hostBundle))
        let sharedAccessible = accessible.filter {
          selfGroups.contains($0) && hostGroups.contains($0)
        }
        if let bestShared = pickBestAppGroup(from: sharedAccessible, configured: configured) {
          return bestShared
        }
      }
    }

    if let bestAccessible = pickBestAppGroup(from: accessible, configured: configured) {
      return bestAccessible
    }

    return (configured?.isEmpty == false) ? configured : candidates.first
  }

  public static var appGroupIdentifier: String? = resolveAppGroupIdentifierV4()
  static let defaults: UserDefaults? = appGroupIdentifier.flatMap { UserDefaults(suiteName: $0) }

  private static func storageDirectoryUrl() -> URL? {
    guard let groupId = appGroupIdentifier,
          let containerUrl = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId) else {
      return nil
    }
    let dirUrl = containerUrl.appendingPathComponent("ExpoWidgetsStorage", isDirectory: true)
    if !FileManager.default.fileExists(atPath: dirUrl.path) {
      try? FileManager.default.createDirectory(at: dirUrl, withIntermediateDirectories: true)
    }
    return dirUrl
  }

  private static func fileUrl(forKey key: String) -> URL? {
    guard let dirUrl = storageDirectoryUrl() else {
      return nil
    }
    let safeName = key.map { ch -> Character in
      if ch.isASCII && (ch.isLetter || ch.isNumber || ch == "_" || ch == "-") {
        return ch
      }
      return "_"
    }
    return dirUrl.appendingPathComponent(String(safeName) + ".plist", isDirectory: false)
  }

  private static func writePlistObject(_ value: Any, forKey key: String) {
    guard let url = fileUrl(forKey: key),
          PropertyListSerialization.propertyList(value, isValidFor: .binary) else {
      return
    }
    do {
      let data = try PropertyListSerialization.data(fromPropertyList: value, format: .binary, options: 0)
      try data.write(to: url, options: [.atomic])
    } catch {}
  }

  private static func readPlistObject(forKey key: String) -> Any? {
    guard let url = fileUrl(forKey: key),
          let data = try? Data(contentsOf: url) else {
      return nil
    }
    return try? PropertyListSerialization.propertyList(from: data, options: [], format: nil)
  }

  static func set(_ value: [String: Any], forKey key: String) {
    writePlistObject(value, forKey: key)
    if let defaults {
      defaults.set(value, forKey: key)
      defaults.synchronize()
    }
  }

  static func set(_ value: [[String: Any]], forKey key: String) {
    writePlistObject(value, forKey: key)
    if let defaults {
      defaults.set(value, forKey: key)
      defaults.synchronize()
    }
  }

  static func set(_ value: String, forKey key: String) {
    writePlistObject(["__str": value], forKey: key)
    if let defaults {
      defaults.set(value, forKey: key)
      defaults.synchronize()
    }
  }

  static func set(_ value: Data, forKey key: String) {
    if let url = fileUrl(forKey: key) {
      try? value.write(to: url, options: [.atomic])
    }
    if let defaults {
      defaults.set(value, forKey: key)
      defaults.synchronize()
    }
  }

  public static func getDictionary(forKey key: String) -> [String: Any]? {
    if let dict = readPlistObject(forKey: key) as? [String: Any] {
      return dict
    }
    return defaults?.dictionary(forKey: key)
  }

  public static func getArray(forKey key: String) -> [Any]? {
    if let arr = readPlistObject(forKey: key) as? [Any] {
      return arr
    }
    return defaults?.array(forKey: key)
  }

  public static func getData(forKey key: String) -> Data? {
    if let url = fileUrl(forKey: key),
       let data = try? Data(contentsOf: url) {
      return data
    }
    return defaults?.data(forKey: key)
  }

  public static func getString(forKey key: String) -> String? {
    if let dict = readPlistObject(forKey: key) as? [String: Any],
       let wrapped = dict["__str"] as? String {
      return wrapped
    }
    if let str = readPlistObject(forKey: key) as? String {
      return str
    }
    return defaults?.string(forKey: key)
  }

  static func removeObject(forKey key: String) {
    if let url = fileUrl(forKey: key) {
      try? FileManager.default.removeItem(at: url)
    }
    if let defaults {
      defaults.removeObject(forKey: key)
      defaults.synchronize()
    }
  }

  public static func diagnosticSummary(for name: String) -> String {
    let key = "__expo_widgets_\\(name)_timeline"
    let dirOk = storageDirectoryUrl() != nil ? "OK" : "NO"
    let provCount = readAppGroupsFromProvisioningProfile(in: Bundle.main).count
    let fileCount = (readPlistObject(forKey: key) as? [Any])?.count ?? 0
    let defaultsCount = defaults?.array(forKey: key)?.count ?? 0
    let groupShort = appGroupIdentifier ?? "nil"
    return "g=\\(groupShort) d=\\(dirOk) p=\\(provCount) f=\\(fileCount) u=\\(defaultsCount)"
  }
}
`;

const PATCHED_PARSE_TIMELINE_SWIFT = `// ${UTILS_PATCH_MARKER}
func parseTimeline(identifier: String, name: String, family: WidgetFamily) -> [WidgetsTimelineEntry] {
  func fallbackEntry() -> [WidgetsTimelineEntry] {
    var props = WidgetsLayoutRegistry.initialProps(for: name) ?? [:]
    props["__diag"] = WidgetsStorage.diagnosticSummary(for: name)
    return [WidgetsTimelineEntry(date: Date(), name: name, props: props, entryIndex: nil)]
  }

  guard let timeline = WidgetsStorage.getArray(forKey: "__expo_widgets_\\(name)_timeline") else {
    return fallbackEntry()
  }

  let entries: [WidgetsTimelineEntry?] = timeline.enumerated().map { index, entry in
    if let entry = entry as? [String: Any],
       let timestampNum = entry["timestamp"] as? NSNumber,
       let props = entry["props"] as? [String: Any] {
      return WidgetsTimelineEntry(
        date: Date(timeIntervalSince1970: timestampNum.doubleValue / 1000.0),
        name: name,
        props: props,
        entryIndex: index
      )
    }
    return nil
  }

  let validEntries = entries.compactMap(\\.self)
  return validEntries.isEmpty ? fallbackEntry() : validEntries
}`;

function patchWidgetsStorageContent(currentContent) {
  if (typeof currentContent === "string" && currentContent.includes(PATCH_MARKER)) {
    return currentContent;
  }
  return PATCHED_WIDGETS_STORAGE_SWIFT;
}

function patchUtilsContent(currentContent) {
  if (typeof currentContent !== "string") {
    return currentContent;
  }
  if (currentContent.includes(UTILS_PATCH_MARKER)) {
    return currentContent;
  }
  const parseTimelineRegex =
    /func parseTimeline\([^)]*\)\s*->\s*\[WidgetsTimelineEntry\]\s*\{[\s\S]*?return entries\.compactMap\(\\\.self\)\s*\}/;
  if (!parseTimelineRegex.test(currentContent)) {
    return currentContent;
  }
  return currentContent.replace(parseTimelineRegex, PATCHED_PARSE_TIMELINE_SWIFT);
}

function getExpoWidgetsIosDir() {
  try {
    const pkgPath = require.resolve("expo-widgets/package.json");
    return path.join(path.dirname(pkgPath), "ios");
  } catch {
    return path.join(process.cwd(), "node_modules", "expo-widgets", "ios");
  }
}

function getWidgetsStoragePath() {
  return path.join(getExpoWidgetsIosDir(), "WidgetsStorage.swift");
}

function getWidgetsUtilsPath() {
  return path.join(getExpoWidgetsIosDir(), "Widgets", "Utils.swift");
}

const withWidgetsAppGroupFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const storagePath = getWidgetsStoragePath();
      if (fs.existsSync(storagePath)) {
        const current = fs.readFileSync(storagePath, "utf8");
        const next = patchWidgetsStorageContent(current);
        if (next !== current) {
          fs.writeFileSync(storagePath, next, "utf8");
        }
      }

      const utilsPath = getWidgetsUtilsPath();
      if (fs.existsSync(utilsPath)) {
        const currentUtils = fs.readFileSync(utilsPath, "utf8");
        const nextUtils = patchUtilsContent(currentUtils);
        if (nextUtils !== currentUtils) {
          fs.writeFileSync(utilsPath, nextUtils, "utf8");
        }
      }

      return modConfig;
    },
  ]);
};

module.exports = withWidgetsAppGroupFix;
module.exports.PATCH_MARKER = PATCH_MARKER;
module.exports.UTILS_PATCH_MARKER = UTILS_PATCH_MARKER;
module.exports.patchWidgetsStorageContent = patchWidgetsStorageContent;
module.exports.patchUtilsContent = patchUtilsContent;
module.exports.getWidgetsStoragePath = getWidgetsStoragePath;
module.exports.getWidgetsUtilsPath = getWidgetsUtilsPath;
