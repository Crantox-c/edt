import ExpoModulesCore
import UIKit

public final class StatusBarEdgeBlurView: ExpoView {
  private let edgeAnchorView = UIView()
  private var edgeInteraction: AnyObject?

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    isUserInteractionEnabled = false
    backgroundColor = .clear
    clipsToBounds = false

    edgeAnchorView.isUserInteractionEnabled = false
    edgeAnchorView.backgroundColor = .clear
    addSubview(edgeAnchorView)
  }

  override public func layoutSubviews() {
    super.layoutSubviews()
    edgeAnchorView.frame = bounds
    if edgeInteraction == nil {
      attachIfPossible()
    }
  }

  override public func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      attachIfPossible()
      DispatchQueue.main.async { [weak self] in
        self?.attachIfPossible()
      }
    }
  }

  private func findPrimaryScrollView(in root: UIView) -> UIScrollView? {
    var fallback: UIScrollView?

    func walk(_ view: UIView) -> UIScrollView? {
      if view === self {
        return nil
      }
      if let scrollView = view as? UIScrollView {
        if fallback == nil {
          fallback = scrollView
        }
        if scrollView.bounds.height > 120 {
          return scrollView
        }
      }
      for child in view.subviews {
        if let found = walk(child) {
          return found
        }
      }
      return nil
    }

    return walk(root) ?? fallback
  }

  private func attachIfPossible() {
    #if compiler(>=6.2)
    if #available(iOS 26.0, *) {
      guard let hostView = superview,
            let scrollView = findPrimaryScrollView(in: hostView) else {
        return
      }

      scrollView.topEdgeEffect.isHidden = false
      scrollView.topEdgeEffect.style = .soft

      if let existing = edgeInteraction as? UIScrollEdgeElementContainerInteraction,
         existing.scrollView === scrollView {
        return
      }
      if let previous = edgeInteraction as? UIInteraction {
        removeInteraction(previous)
      }

      let interaction = UIScrollEdgeElementContainerInteraction()
      interaction.scrollView = scrollView
      interaction.edge = .top
      addInteraction(interaction)
      edgeInteraction = interaction
    }
    #endif
  }
}
