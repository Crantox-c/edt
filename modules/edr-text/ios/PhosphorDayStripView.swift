import ExpoModulesCore
import Metal
import QuartzCore
import UIKit

private struct PhosphorDayItem {
  let date: String
  let weekday: String
  let dayNum: String
  let isToday: Bool
  let dotColors: [SIMD4<Float>]
}

private struct CellUniforms {
  var rectPx: SIMD4<Float>          // (originX, originY, width, height) in drawable px
  var viewAndParams: SIMD4<Float>   // (viewW, viewH, glow, maxHeadroom)
  var flagsAndDots: SIMD4<Float>    // (isDark, isToday, dotCount, scale)
  var accentRGB: SIMD4<Float>
  var selectedRGB: SIMD4<Float>
  var weekdayRGB: SIMD4<Float>
  var numberRGB: SIMD4<Float>
  var todayRGB: SIMD4<Float>
  var dot0RGB: SIMD4<Float>
  var dot1RGB: SIMD4<Float>
  var dot2RGB: SIMD4<Float>
}

private final class DisplayLinkProxy: NSObject {
  weak var target: PhosphorDayStripView?

  init(target: PhosphorDayStripView) {
    self.target = target
  }

  @objc func step(_ link: CADisplayLink) {
    target?.onDisplayLink(link)
  }
}

private final class PhosphorMetalResources {
  let device: MTLDevice
  let commandQueue: MTLCommandQueue
  let bloomPipeline: MTLRenderPipelineState
  let glyphPipeline: MTLRenderPipelineState

  static let shared: PhosphorMetalResources? = PhosphorMetalResources()

  private static let shaderSource = """
  #include <metal_stdlib>
  using namespace metal;

  struct CellUniforms {
    float4 rectPx;
    float4 viewAndParams;
    float4 flagsAndDots;
    float4 accentRGB;
    float4 selectedRGB;
    float4 weekdayRGB;
    float4 numberRGB;
    float4 todayRGB;
    float4 dot0RGB;
    float4 dot1RGB;
    float4 dot2RGB;
  };

  struct VertexOut {
    float4 position [[position]];
    float2 uv;
  };

  constant float2 kQuadCorners[6] = {
    float2(0.0, 0.0),
    float2(1.0, 0.0),
    float2(0.0, 1.0),
    float2(1.0, 0.0),
    float2(1.0, 1.0),
    float2(0.0, 1.0)
  };

  inline float pillEdgeAlpha(float2 fragPx, float2 viewPx) {
    float u = fragPx.x / max(viewPx.x, 1.0);
    // Fondu progressif ~14% sur les bords gauche/droite directement en alpha flottant (zéro masque 8-bit)
    float hFade = smoothstep(0.0, 0.14, u) * smoothstep(0.0, 0.14, 1.0 - u);
    // Découpe capsule continue anti-aliasée dans le fragment shader
    float r = viewPx.y * 0.5;
    float2 halfSize = viewPx * 0.5;
    float2 p = fragPx - halfSize;
    float2 q = abs(p) - float2(max(halfSize.x - r, 0.0), max(halfSize.y - r, 0.0));
    float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    float capsule = 1.0 - smoothstep(-1.0, 1.0, sdf);
    return hFade * capsule;
  }

  vertex VertexOut phosphorBloomVertex(uint vid [[vertex_id]], constant CellUniforms &u [[buffer(0)]]) {
    float2 corner = kQuadCorners[vid];
    // Étend le quad horizontalement de ±38% pour laisser le bloom de traînée se fondre entre jours
    float2 localUV = float2(mix(-0.38, 1.38, corner.x), corner.y);
    float2 px = u.rectPx.xy + localUV * u.rectPx.zw;
    float2 viewPx = max(u.viewAndParams.xy, float2(1.0));
    float2 ndc = float2((px.x / viewPx.x) * 2.0 - 1.0, 1.0 - (px.y / viewPx.y) * 2.0);
    VertexOut out;
    out.position = float4(ndc, 0.0, 1.0);
    out.uv = localUV;
    return out;
  }

  vertex VertexOut phosphorGlyphVertex(uint vid [[vertex_id]], constant CellUniforms &u [[buffer(0)]]) {
    float2 corner = kQuadCorners[vid];
    float2 px = u.rectPx.xy + corner * u.rectPx.zw;
    float2 viewPx = max(u.viewAndParams.xy, float2(1.0));
    float2 ndc = float2((px.x / viewPx.x) * 2.0 - 1.0, 1.0 - (px.y / viewPx.y) * 2.0);
    VertexOut out;
    out.position = float4(ndc, 0.0, 1.0);
    out.uv = corner;
    return out;
  }

  fragment float4 phosphorBloomFragment(
    VertexOut in [[stage_in]],
    constant CellUniforms &u [[buffer(0)]],
    texture2d<float> cellTex [[texture(0)]]
  ) {
    float glow = u.viewAndParams.z;
    if (glow <= 0.004) {
      return float4(0.0);
    }

    float edgeAlpha = pillEdgeAlpha(in.position.xy, u.viewAndParams.xy);
    if (edgeAlpha <= 0.0005) {
      return float4(0.0);
    }

    float headroom = u.viewAndParams.w;
    bool isDark = u.flagsAndDots.x > 0.5;
    int dotCount = int(round(u.flagsAndDots.z));
    float scale = max(u.flagsAndDots.w, 1.0);

    // 1. Halo phosphor radial doux (crée la comète lumineuse continue lors d'un flick rapide)
    float2 d = (in.uv - float2(0.5, 0.52)) * float2(1.12, 1.45);
    float radial = exp(-dot(d, d) * 3.1);
    float auraGain = isDark ? (0.34 * headroom) : 0.14;
    float3 bloomRGB = u.accentRGB.rgb * pow(glow, 1.25) * auraGain * radial;

    // 2. Bloom de contour des glyphes pré-flouté (canal B)
    if (in.uv.x >= 0.0 && in.uv.x <= 1.0 && in.uv.y >= 0.0 && in.uv.y <= 1.0) {
      constexpr sampler s(coord::normalized, address::clamp_to_edge, filter::linear);
      float glyphHalo = cellTex.sample(s, in.uv).b;
      float3 haloTint = isDark ? mix(u.accentRGB.rgb, float3(1.0), 0.34) : u.accentRGB.rgb;
      float haloGain = isDark ? (0.68 * headroom) : 0.20;
      bloomRGB += haloTint * (glow * glow) * haloGain * glyphHalo;
    }

    // 3. Bloom autour des pastilles matières (SDF analytique)
    if (dotCount > 0) {
      float2 cellPx = in.uv * u.rectPx.zw;
      float centerX = u.rectPx.z * 0.5;
      float dotY = u.rectPx.w * 0.84;
      float dotRadius = 1.9 * scale;
      float dotSpacing = 6.2 * scale;
      float invSigma2 = 1.0 / max(dotRadius * dotRadius * 9.5, 1.0);
      float dotBloomGain = isDark ? (0.42 * headroom) : 0.14;

      for (int j = 0; j < 3; j++) {
        if (j >= dotCount) break;
        float offsetX = (float(j) - 0.5 * float(dotCount - 1)) * dotSpacing;
        float2 diff = cellPx - float2(centerX + offsetX, dotY);
        float falloff = exp(-dot(diff, diff) * invSigma2);
        float3 dCol = (j == 0) ? u.dot0RGB.rgb : ((j == 1) ? u.dot1RGB.rgb : u.dot2RGB.rgb);
        bloomRGB += mix(dCol, u.accentRGB.rgb, 0.35) * (glow * glow) * dotBloomGain * falloff;
      }
    }

    // Alpha = 0 avec RGB > 0 en mode additif pur : ajoute de la lumière EDR sans assombrir le verre
    return float4(bloomRGB * edgeAlpha, 0.0);
  }

  fragment float4 phosphorGlyphFragment(
    VertexOut in [[stage_in]],
    constant CellUniforms &u [[buffer(0)]],
    texture2d<float> cellTex [[texture(0)]]
  ) {
    float edgeAlpha = pillEdgeAlpha(in.position.xy, u.viewAndParams.xy);
    if (edgeAlpha <= 0.0005) {
      return float4(0.0);
    }

    constexpr sampler s(coord::normalized, address::clamp_to_edge, filter::linear);
    float4 masks = cellTex.sample(s, in.uv);
    float weekdayAlpha = masks.r;
    float numberAlpha = masks.g;

    float glow = u.viewAndParams.z;
    float headroom = u.viewAndParams.w;
    bool isDark = u.flagsAndDots.x > 0.5;
    bool isToday = u.flagsAndDots.y > 0.5;
    int dotCount = int(round(u.flagsAndDots.z));
    float scale = max(u.flagsAndDots.w, 1.0);

    // Couleur jour de semaine (LUN, MAR...)
    float3 wkLit = isDark
      ? mix(u.accentRGB.rgb, float3(1.0), 0.38) * (0.62 + 0.52 * headroom)
      : u.accentRGB.rgb;
    float3 wkRGB = mix(u.weekdayRGB.rgb, wkLit, glow);

    // Couleur numéro du jour — exploite 100% du headroom EDR matériel en mode sombre
    float3 numIdle = isToday ? u.todayRGB.rgb : u.numberRGB.rgb;
    float3 numLit = isDark
      ? mix(u.accentRGB.rgb, u.selectedRGB.rgb, 0.78) * headroom
      : mix(u.selectedRGB.rgb, u.accentRGB.rgb, 0.25);
    float3 numRGB = mix(numIdle, numLit, glow);

    float3 outRGB = float3(0.0);
    float outA = 0.0;

    if (weekdayAlpha > 0.001) {
      outRGB += wkRGB * weekdayAlpha;
      outA = max(outA, weekdayAlpha);
    }

    if (numberAlpha > 0.001) {
      outRGB = outRGB * (1.0 - numberAlpha) + numRGB * numberAlpha;
      outA = outA + numberAlpha * (1.0 - outA);
    }

    // Pastilles matières analytiques anti-aliasées (SDF)
    if (dotCount > 0) {
      float2 cellPx = in.uv * u.rectPx.zw;
      float centerX = u.rectPx.z * 0.5;
      float dotY = u.rectPx.w * 0.84;
      float dotRadius = 1.9 * scale;
      float dotSpacing = 6.2 * scale;

      for (int j = 0; j < 3; j++) {
        if (j >= dotCount) break;
        float offsetX = (float(j) - 0.5 * float(dotCount - 1)) * dotSpacing;
        float dist = length(cellPx - float2(centerX + offsetX, dotY));
        float cov = 1.0 - smoothstep(dotRadius - 0.75, dotRadius + 0.75, dist);
        if (cov > 0.001) {
          float3 baseDot = (j == 0) ? u.dot0RGB.rgb : ((j == 1) ? u.dot1RGB.rgb : u.dot2RGB.rgb);
          float3 litDot = isDark
            ? mix(baseDot, float3(1.0), 0.58) * headroom
            : mix(baseDot, u.accentRGB.rgb, 0.35);
          float3 dotRGB = mix(baseDot, litDot, glow);
          outRGB = outRGB * (1.0 - cov) + dotRGB * cov;
          outA = outA + cov * (1.0 - outA);
        }
      }
    }

    return float4(outRGB * edgeAlpha, outA * edgeAlpha);
  }
  """

  private init?() {
    guard let device = MTLCreateSystemDefaultDevice(),
          let queue = device.makeCommandQueue(),
          let library = try? device.makeLibrary(source: Self.shaderSource, options: nil),
          let bloomVert = library.makeFunction(name: "phosphorBloomVertex"),
          let bloomFrag = library.makeFunction(name: "phosphorBloomFragment"),
          let glyphVert = library.makeFunction(name: "phosphorGlyphVertex"),
          let glyphFrag = library.makeFunction(name: "phosphorGlyphFragment") else {
      return nil
    }

    let bloomDesc = MTLRenderPipelineDescriptor()
    bloomDesc.vertexFunction = bloomVert
    bloomDesc.fragmentFunction = bloomFrag
    bloomDesc.colorAttachments[0].pixelFormat = .rgba16Float
    bloomDesc.colorAttachments[0].isBlendingEnabled = true
    bloomDesc.colorAttachments[0].rgbBlendOperation = .add
    bloomDesc.colorAttachments[0].alphaBlendOperation = .add
    bloomDesc.colorAttachments[0].sourceRGBBlendFactor = .one
    bloomDesc.colorAttachments[0].destinationRGBBlendFactor = .one
    bloomDesc.colorAttachments[0].sourceAlphaBlendFactor = .one
    bloomDesc.colorAttachments[0].destinationAlphaBlendFactor = .oneMinusSourceAlpha

    let glyphDesc = MTLRenderPipelineDescriptor()
    glyphDesc.vertexFunction = glyphVert
    glyphDesc.fragmentFunction = glyphFrag
    glyphDesc.colorAttachments[0].pixelFormat = .rgba16Float
    glyphDesc.colorAttachments[0].isBlendingEnabled = true
    glyphDesc.colorAttachments[0].rgbBlendOperation = .add
    glyphDesc.colorAttachments[0].alphaBlendOperation = .add
    glyphDesc.colorAttachments[0].sourceRGBBlendFactor = .one
    glyphDesc.colorAttachments[0].destinationRGBBlendFactor = .oneMinusSourceAlpha
    glyphDesc.colorAttachments[0].sourceAlphaBlendFactor = .one
    glyphDesc.colorAttachments[0].destinationAlphaBlendFactor = .oneMinusSourceAlpha

    guard let bloomState = try? device.makeRenderPipelineState(descriptor: bloomDesc),
          let glyphState = try? device.makeRenderPipelineState(descriptor: glyphDesc) else {
      return nil
    }

    self.device = device
    self.commandQueue = queue
    self.bloomPipeline = bloomState
    self.glyphPipeline = glyphState
  }
}

private let extendedLinearP3ColorSpace: CGColorSpace =
  CGColorSpace(name: CGColorSpace.extendedLinearDisplayP3)
  ?? CGColorSpace(name: CGColorSpace.extendedLinearSRGB)
  ?? CGColorSpaceCreateDeviceRGB()

private func srgbToLinear(_ c: Float) -> Float {
  if c <= 0.04045 {
    return c / 12.92
  }
  return pow((c + 0.055) / 1.055, 2.4)
}

private func linearP3SIMD4(from color: UIColor) -> SIMD4<Float> {
  if let converted = color.cgColor.converted(
    to: extendedLinearP3ColorSpace,
    intent: .defaultIntent,
    options: nil
  ), let comps = converted.components, converted.numberOfComponents >= 3 {
    return SIMD4<Float>(
      Float(comps[0]),
      Float(comps[1]),
      Float(comps[2]),
      1.0
    )
  }

  var r: CGFloat = 1
  var g: CGFloat = 1
  var b: CGFloat = 1
  var a: CGFloat = 1
  if color.getRed(&r, green: &g, blue: &b, alpha: &a) {
    return SIMD4<Float>(
      srgbToLinear(Float(r)),
      srgbToLinear(Float(g)),
      srgbToLinear(Float(b)),
      1.0
    )
  }
  var w: CGFloat = 1
  if color.getWhite(&w, alpha: &a) {
    let lw = srgbToLinear(Float(w))
    return SIMD4<Float>(lw, lw, lw, 1.0)
  }
  return SIMD4<Float>(1, 1, 1, 1)
}

private func linearP3SIMD4(fromHex hex: String) -> SIMD4<Float> {
  let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
  var value: UInt64 = 0
  guard Scanner(string: cleaned).scanHexInt64(&value) else {
    return SIMD4<Float>(0.5, 0.7, 1.0, 1.0)
  }
  let r: CGFloat
  let g: CGFloat
  let b: CGFloat
  if cleaned.count == 6 {
    r = CGFloat((value >> 16) & 0xFF) / 255.0
    g = CGFloat((value >> 8) & 0xFF) / 255.0
    b = CGFloat(value & 0xFF) / 255.0
  } else if cleaned.count == 8 {
    r = CGFloat((value >> 24) & 0xFF) / 255.0
    g = CGFloat((value >> 16) & 0xFF) / 255.0
    b = CGFloat((value >> 8) & 0xFF) / 255.0
  } else {
    return SIMD4<Float>(0.5, 0.7, 1.0, 1.0)
  }
  return linearP3SIMD4(from: UIColor(red: r, green: g, blue: b, alpha: 1.0))
}

public final class PhosphorDayStripView: ExpoView, UIScrollViewDelegate {
  let onSelectDay = EventDispatcher()

  // Props reçues depuis React Native
  var rawDays: [[String: Any]] = []
  var requestedSelectedIndex: Int = 0
  var itemWidthProp: CGFloat = 58.0
  var accentColorProp: UIColor = .systemBlue
  var selectedTextColorProp: UIColor = .white
  var weekdayColorProp: UIColor = .secondaryLabel
  var numberColorProp: UIColor = .label
  var todayColorProp: UIColor = .systemBlue
  var isDarkProp: Bool = true
  var hapticsEnabledProp: Bool = true
  var reducedMotionProp: Bool = false

  // Couches natives (aucun masque 8-bit au-dessus du CAMetalLayer)
  private let metalLayer = CAMetalLayer()
  private let scrollView = UIScrollView()
  private let selectionHaptic = UISelectionFeedbackGenerator()

  // État physique & traînée phosphor
  private var days: [PhosphorDayItem] = []
  private var trailEnergy: [Float] = []
  private var lastCenterIndex: Int = -1
  private var hasInitializedScroll: Bool = false
  private var lastEmittedDate: String?
  private var lastAppliedRequestedDate: String?

  // Animation programmatique pilotée par CADisplayLink (tap ou saut externe)
  private var isProgrammaticAnimating: Bool = false
  private var progStartX: CGFloat = 0
  private var progTargetX: CGFloat = 0
  private var progElapsed: Float = 0
  private let progDuration: Float = 0.28

  // Couleurs linéaires Display P3 pré-converties
  private var accentLinear = SIMD4<Float>(0.22, 0.65, 1.0, 1.0)
  private var selectedLinear = SIMD4<Float>(1.0, 1.0, 1.0, 1.0)
  private var weekdayLinear = SIMD4<Float>(0.55, 0.58, 0.65, 1.0)
  private var numberLinear = SIMD4<Float>(0.92, 0.94, 0.98, 1.0)
  private var todayLinear = SIMD4<Float>(0.22, 0.65, 1.0, 1.0)

  // Boucle 60/120 fps & débouncing JS
  private var displayLink: CADisplayLink?
  private var lastTimestamp: CFTimeInterval = 0
  private var settledFrames: Int = 0
  private var pendingEmitWork: DispatchWorkItem?
  private var isDraggingOrDecelerating: Bool = false

  // Cache LRU de textures haute densité (R=weekday, G=dayNum, B=bloom glyphe)
  private var textureCache: [String: MTLTexture] = [:]
  private var textureCacheOrder: [String] = []
  private let maxCachedTextures = 44

  private var effectiveItemWidth: CGFloat {
    min(max(itemWidthProp, 56.0), 62.0)
  }

  private var sideInset: CGFloat {
    max(0.0, (bounds.width - effectiveItemWidth) * 0.5)
  }

  private var currentScale: CGFloat {
    window?.windowScene?.screen.scale ?? window?.screen.scale ?? UIScreen.main.scale
  }

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    backgroundColor = .clear
    isOpaque = false
    clipsToBounds = false

    configureMetalLayer()
    configureScrollView()
  }

  deinit {
    pendingEmitWork?.cancel()
    displayLink?.invalidate()
    displayLink = nil
  }

  private func configureMetalLayer() {
    if let resources = PhosphorMetalResources.shared {
      metalLayer.device = resources.device
    }
    metalLayer.pixelFormat = .rgba16Float
    metalLayer.wantsExtendedDynamicRangeContent = true
    metalLayer.colorspace = extendedLinearP3ColorSpace
    metalLayer.edrMetadata = nil
    metalLayer.isOpaque = false
    metalLayer.framebufferOnly = true
    metalLayer.allowsNextDrawableTimeout = true
    metalLayer.maximumDrawableCount = 3
    metalLayer.masksToBounds = false
    metalLayer.contentsScale = UIScreen.main.scale

    #if compiler(>=6.2)
    if #available(iOS 26.0, *) {
      metalLayer.preferredDynamicRange = .high
      layer.preferredDynamicRange = .high
    }
    #endif

    layer.addSublayer(metalLayer)
  }

  private func configureScrollView() {
    scrollView.backgroundColor = .clear
    scrollView.isOpaque = false
    scrollView.clipsToBounds = false
    scrollView.showsHorizontalScrollIndicator = false
    scrollView.showsVerticalScrollIndicator = false
    scrollView.alwaysBounceHorizontal = true
    scrollView.alwaysBounceVertical = false
    scrollView.isDirectionalLockEnabled = true
    scrollView.decelerationRate = .normal
    scrollView.contentInsetAdjustmentBehavior = .never
    scrollView.delegate = self

    let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
    tap.cancelsTouchesInView = false
    scrollView.addGestureRecognizer(tap)

    addSubview(scrollView)
  }

  override public func didMoveToWindow() {
    super.didMoveToWindow()

    if window != nil {
      #if compiler(>=6.2)
      if #available(iOS 26.0, *) {
        window?.layer.preferredDynamicRange = .high
        metalLayer.preferredDynamicRange = .high
        layer.preferredDynamicRange = .high
      }
      #endif
      setupDisplayLinkIfNeeded()
      updateMetalDrawableMetrics()
      wakeDisplayLink()
    } else {
      displayLink?.invalidate()
      displayLink = nil
      lastTimestamp = 0
    }
  }

  override public func layoutSubviews() {
    super.layoutSubviews()

    CATransaction.begin()
    CATransaction.setDisableActions(true)
    metalLayer.frame = bounds
    CATransaction.commit()

    scrollView.frame = bounds
    updateMetalDrawableMetrics()
    updateScrollGeometry(preserveCurrentCenter: true)
    wakeDisplayLink()
  }

  private func updateMetalDrawableMetrics() {
    let scale = currentScale
    metalLayer.contentsScale = scale
    let pxW = max(1, Int(round(bounds.width * scale)))
    let pxH = max(1, Int(round(bounds.height * scale)))
    let targetSize = CGSize(width: pxW, height: pxH)
    if metalLayer.drawableSize != targetSize {
      metalLayer.drawableSize = targetSize
    }
  }

  private func setupDisplayLinkIfNeeded() {
    guard displayLink == nil else { return }
    let proxy = DisplayLinkProxy(target: self)
    let link = CADisplayLink(target: proxy, selector: #selector(DisplayLinkProxy.step(_:)))
    link.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
    link.add(to: .main, forMode: .common)
    displayLink = link
    lastTimestamp = 0
  }

  private func wakeDisplayLink() {
    if window != nil {
      setupDisplayLinkIfNeeded()
    }
    settledFrames = 0
    if displayLink?.isPaused == true {
      lastTimestamp = 0
      displayLink?.isPaused = false
    }
  }

  func applyUpdatedProps() {
    accentLinear = linearP3SIMD4(from: accentColorProp)
    selectedLinear = linearP3SIMD4(from: selectedTextColorProp)
    weekdayLinear = linearP3SIMD4(from: weekdayColorProp)
    numberLinear = linearP3SIMD4(from: numberColorProp)
    todayLinear = linearP3SIMD4(from: todayColorProp)

    let previousDateByCenter: String? = (lastCenterIndex >= 0 && lastCenterIndex < days.count)
      ? days[lastCenterIndex].date
      : nil
    let previousEnergyByDate: [String: Float] = Dictionary(
      uniqueKeysWithValues: zip(days, trailEnergy).compactMap { item, energy in
        energy > 0.005 ? (item.date, energy) : nil
      }
    )

    var parsed: [PhosphorDayItem] = []
    parsed.reserveCapacity(rawDays.count)
    for dict in rawDays {
      guard let date = dict["date"] as? String,
            let weekday = dict["weekday"] as? String,
            let dayNum = dict["dayNum"] as? String else {
        continue
      }
      let isToday = (dict["isToday"] as? Bool) ?? false
      let rawDotHexes = (dict["dots"] as? [String]) ?? []
      let dotLinearColors = rawDotHexes.prefix(3).map { linearP3SIMD4(fromHex: $0) }
      parsed.append(
        PhosphorDayItem(
          date: date,
          weekday: weekday,
          dayNum: dayNum,
          isToday: isToday,
          dotColors: dotLinearColors
        )
      )
    }

    days = parsed
    trailEnergy = parsed.map { previousEnergyByDate[$0.date] ?? 0.0 }

    let clampedRequested = days.isEmpty
      ? 0
      : max(0, min(days.count - 1, requestedSelectedIndex))
    let requestedDate = days.isEmpty ? nil : days[clampedRequested].date

    updateScrollGeometry(preserveCurrentCenter: false)

    if !days.isEmpty && bounds.width > 0 {
      if !hasInitializedScroll {
        jumpSilently(toIndex: clampedRequested)
        hasInitializedScroll = true
        lastAppliedRequestedDate = requestedDate
        lastEmittedDate = requestedDate
      } else if isDraggingOrDecelerating || isProgrammaticAnimating {
        // Ne jamais interrompre un geste ou une inertie active de l'utilisateur
        if let prevDate = previousDateByCenter,
           let remapped = days.firstIndex(where: { $0.date == prevDate }) {
          lastCenterIndex = remapped
        }
      } else if let reqDate = requestedDate,
                reqDate != lastEmittedDate,
                reqDate != lastAppliedRequestedDate {
        lastAppliedRequestedDate = reqDate
        startProgrammaticScroll(toIndex: clampedRequested, animated: !reducedMotionProp)
      } else if let prevDate = previousDateByCenter,
                let remapped = days.firstIndex(where: { $0.date == prevDate }),
                remapped != lastCenterIndex {
        jumpSilently(toIndex: remapped)
      }
    }

    wakeDisplayLink()
  }

  private func updateScrollGeometry(preserveCurrentCenter: Bool) {
    guard bounds.width > 0, bounds.height > 0 else { return }

    let currentIdx: Int
    if preserveCurrentCenter && hasInitializedScroll && !days.isEmpty {
      currentIdx = max(0, min(days.count - 1, lastCenterIndex))
    } else if !days.isEmpty {
      currentIdx = max(0, min(days.count - 1, requestedSelectedIndex))
    } else {
      currentIdx = 0
    }

    let inset = sideInset
    let targetContentSize = CGSize(
      width: CGFloat(days.count) * effectiveItemWidth,
      height: bounds.height
    )
    let targetInset = UIEdgeInsets(top: 0, left: inset, bottom: 0, right: inset)

    if scrollView.contentSize != targetContentSize {
      scrollView.contentSize = targetContentSize
    }
    if scrollView.contentInset != targetInset {
      scrollView.contentInset = targetInset
    }

    if !days.isEmpty {
      if !hasInitializedScroll {
        jumpSilently(toIndex: currentIdx)
        hasInitializedScroll = true
        lastAppliedRequestedDate = days[currentIdx].date
        lastEmittedDate = days[currentIdx].date
      } else if preserveCurrentCenter && !isDraggingOrDecelerating && !isProgrammaticAnimating {
        let exactOffset = offsetForIndex(currentIdx)
        if abs(scrollView.contentOffset.x - exactOffset) > 0.5 {
          scrollView.setContentOffset(CGPoint(x: exactOffset, y: 0), animated: false)
        }
      }
    }
  }

  private func offsetForIndex(_ index: Int) -> CGFloat {
    CGFloat(index) * effectiveItemWidth - sideInset
  }

  private func jumpSilently(toIndex index: Int) {
    guard !days.isEmpty else { return }
    let clamped = max(0, min(days.count - 1, index))
    isProgrammaticAnimating = false
    lastCenterIndex = clamped
    scrollView.setContentOffset(CGPoint(x: offsetForIndex(clamped), y: 0), animated: false)
  }

  private func startProgrammaticScroll(toIndex index: Int, animated: Bool) {
    guard !days.isEmpty, bounds.width > 0 else { return }
    let clamped = max(0, min(days.count - 1, index))
    let targetX = offsetForIndex(clamped)

    if !animated || abs(scrollView.contentOffset.x - targetX) < 0.5 {
      isProgrammaticAnimating = false
      scrollView.setContentOffset(CGPoint(x: targetX, y: 0), animated: false)
      processCenterCrossing(floatIndex: Float(clamped), triggerSideEffects: true)
      flushEmitDayIfNeeded(index: clamped)
      wakeDisplayLink()
      return
    }

    progStartX = scrollView.contentOffset.x
    progTargetX = targetX
    progElapsed = 0
    isProgrammaticAnimating = true
    if hapticsEnabledProp {
      selectionHaptic.prepare()
    }
    wakeDisplayLink()
  }

  @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
    guard gesture.state == .ended, !days.isEmpty, bounds.width > 0 else { return }
    let location = gesture.location(in: scrollView)
    let rawIdx = Int(floor(location.x / effectiveItemWidth))
    let clamped = max(0, min(days.count - 1, rawIdx))
    startProgrammaticScroll(toIndex: clamped, animated: !reducedMotionProp)
  }

  // MARK: - UIScrollViewDelegate

  public func scrollViewWillBeginDragging(_ scrollView: UIScrollView) {
    isProgrammaticAnimating = false
    isDraggingOrDecelerating = true
    if hapticsEnabledProp {
      selectionHaptic.prepare()
    }
    wakeDisplayLink()
  }

  public func scrollViewDidScroll(_ scrollView: UIScrollView) {
    wakeDisplayLink()
  }

  public func scrollViewWillEndDragging(
    _ scrollView: UIScrollView,
    withVelocity velocity: CGPoint,
    targetContentOffset: UnsafeMutablePointer<CGPoint>
  ) {
    guard !days.isEmpty, effectiveItemWidth > 0 else { return }
    let inset = sideInset
    let proposedLogical = targetContentOffset.pointee.x + inset
    let snappedIndex = max(
      0,
      min(days.count - 1, Int(round(proposedLogical / effectiveItemWidth)))
    )
    targetContentOffset.pointee.x = CGFloat(snappedIndex) * effectiveItemWidth - inset
  }

  public func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
    if !decelerate {
      isDraggingOrDecelerating = false
      snapToNearestAndFlush()
    }
  }

  public func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
    isDraggingOrDecelerating = false
    snapToNearestAndFlush()
  }

  private func snapToNearestAndFlush() {
    guard !days.isEmpty, effectiveItemWidth > 0 else { return }
    let logicalX = scrollView.contentOffset.x + sideInset
    let idx = max(0, min(days.count - 1, Int(round(logicalX / effectiveItemWidth))))
    let exactX = offsetForIndex(idx)
    if abs(scrollView.contentOffset.x - exactX) > 0.25 {
      scrollView.setContentOffset(CGPoint(x: exactX, y: 0), animated: false)
    }
    processCenterCrossing(floatIndex: Float(idx), triggerSideEffects: true)
    flushEmitDayIfNeeded(index: idx)
    wakeDisplayLink()
  }

  // MARK: - Débouncing sélection JS & anti-frame-skip

  private func scheduleDebouncedEmit(index: Int) {
    guard index >= 0 && index < days.count else { return }
    let targetDate = days[index].date
    pendingEmitWork?.cancel()
    let work = DispatchWorkItem { [weak self] in
      guard let self else { return }
      self.emitDayIfChanged(date: targetDate, index: index)
    }
    pendingEmitWork = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.095, execute: work)
  }

  private func flushEmitDayIfNeeded(index: Int) {
    guard index >= 0 && index < days.count else { return }
    pendingEmitWork?.cancel()
    pendingEmitWork = nil
    emitDayIfChanged(date: days[index].date, index: index)
  }

  private func emitDayIfChanged(date: String, index: Int) {
    guard lastEmittedDate != date else { return }
    lastEmittedDate = date
    lastAppliedRequestedDate = date
    onSelectDay(["date": date, "index": index])
  }

  private func processCenterCrossing(floatIndex: Float, triggerSideEffects: Bool) {
    guard !days.isEmpty else { return }
    let centerIndex = max(0, min(days.count - 1, Int(round(floatIndex))))

    if lastCenterIndex < 0 || lastCenterIndex >= days.count {
      lastCenterIndex = centerIndex
      return
    }

    if centerIndex != lastCenterIndex {
      // Règle critique anti-frame-skip : injecter trailEnergy = 1.0 sur TOUS les indices traversés
      if !reducedMotionProp {
        trailEnergy[lastCenterIndex] = max(trailEnergy[lastCenterIndex], 1.0)
        let step = centerIndex > lastCenterIndex ? 1 : -1
        var k = lastCenterIndex + step
        while true {
          if k >= 0 && k < trailEnergy.count {
            trailEnergy[k] = 1.0
          }
          if k == centerIndex { break }
          k += step
        }
      }

      lastCenterIndex = centerIndex

      if triggerSideEffects {
        if hapticsEnabledProp {
          selectionHaptic.selectionChanged()
          selectionHaptic.prepare()
        }
        scheduleDebouncedEmit(index: centerIndex)
      }
    }
  }

  // MARK: - Boucle CADisplayLink 60/120 fps

  fileprivate func onDisplayLink(_ link: CADisplayLink) {
    let dt: Float
    if lastTimestamp > 0 {
      dt = min(max(Float(link.timestamp - lastTimestamp), 0.001), 0.05)
    } else {
      dt = 1.0 / 60.0
    }
    lastTimestamp = link.timestamp

    guard !days.isEmpty, bounds.width > 0, bounds.height > 0 else {
      displayLink?.isPaused = true
      return
    }

    // Avancer l'animation programmatique (tap ou saut externe) dans la même boucle physique
    if isProgrammaticAnimating {
      progElapsed += dt
      let u = min(1.0, progElapsed / progDuration)
      let eased = 1.0 - pow(1.0 - u, 3.0)
      let currentX = progStartX + (progTargetX - progStartX) * CGFloat(eased)
      scrollView.setContentOffset(CGPoint(x: currentX, y: 0), animated: false)
      if u >= 1.0 {
        isProgrammaticAnimating = false
        let finalLogical = scrollView.contentOffset.x + sideInset
        let finalIdx = max(0, min(days.count - 1, Int(round(finalLogical / effectiveItemWidth))))
        processCenterCrossing(floatIndex: Float(finalIdx), triggerSideEffects: true)
        flushEmitDayIfNeeded(index: finalIdx)
      }
    }

    let logicalOffsetX = Float(scrollView.contentOffset.x + sideInset)
    let floatIndex = logicalOffsetX / Float(effectiveItemWidth)

    processCenterCrossing(floatIndex: floatIndex, triggerSideEffects: true)

    // Décroissance exponentielle indépendante du framerate : tau = 0.16s, coupure < 0.005
    let decay: Float = reducedMotionProp ? 0.0 : exp(-dt / 0.16)
    var hasActiveTrail = false
    for i in 0..<trailEnergy.count {
      var e = trailEnergy[i]
      if e > 0.0 {
        e *= decay
        if e < 0.005 {
          e = 0.0
        } else {
          hasActiveTrail = true
        }
        trailEnergy[i] = e
      }
    }

    renderMetalFrame(floatIndex: floatIndex)

    if !isDraggingOrDecelerating && !isProgrammaticAnimating && !hasActiveTrail {
      settledFrames += 1
      if settledFrames >= 2 {
        displayLink?.isPaused = true
        lastTimestamp = 0
      }
    } else {
      settledFrames = 0
    }
  }

  // MARK: - Rendu Metal EDR 16-bit flottant

  private func renderMetalFrame(floatIndex: Float) {
    guard let resources = PhosphorMetalResources.shared,
          metalLayer.drawableSize.width >= 1,
          metalLayer.drawableSize.height >= 1,
          let drawable = metalLayer.nextDrawable(),
          let commandBuffer = resources.commandQueue.makeCommandBuffer() else {
      return
    }

    let passDesc = MTLRenderPassDescriptor()
    passDesc.colorAttachments[0].texture = drawable.texture
    passDesc.colorAttachments[0].loadAction = .clear
    passDesc.colorAttachments[0].storeAction = .store
    passDesc.colorAttachments[0].clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)

    guard let encoder = commandBuffer.makeRenderCommandEncoder(descriptor: passDesc) else {
      return
    }

    let scale = currentScale
    let viewW = Float(metalLayer.drawableSize.width)
    let viewH = Float(metalLayer.drawableSize.height)
    let itemW = Float(effectiveItemWidth)
    let itemWPx = itemW * Float(scale)
    let scrollPx = Float(scrollView.contentOffset.x) * Float(scale)

    // Gain EDR maximal matériel : potentialEDRHeadroom sans bridage arbitraire
    let screen = window?.windowScene?.screen ?? window?.screen ?? UIScreen.main
    let maxHeadroom = max(Float(screen.potentialEDRHeadroom), Float(screen.currentEDRHeadroom), 1.0)

    let visibleRadius = Int(ceil(Double(bounds.width / effectiveItemWidth) * 0.5)) + 2
    let approxCenter = Int(round(floatIndex))
    let firstVis = max(0, approxCenter - visibleRadius)
    let lastVis = min(days.count - 1, approxCenter + visibleRadius)

    guard firstVis <= lastVis else {
      encoder.endEncoding()
      commandBuffer.present(drawable)
      commandBuffer.commit()
      return
    }

    var drawItems: [(uniforms: CellUniforms, texture: MTLTexture)] = []
    drawItems.reserveCapacity(lastVis - firstVis + 1)

    let isDarkFlag: Float = isDarkProp ? 1.0 : 0.0
    let scaleFloat = Float(scale)

    for i in firstVis...lastVis {
      let day = days[i]
      let dist = abs(floatIndex - Float(i))
      let t = min(max(1.0 - dist / 0.85, 0.0), 1.0)
      let proximity = t * t * (3.0 - 2.0 * t)
      let glow = max(proximity, trailEnergy[i])

      let originX = Float(i) * itemWPx - scrollPx
      // Ignorer les cellules totalement hors écran (avec marge pour le bloom étendu)
      if originX + itemWPx * 1.4 < 0 || originX - itemWPx * 0.4 > viewW {
        continue
      }

      guard let tex = cachedCellTexture(
        device: resources.device,
        weekday: day.weekday,
        dayNum: day.dayNum,
        cellWidthPt: effectiveItemWidth,
        cellHeightPt: bounds.height,
        scale: scale
      ) else {
        continue
      }

      let d0 = day.dotColors.count > 0 ? day.dotColors[0] : accentLinear
      let d1 = day.dotColors.count > 1 ? day.dotColors[1] : accentLinear
      let d2 = day.dotColors.count > 2 ? day.dotColors[2] : accentLinear

      let uniforms = CellUniforms(
        rectPx: SIMD4<Float>(originX, 0.0, itemWPx, viewH),
        viewAndParams: SIMD4<Float>(viewW, viewH, glow, maxHeadroom),
        flagsAndDots: SIMD4<Float>(
          isDarkFlag,
          day.isToday ? 1.0 : 0.0,
          Float(day.dotColors.count),
          scaleFloat
        ),
        accentRGB: accentLinear,
        selectedRGB: selectedLinear,
        weekdayRGB: weekdayLinear,
        numberRGB: numberLinear,
        todayRGB: todayLinear,
        dot0RGB: d0,
        dot1RGB: d1,
        dot2RGB: d2
      )
      drawItems.append((uniforms: uniforms, texture: tex))
    }

    // Passe 1 : Bloom additif + traînée phosphor
    encoder.setRenderPipelineState(resources.bloomPipeline)
    for item in drawItems where item.uniforms.viewAndParams.z > 0.004 {
      var u = item.uniforms
      encoder.setVertexBytes(&u, length: MemoryLayout<CellUniforms>.stride, index: 0)
      encoder.setFragmentBytes(&u, length: MemoryLayout<CellUniforms>.stride, index: 0)
      encoder.setFragmentTexture(item.texture, index: 0)
      encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 6)
    }

    // Passe 2 : Glyphes nets & pastilles SDF à pleine luminance EDR
    encoder.setRenderPipelineState(resources.glyphPipeline)
    for item in drawItems {
      var u = item.uniforms
      encoder.setVertexBytes(&u, length: MemoryLayout<CellUniforms>.stride, index: 0)
      encoder.setFragmentBytes(&u, length: MemoryLayout<CellUniforms>.stride, index: 0)
      encoder.setFragmentTexture(item.texture, index: 0)
      encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 6)
    }

    encoder.endEncoding()
    commandBuffer.present(drawable)
    commandBuffer.commit()
  }

  // MARK: - Rasterisation haute densité des glyphes (R=weekday, G=dayNum, B=halo bloom)

  private func resolveFont(candidates: [String], size: CGFloat, monospacedDigits: Bool) -> UIFont {
    for name in candidates {
      if let font = UIFont(name: name, size: size) {
        return font
      }
    }
    if monospacedDigits {
      return UIFont.monospacedDigitSystemFont(ofSize: size, weight: .bold)
    }
    return UIFont.systemFont(ofSize: size, weight: .semibold)
  }

  private func renderGrayMask(
    pxW: Int,
    pxH: Int,
    scale: CGFloat,
    draw: (CGContext) -> Void
  ) -> [UInt8] {
    let pixelCount = pxW * pxH
    var rgba = [UInt8](repeating: 0, count: pixelCount * 4)
    let rgbSpace = CGColorSpaceCreateDeviceRGB()
    rgba.withUnsafeMutableBytes { rawBuf in
      guard let ptr = rawBuf.baseAddress,
            let ctx = CGContext(
              data: ptr,
              width: pxW,
              height: pxH,
              bitsPerComponent: 8,
              bytesPerRow: pxW * 4,
              space: rgbSpace,
              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
            ) else {
        return
      }
      ctx.setAllowsAntialiasing(true)
      ctx.setShouldAntialias(true)
      ctx.setAllowsFontSmoothing(true)
      ctx.setShouldSmoothFonts(true)
      ctx.translateBy(x: 0, y: CGFloat(pxH))
      ctx.scaleBy(x: scale, y: -scale)
      UIGraphicsPushContext(ctx)
      draw(ctx)
      UIGraphicsPopContext()
    }
    var alpha = [UInt8](repeating: 0, count: pixelCount)
    for i in 0..<pixelCount {
      alpha[i] = rgba[i * 4 + 3]
    }
    return alpha
  }

  private func cachedCellTexture(
    device: MTLDevice,
    weekday: String,
    dayNum: String,
    cellWidthPt: CGFloat,
    cellHeightPt: CGFloat,
    scale: CGFloat
  ) -> MTLTexture? {
    let pxW = max(1, Int(round(cellWidthPt * scale)))
    let pxH = max(1, Int(round(cellHeightPt * scale)))
    let key = "\(weekday)|\(dayNum)|\(pxW)x\(pxH)"

    if let existing = textureCache[key] {
      return existing
    }

    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    paragraph.lineBreakMode = .byClipping

    let weekdayFont = resolveFont(
      candidates: ["PlusJakartaSans-Bold", "PlusJakartaSans-SemiBold"],
      size: 9.5,
      monospacedDigits: false
    )
    let numberFont = resolveFont(
      candidates: ["PlusJakartaSans-Bold", "PlusJakartaSans-ExtraBold"],
      size: 16.5,
      monospacedDigits: true
    )

    let weekdayAttrs: [NSAttributedString.Key: Any] = [
      .font: weekdayFont,
      .foregroundColor: UIColor.white,
      .paragraphStyle: paragraph,
      .kern: 0.35,
    ]
    let numberAttrs: [NSAttributedString.Key: Any] = [
      .font: numberFont,
      .foregroundColor: UIColor.white,
      .paragraphStyle: paragraph,
    ]

    let wkRect = CGRect(x: 0, y: cellHeightPt * 0.10, width: cellWidthPt, height: 13)
    let numRect = CGRect(x: 0, y: cellHeightPt * 0.33, width: cellWidthPt, height: 21)

    let wkStr = weekday as NSString
    let numStr = dayNum as NSString

    let rMask = renderGrayMask(pxW: pxW, pxH: pxH, scale: scale) { _ in
      wkStr.draw(in: wkRect, withAttributes: weekdayAttrs)
    }

    let gMask = renderGrayMask(pxW: pxW, pxH: pxH, scale: scale) { _ in
      numStr.draw(in: numRect, withAttributes: numberAttrs)
    }

    let bMask = renderGrayMask(pxW: pxW, pxH: pxH, scale: scale) { ctx in
      ctx.saveGState()
      ctx.setShadow(offset: .zero, blur: 7.5, color: UIColor.white.cgColor)
      numStr.draw(in: numRect, withAttributes: numberAttrs)
      numStr.draw(in: numRect, withAttributes: numberAttrs)
      ctx.setShadow(offset: .zero, blur: 4.5, color: UIColor(white: 1.0, alpha: 0.7).cgColor)
      wkStr.draw(in: wkRect, withAttributes: weekdayAttrs)
      ctx.restoreGState()
    }

    let pixelCount = pxW * pxH
    var rgba = [UInt8](repeating: 255, count: pixelCount * 4)
    for idx in 0..<pixelCount {
      let o = idx * 4
      rgba[o] = rMask[idx]
      rgba[o + 1] = gMask[idx]
      rgba[o + 2] = bMask[idx]
      rgba[o + 3] = 255
    }

    let desc = MTLTextureDescriptor.texture2DDescriptor(
      pixelFormat: .rgba8Unorm,
      width: pxW,
      height: pxH,
      mipmapped: false
    )
    desc.usage = [.shaderRead]
    desc.storageMode = .shared

    guard let tex = device.makeTexture(descriptor: desc) else {
      return nil
    }
    rgba.withUnsafeBytes { rawBuf in
      if let ptr = rawBuf.baseAddress {
        tex.replace(
          region: MTLRegionMake2D(0, 0, pxW, pxH),
          mipmapLevel: 0,
          withBytes: ptr,
          bytesPerRow: pxW * 4
        )
      }
    }

    textureCache[key] = tex
    textureCacheOrder.append(key)
    if textureCacheOrder.count > maxCachedTextures {
      let oldest = textureCacheOrder.removeFirst()
      textureCache.removeValue(forKey: oldest)
    }

    return tex
  }
}
