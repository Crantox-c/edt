import ExpoModulesCore
import QuartzCore
import UIKit

public final class EdrTextView: ExpoView {
  private let label = UILabel()

  var textValue: String = ""
  var baseColor: UIColor = .white
  var linearExposure: CGFloat = 1.0
  var fontSize: CGFloat = 16.0
  var fontFamily: String?
  var glowColor: UIColor?
  var glowRadius: CGFloat = 0.0

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    isUserInteractionEnabled = false
    backgroundColor = .clear
    clipsToBounds = false

    label.textAlignment = .center
    label.backgroundColor = .clear
    label.clipsToBounds = false
    label.adjustsFontForContentSizeCategory = false

    addSubview(label)
    applyAppearance()
  }

  override public func layoutSubviews() {
    super.layoutSubviews()
    label.frame = bounds
  }

  private func resolveFont() -> UIFont {
    let resolvedSize = max(8.0, fontSize)
    var candidates: [String] = []

    if let family = fontFamily, !family.isEmpty {
      candidates.append(family)
      let normalized = family
        .replacingOccurrences(of: "_800ExtraBold", with: "-ExtraBold")
        .replacingOccurrences(of: "_700Bold", with: "-Bold")
        .replacingOccurrences(of: "_600SemiBold", with: "-SemiBold")
        .replacingOccurrences(of: "_500Medium", with: "-Medium")
      if normalized != family {
        candidates.append(normalized)
      }
    }

    candidates.append("PlusJakartaSans-Bold")

    for name in candidates {
      if let customFont = UIFont(name: name, size: resolvedSize) {
        return customFont
      }
    }

    return UIFont.monospacedDigitSystemFont(ofSize: resolvedSize, weight: .bold)
  }

  func applyAppearance() {
    label.text = textValue
    label.font = resolveFont()

    let clampedExposure = max(1.0, linearExposure)

    var r: CGFloat = 1.0
    var g: CGFloat = 1.0
    var b: CGFloat = 1.0
    var a: CGFloat = 1.0

    if !baseColor.getRed(&r, green: &g, blue: &b, alpha: &a) {
      var white: CGFloat = 1.0
      if baseColor.getWhite(&white, alpha: &a) {
        r = white
        g = white
        b = white
      }
    }

    #if compiler(>=6.2)
    if #available(iOS 26.0, *) {
      if clampedExposure > 1.0 {
        label.textColor = UIColor(
          red: r,
          green: g,
          blue: b,
          alpha: a,
          linearExposure: clampedExposure
        )
        label.layer.preferredDynamicRange = .high
        label.layer.contentsHeadroom = clampedExposure
        self.layer.preferredDynamicRange = .high
      } else {
        label.textColor = baseColor
        label.layer.preferredDynamicRange = .standard
        label.layer.contentsHeadroom = 1.0
        self.layer.preferredDynamicRange = .standard
      }
    } else {
      label.textColor = baseColor
    }
    #else
    label.textColor = baseColor
    #endif

    if let glowColor, glowRadius > 0 {
      label.layer.shadowColor = glowColor.cgColor
      label.layer.shadowRadius = glowRadius
      label.layer.shadowOpacity = 0.75
      label.layer.shadowOffset = .zero
    } else {
      label.layer.shadowColor = nil
      label.layer.shadowRadius = 0
      label.layer.shadowOpacity = 0
      label.layer.shadowOffset = .zero
    }
  }
}
