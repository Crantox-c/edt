import ExpoModulesCore
import Metal
import UIKit

public final class EdrTextModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EdrText")

    Constant("isEdrAvailable") {
      #if compiler(>=6.2)
      if #available(iOS 26.0, *) {
        return true
      }
      #endif
      return false
    }

    Constant("isPhosphorStripAvailable") {
      return MTLCreateSystemDefaultDevice() != nil
    }

    Function("boostGlassEdr") {
      #if compiler(>=6.2)
      if #available(iOS 26.0, *) {
        Task { @MainActor in
          EdrWindowBooster.boostAllWindows()
        }
      }
      #endif
    }

    View(EdrTextView.self) {
      Prop("text") { (view, text: String) in
        view.textValue = text
      }

      Prop("color") { (view, color: UIColor?) in
        view.baseColor = color ?? .white
      }

      Prop("linearExposure") { (view, linearExposure: CGFloat?) in
        view.linearExposure = linearExposure ?? 1.0
      }

      Prop("fontSize") { (view, fontSize: CGFloat?) in
        view.fontSize = fontSize ?? 16.0
      }

      Prop("fontFamily") { (view, fontFamily: String?) in
        view.fontFamily = fontFamily
      }

      Prop("glowColor") { (view, glowColor: UIColor?) in
        view.glowColor = glowColor
      }

      Prop("glowRadius") { (view, glowRadius: CGFloat?) in
        view.glowRadius = glowRadius ?? 0.0
      }

      OnViewDidUpdateProps { view in
        view.applyAppearance()
      }
    }

    View(StatusBarEdgeBlurView.self) {}

    View(PhosphorDayStripView.self) {
      Events("onSelectDay")

      Prop("days") { (view, days: [[String: Any]]) in
        view.rawDays = days
      }

      Prop("selectedIndex") { (view, selectedIndex: Int?) in
        view.requestedSelectedIndex = selectedIndex ?? 0
      }

      Prop("itemWidth") { (view, itemWidth: Double?) in
        view.itemWidthProp = CGFloat(itemWidth ?? 58.0)
      }

      Prop("accentColor") { (view, color: UIColor?) in
        if let color {
          view.accentColorProp = color
        }
      }

      Prop("selectedTextColor") { (view, color: UIColor?) in
        if let color {
          view.selectedTextColorProp = color
        }
      }

      Prop("weekdayColor") { (view, color: UIColor?) in
        if let color {
          view.weekdayColorProp = color
        }
      }

      Prop("numberColor") { (view, color: UIColor?) in
        if let color {
          view.numberColorProp = color
        }
      }

      Prop("todayColor") { (view, color: UIColor?) in
        if let color {
          view.todayColorProp = color
        }
      }

      Prop("isDark") { (view, isDark: Bool?) in
        view.isDarkProp = isDark ?? true
      }

      Prop("hapticsEnabled") { (view, enabled: Bool?) in
        view.hapticsEnabledProp = enabled ?? true
      }

      Prop("reducedMotion") { (view, reduced: Bool?) in
        view.reducedMotionProp = reduced ?? false
      }

      OnViewDidUpdateProps { view in
        view.applyUpdatedProps()
      }
    }
  }
}
