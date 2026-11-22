import ExpoModulesCore
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
  }
}
