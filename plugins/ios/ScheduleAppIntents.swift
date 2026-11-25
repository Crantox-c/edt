import AppIntents
import Foundation

@available(iOS 16.4, *)
struct IntentCourseItem: Codable, Sendable {
  let key: String
  let title: String
  let rawTitle: String
  let subject: String
  let room: String
  let compactRoom: String
  let teacher: String
  let kind: String
  let isDS: Bool
  let dateIso: String
  let startMs: Double
  let endMs: Double
  let startLabel: String
  let endLabel: String
}

@available(iOS 16.4, *)
struct ScheduleIntentsSnapshot: Codable, Sendable {
  let version: Int
  let groupName: String
  let generatedAtMs: Double
  let lastSyncMs: Double?
  let courses: [IntentCourseItem]
}

@available(iOS 16.4, *)
enum ScheduleIntentsStore {
  private static let snapshotDirName = "GEIIEdtIntents"
  private static let snapshotFileName = "schedule_snapshot.json"
  private static let defaultsKey = "geii_edt_intents_snapshot_v1"

  private static var parisTimeZone: TimeZone {
    TimeZone(identifier: "Europe/Paris") ?? .current
  }

  private static var parisCalendar: Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = parisTimeZone
    calendar.locale = Locale(identifier: "fr_FR")
    return calendar
  }

  static func loadSnapshot() -> ScheduleIntentsSnapshot? {
    let decoder = JSONDecoder()

    if let appSupport = FileManager.default.urls(
      for: .applicationSupportDirectory,
      in: .userDomainMask
    ).first {
      let fileUrl = appSupport
        .appendingPathComponent(snapshotDirName, isDirectory: true)
        .appendingPathComponent(snapshotFileName, isDirectory: false)
      if let data = try? Data(contentsOf: fileUrl),
         let decoded = try? decoder.decode(ScheduleIntentsSnapshot.self, from: data) {
        return decoded
      }
    }

    if let rawJson = UserDefaults.standard.string(forKey: defaultsKey),
       let data = rawJson.data(using: .utf8),
       let decoded = try? decoder.decode(ScheduleIntentsSnapshot.self, from: data) {
      return decoded
    }

    return nil
  }

  static func parisDateIso(for date: Date) -> String {
    let formatter = DateFormatter()
    formatter.calendar = parisCalendar
    formatter.timeZone = parisTimeZone
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
  }

  static func addDays(to date: Date, days: Int) -> Date {
    parisCalendar.date(byAdding: .day, value: days, to: date) ?? date
  }

  static func formatRelativeDay(dateIso: String, now: Date) -> String {
    let todayIso = parisDateIso(for: now)
    if dateIso == todayIso {
      return "aujourd'hui"
    }
    let tomorrowIso = parisDateIso(for: addDays(to: now, days: 1))
    if dateIso == tomorrowIso {
      return "demain"
    }

    let parser = DateFormatter()
    parser.calendar = parisCalendar
    parser.timeZone = parisTimeZone
    parser.locale = Locale(identifier: "en_US_POSIX")
    parser.dateFormat = "yyyy-MM-dd"

    guard let parsed = parser.date(from: dateIso) else {
      return dateIso
    }

    let french = DateFormatter()
    french.calendar = parisCalendar
    french.timeZone = parisTimeZone
    french.locale = Locale(identifier: "fr_FR")
    french.dateFormat = "EEEE d MMMM"
    return french.string(from: parsed)
  }

  static func formatRoomPhrase(_ room: String) -> String {
    let trimmed = room.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty || trimmed.caseInsensitiveCompare("salle non communiquée") == .orderedSame {
      return "salle non communiquée"
    }
    return "en salle \(trimmed)"
  }

  static func formatCourseLine(_ course: IntentCourseItem) -> String {
    let teacherPart = course.teacher.isEmpty ? "" : " · \(course.teacher)"
    return "\(course.startLabel)–\(course.endLabel) · \(course.title) · \(course.compactRoom)\(teacherPart)"
  }
}

@available(iOS 16.4, *)
enum ScheduleIntentDay: String, AppEnum {
  case today
  case tomorrow

  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Jour")

  static let caseDisplayRepresentations: [ScheduleIntentDay: DisplayRepresentation] = [
    .today: DisplayRepresentation(title: "Aujourd'hui"),
    .tomorrow: DisplayRepresentation(title: "Demain"),
  ]
}

@available(iOS 16.4, *)
struct NextCourseIntent: AppIntent {
  static let title: LocalizedStringResource = "Prochain cours"
  static let description = IntentDescription(
    "Affiche et énonce le cours en cours ou le prochain cours à venir avec l'horaire et la salle."
  )
  static let openAppWhenRun: Bool = false

  func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    guard let snapshot = ScheduleIntentsStore.loadSnapshot() else {
      let msg = "Aucun emploi du temps n'est encore synchronisé. Ouvrez l'application EDT une première fois."
      return .result(value: msg, dialog: IntentDialog("\(msg)"))
    }

    let now = Date()
    let nowMs = now.timeIntervalSince1970 * 1000.0
    let sorted = snapshot.courses.sorted {
      $0.startMs != $1.startMs ? $0.startMs < $1.startMs : $0.endMs < $1.endMs
    }

    if let active = sorted.first(where: { $0.startMs <= nowMs && nowMs < $0.endMs }) {
      let roomPhrase = ScheduleIntentsStore.formatRoomPhrase(active.room)
      let teacherPhrase = active.teacher.isEmpty ? "" : " avec \(active.teacher)"
      let nextSameDay = sorted.first(where: {
        $0.key != active.key && $0.dateIso == active.dateIso && $0.startMs >= active.endMs
      })
      let followingSuffix = nextSameDay.map {
        " Ensuite : \($0.title) à \($0.startLabel) (\(ScheduleIntentsStore.formatRoomPhrase($0.room)))."
      } ?? ""

      let value = "\(active.title) (en cours jusqu'à \(active.endLabel)) · \(active.compactRoom)"
      let dialog = "Actuellement en cours : \(active.title)\(teacherPhrase), \(roomPhrase), jusqu'à \(active.endLabel).\(followingSuffix)"
      return .result(value: value, dialog: IntentDialog("\(dialog)"))
    }

    guard let next = sorted.first(where: { $0.startMs > nowMs }) else {
      let msg = "Aucun cours à venir dans votre emploi du temps synchronisé."
      return .result(value: msg, dialog: IntentDialog("\(msg)"))
    }

    let dayLabel = ScheduleIntentsStore.formatRelativeDay(dateIso: next.dateIso, now: now)
    let roomPhrase = ScheduleIntentsStore.formatRoomPhrase(next.room)
    let teacherPhrase = next.teacher.isEmpty ? "" : " avec \(next.teacher)"
    let dsPrefix = next.isDS ? "DS : " : ""
    let value = "\(dsPrefix)\(next.title) · \(dayLabel) \(next.startLabel)–\(next.endLabel) · \(next.compactRoom)"
    let dialog = "Prochain cours \(dayLabel) à \(next.startLabel) : \(dsPrefix)\(next.title)\(teacherPhrase), \(roomPhrase)."
    return .result(value: value, dialog: IntentDialog("\(dialog)"))
  }
}

@available(iOS 16.4, *)
struct FirstCourseTomorrowTimeIntent: AppIntent {
  static let title: LocalizedStringResource = "Heure du premier cours demain"
  static let description = IntentDescription(
    "Renvoie la date et l'heure du premier cours de demain (idéal pour régler votre réveil dans Raccourcis)."
  )
  static let openAppWhenRun: Bool = false

  @Parameter(
    title: "Chercher le prochain jour de cours si demain est libre",
    default: false
  )
  var fallbackToNextSchoolDay: Bool

  func perform() async throws -> some IntentResult & ReturnsValue<Date?> & ProvidesDialog {
    guard let snapshot = ScheduleIntentsStore.loadSnapshot() else {
      let emptyDate: Date? = nil
      let msg = "Aucun emploi du temps synchronisé. Ouvrez l'application EDT."
      return .result(value: emptyDate, dialog: IntentDialog("\(msg)"))
    }

    let now = Date()
    let tomorrowIso = ScheduleIntentsStore.parisDateIso(
      for: ScheduleIntentsStore.addDays(to: now, days: 1)
    )
    let sorted = snapshot.courses.sorted {
      $0.startMs != $1.startMs ? $0.startMs < $1.startMs : $0.endMs < $1.endMs
    }

    let targetCourse: IntentCourseItem?
    if let tomorrowCourse = sorted.first(where: { $0.dateIso == tomorrowIso }) {
      targetCourse = tomorrowCourse
    } else if fallbackToNextSchoolDay {
      targetCourse = sorted.first(where: { $0.dateIso >= tomorrowIso })
    } else {
      targetCourse = nil
    }

    guard let course = targetCourse else {
      let emptyDate: Date? = nil
      let msg = "Aucun cours prévu demain."
      return .result(value: emptyDate, dialog: IntentDialog("\(msg)"))
    }

    let startDate: Date? = Date(timeIntervalSince1970: course.startMs / 1000.0)
    let dayLabel = ScheduleIntentsStore.formatRelativeDay(dateIso: course.dateIso, now: now)
    let roomPhrase = ScheduleIntentsStore.formatRoomPhrase(course.room)
    let dialog = "Premier cours \(dayLabel) à \(course.startLabel) : \(course.title), \(roomPhrase)."
    return .result(value: startDate, dialog: IntentDialog("\(dialog)"))
  }
}

@available(iOS 16.4, *)
struct TodayCoursesIntent: AppIntent {
  static let title: LocalizedStringResource = "Cours du jour"
  static let description = IntentDescription(
    "Liste l'ensemble des séances prévues aujourd'hui ou demain."
  )
  static let openAppWhenRun: Bool = false

  @Parameter(title: "Jour", default: .today)
  var day: ScheduleIntentDay

  func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    guard let snapshot = ScheduleIntentsStore.loadSnapshot() else {
      let msg = "Aucun emploi du temps synchronisé. Ouvrez l'application EDT."
      return .result(value: msg, dialog: IntentDialog("\(msg)"))
    }

    let now = Date()
    let targetDate = day == .tomorrow
      ? ScheduleIntentsStore.addDays(to: now, days: 1)
      : now
    let targetIso = ScheduleIntentsStore.parisDateIso(for: targetDate)
    let dayWord = day == .tomorrow ? "demain" : "aujourd'hui"

    let dayCourses = snapshot.courses
      .filter { $0.dateIso == targetIso }
      .sorted { $0.startMs != $1.startMs ? $0.startMs < $1.startMs : $0.endMs < $1.endMs }

    guard let first = dayCourses.first, let last = dayCourses.last else {
      let msg = "Vous n'avez aucun cours prévu \(dayWord)."
      return .result(value: msg, dialog: IntentDialog("\(msg)"))
    }

    let lines = dayCourses.map(ScheduleIntentsStore.formatCourseLine).joined(separator: "\n")
    let countWord = dayCourses.count == 1 ? "1 cours" : "\(dayCourses.count) cours"
    let firstRoom = ScheduleIntentsStore.formatRoomPhrase(first.room)
    let dialog = "Vous avez \(countWord) \(dayWord), de \(first.startLabel) à \(last.endLabel). Premier cours : \(first.title) \(firstRoom)."
    return .result(value: lines, dialog: IntentDialog("\(dialog)"))
  }
}

@available(iOS 16.4, *)
struct NextDSIntent: AppIntent {
  static let title: LocalizedStringResource = "Prochain DS"
  static let description = IntentDescription(
    "Indique la date, l'heure et la salle de votre prochaine évaluation (DS)."
  )
  static let openAppWhenRun: Bool = false

  func perform() async throws -> some IntentResult & ReturnsValue<Date?> & ProvidesDialog {
    guard let snapshot = ScheduleIntentsStore.loadSnapshot() else {
      let emptyDate: Date? = nil
      let msg = "Aucun emploi du temps synchronisé. Ouvrez l'application EDT."
      return .result(value: emptyDate, dialog: IntentDialog("\(msg)"))
    }

    let now = Date()
    let nowMs = now.timeIntervalSince1970 * 1000.0
    let nextDs = snapshot.courses
      .filter { $0.isDS && $0.endMs > nowMs }
      .sorted { $0.startMs != $1.startMs ? $0.startMs < $1.startMs : $0.endMs < $1.endMs }
      .first

    guard let ds = nextDs else {
      let emptyDate: Date? = nil
      let msg = "Aucun DS à venir dans l'emploi du temps synchronisé."
      return .result(value: emptyDate, dialog: IntentDialog("\(msg)"))
    }

    let dsDate: Date? = Date(timeIntervalSince1970: ds.startMs / 1000.0)
    let dayLabel = ScheduleIntentsStore.formatRelativeDay(dateIso: ds.dateIso, now: now)
    let roomPhrase = ScheduleIntentsStore.formatRoomPhrase(ds.room)
    let dialog = "Prochain DS : \(ds.title) \(dayLabel) à \(ds.startLabel), \(roomPhrase)."
    return .result(value: dsDate, dialog: IntentDialog("\(dialog)"))
  }
}

@available(iOS 16.4, *)
struct ScheduleAppShortcutsProvider: AppShortcutsProvider {
  @AppShortcutsBuilder
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: NextCourseIntent(),
      phrases: [
        "Prochain cours dans \(.applicationName)",
        "Quel est mon prochain cours dans \(.applicationName)",
        "Mon prochain cours \(.applicationName)"
      ],
      shortTitle: "Prochain cours",
      systemImageName: "clock.fill"
    )

    AppShortcut(
      intent: FirstCourseTomorrowTimeIntent(),
      phrases: [
        "Heure du premier cours demain dans \(.applicationName)",
        "À quelle heure je commence demain dans \(.applicationName)"
      ],
      shortTitle: "Premier cours demain",
      systemImageName: "alarm.fill"
    )

    AppShortcut(
      intent: TodayCoursesIntent(),
      phrases: [
        "Cours du jour dans \(.applicationName)",
        "Mon emploi du temps du jour dans \(.applicationName)"
      ],
      shortTitle: "Cours du jour",
      systemImageName: "calendar"
    )

    AppShortcut(
      intent: NextDSIntent(),
      phrases: [
        "Prochain DS dans \(.applicationName)",
        "Quand est mon prochain DS dans \(.applicationName)"
      ],
      shortTitle: "Prochain DS",
      systemImageName: "exclamationmark.circle.fill"
    )
  }
}
