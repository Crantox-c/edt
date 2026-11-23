import ExpoModulesCore
import UIKit

/// Relie explicitement le `UIScrollView` vertical principal de l'écran au `UIViewController`
/// hôte (`setContentScrollView(_:for: .all)`) et active `topEdgeEffect` / `bottomEdgeEffect`
/// en style `.soft` sur iOS 26+.
/// Résout le déblocage du repli des grands titres (`UINavigationBar`) et garantit le flou
/// progressif natif en haut et en bas sur chaque onglet (Agenda, Réglages, Recherche).
public final class StatusBarEdgeBlurView: ExpoView {
  private weak var boundScrollView: UIScrollView?
  private weak var boundController: UIViewController?

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isUserInteractionEnabled = false
    backgroundColor = .clear
    clipsToBounds = true
  }

  override public func layoutSubviews() {
    super.layoutSubviews()
    attachIfPossible()
  }

  override public func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      attachIfPossible()
      DispatchQueue.main.async { [weak self] in
        self?.attachIfPossible()
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
        self?.attachIfPossible()
      }
    }
  }

  private func findOwningViewController() -> UIViewController? {
    var responder: UIResponder? = self
    while let current = responder {
      if let vc = current as? UIViewController {
        return vc
      }
      responder = current.next
    }
    return nil
  }

  private func findPrimaryVerticalScrollView(in root: UIView) -> UIScrollView? {
    // Parcours en largeur (BFS) pour cibler le ScrollView principal de l'écran
    // avant les ScrollViews horizontaux imbriqués (bandeau jours, grille semaine, etc.).
    var queue: [UIView] = [root]
    var index = 0
    var fallback: UIScrollView?

    while index < queue.count {
      let view = queue[index]
      index += 1

      if view === self {
        continue
      }

      if let scrollView = view as? UIScrollView {
        let isHorizontalOnly = scrollView.alwaysBounceHorizontal && !scrollView.alwaysBounceVertical
        if !isHorizontalOnly {
          if fallback == nil {
            fallback = scrollView
          }
          if scrollView.bounds.height > 120 {
            return scrollView
          }
        }
        continue
      }

      for child in view.subviews {
        queue.append(child)
      }
    }

    return fallback
  }

  private func attachIfPossible() {
    guard window != nil else { return }

    let owningVC = findOwningViewController()
    let searchRoot = owningVC?.view ?? superview
    guard let root = searchRoot,
          let scrollView = findPrimaryVerticalScrollView(in: root) else {
      return
    }

    if let vc = owningVC {
      let alreadyBound = (boundController === vc && boundScrollView === scrollView)
      if !alreadyBound || vc.contentScrollView(for: .top) !== scrollView {
        vc.setContentScrollView(scrollView, for: .all)
        vc.navigationController?.navigationBar.setNeedsLayout()
      }
      boundController = vc
    }

    boundScrollView = scrollView

    #if compiler(>=6.2)
    if #available(iOS 26.0, *) {
      scrollView.topEdgeEffect.isHidden = false
      scrollView.topEdgeEffect.style = .soft
      scrollView.bottomEdgeEffect.isHidden = false
      scrollView.bottomEdgeEffect.style = .soft
    }
    #endif
  }
}
