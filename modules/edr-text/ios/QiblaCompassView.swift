import ExpoModulesCore
import UIKit
import Metal
import QuartzCore
import CoreLocation
import CoreHaptics
import simd

private final class QiblaDisplayLinkProxy: NSObject {
  weak var target: QiblaCompassView?

  init(target: QiblaCompassView) {
    self.target = target
  }

  @objc func onDisplayLink(_ link: CADisplayLink) {
    target?.handleDisplayLink(link)
  }
}

private struct QiblaUniforms {
  var viewInfo: SIMD4<Float>      // x: widthPt, y: heightPt, z: timeSec, w: maxHeadroom
  var angles: SIMD4<Float>        // x: headingRad, y: qiblaScreenRad, z: deltaRad, w: absDeltaNorm
  var state: SIMD4<Float>         // x: hasLocation, y: lockMix, z: lockPulse, w: isDark
  var accentColor: SIMD4<Float>   // glacier / accent linear P3
  var alignedColor: SIMD4<Float>  // menthe linear P3
  var northColor: SIMD4<Float>    // corail linear P3
  var ringColor: SIMD4<Float>     // dial border linear P3
  var tickColor: SIMD4<Float>     // degree tick linear P3
  var textColor: SIMD4<Float>     // cardinal labels linear P3
  var surfaceColor: SIMD4<Float>  // dial surface backing linear P3
}

private let kQiblaShaderSource = #"""
#include <metal_stdlib>
using namespace metal;

struct QiblaUniforms {
  float4 viewInfo;
  float4 angles;
  float4 state;
  float4 accentColor;
  float4 alignedColor;
  float4 northColor;
  float4 ringColor;
  float4 tickColor;
  float4 textColor;
  float4 surfaceColor;
};

struct VertexOut {
  float4 position [[position]];
  float2 uv;
};

constant float2 kQuadPos[4] = {
  float2(-1.0,  1.0),
  float2(-1.0, -1.0),
  float2( 1.0,  1.0),
  float2( 1.0, -1.0)
};

constant float2 kQuadUV[4] = {
  float2(0.0, 0.0),
  float2(0.0, 1.0),
  float2(1.0, 0.0),
  float2(1.0, 1.0)
};

vertex VertexOut qibla_vertex(uint vid [[vertex_id]]) {
  VertexOut out;
  out.position = float4(kQuadPos[vid], 0.0, 1.0);
  out.uv = kQuadUV[vid];
  return out;
}

static inline float wrapAngle(float a) {
  float twoPi = 6.28318530718;
  return a - twoPi * floor((a + 3.14159265359) / twoPi);
}

static inline float sdSegment(float2 p, float2 a, float2 b) {
  float2 pa = p - a;
  float2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

static inline float sdBox(float2 p, float2 b) {
  float2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

static inline float strokeMask(float dist, float halfWidth, float aa) {
  return 1.0 - smoothstep(max(0.0, halfWidth - aa), halfWidth + aa, abs(dist));
}

static inline float fillMask(float dist, float aa) {
  return 1.0 - smoothstep(-aa, aa, dist);
}

fragment float4 qibla_fragment(
  VertexOut in [[stage_in]],
  constant QiblaUniforms &u [[buffer(0)]],
  texture2d<float, access::sample> glyphAtlas [[texture(0)]]
) {
  constexpr sampler linearSampler(coord::normalized, address::clamp_to_edge, filter::linear);

  float minDim = max(min(u.viewInfo.x, u.viewInfo.y), 1.0);
  float2 aspect = float2(u.viewInfo.x / minDim, u.viewInfo.y / minDim);
  float2 p = (in.uv * 2.0 - 1.0) * aspect;
  float px = 2.0 / minDim;
  float aa = px * 1.35;

  float r = length(p);
  float outerAlpha = 1.0 - smoothstep(0.87, 0.99, r);
  if (outerAlpha <= 0.001) {
    return float4(0.0);
  }

  float timeSec = u.viewInfo.z;
  float maxHeadroom = max(u.viewInfo.w, 1.0);
  float headingRad = u.angles.x;
  float qiblaScreenRad = u.angles.y;
  float deltaRad = u.angles.z;
  float absDeltaNorm = clamp(u.angles.w, 0.0, 1.0);

  float hasLoc = clamp(u.state.x, 0.0, 1.0);
  float lockMix = clamp(u.state.y, 0.0, 1.0);
  float lockPulse = clamp(u.state.z, 0.0, 1.0);
  float isDark = u.state.w;

  // In light mode keep luminance grounded so white background stays legible;
  // in dark mode unleash 100% of hardware EDR headroom.
  float edrGain = mix(1.0, maxHeadroom, isDark);
  float approach = (1.0 - absDeltaNorm) * hasLoc;

  float3 outRGB = float3(0.0);
  float outA = 0.0;

  // Screen clockwise angle from 12 o'clock (0,-1).
  float thetaScreen = atan2(p.x, -p.y);
  float thetaDial = wrapAngle(thetaScreen + headingRad);

  // 1. Subtle compass disc backing inside R_dial = 0.77
  float rDial = 0.77;
  float discFill = fillMask(r - rDial, aa * 1.5);
  float innerGlow = exp(-pow(r / 0.56, 2.0)) * 0.10;
  float3 activeTint = mix(u.accentColor.rgb, u.alignedColor.rgb, lockMix * 0.92 + approach * 0.25);
  float3 discCol = u.surfaceColor.rgb * u.surfaceColor.a + activeTint * innerGlow * hasLoc * 0.45;
  float discAlpha = discFill * max(u.surfaceColor.a, 0.08);
  outRGB += discCol * discAlpha;
  outA = max(outA, discAlpha * 0.85);

  // Outer precision dial ring + inner hairline ring
  float outerRing = strokeMask(r - rDial, px * 1.15, aa);
  float innerRing = strokeMask(r - 0.54, px * 0.65, aa) * 0.42;
  float centerRing = strokeMask(r - 0.145, px * 0.95, aa) * 0.75;
  float3 ringCol = mix(u.ringColor.rgb, u.alignedColor.rgb, lockMix * 0.68);
  float ringAlpha = outerRing * (0.62 + lockMix * 0.35) + innerRing + centerRing;
  outRGB += ringCol * ringAlpha * mix(1.0, min(maxHeadroom * 0.45, 1.6), lockMix * isDark);
  outA = max(outA, clamp(ringAlpha, 0.0, 1.0));

  // 2. Rotating 72 degree ticks (5-deg steps, 15-deg detents, 90-deg cardinals)
  float step5 = 0.0872664626; // 5 degrees
  float sectorIdx = floor((thetaDial + 0.5 * step5) / step5);
  float sectorAngle = wrapAngle(sectorIdx * step5);
  float relTick = wrapAngle(thetaDial - sectorAngle);
  float arcDist = abs(relTick) * r;

  int idxInt = int(round(sectorAngle / step5));
  int idxMod18 = ((idxInt % 18) + 18) % 18; // 90 deg
  int idxMod3 = ((idxInt % 3) + 3) % 3;    // 15 deg detent

  bool isCardinalTick = (idxMod18 == 0);
  bool isDetentTick = (idxMod3 == 0);
  bool isNorthTick = (abs(wrapAngle(sectorAngle)) < 0.01);

  float tickInner = isCardinalTick ? 0.685 : (isDetentTick ? 0.708 : 0.730);
  float tickOuter = 0.758;
  float tickHalfW = isCardinalTick ? (px * 1.45) : (isDetentTick ? (px * 1.05) : (px * 0.75));
  float tickRadial = (1.0 - smoothstep(-aa, aa, tickInner - r))
                   * (1.0 - smoothstep(-aa, aa, r - tickOuter));
  float tickCross = 1.0 - smoothstep(max(0.0, tickHalfW - aa), tickHalfW + aa, arcDist);
  float tickMask = tickRadial * tickCross * (isCardinalTick ? 0.95 : (isDetentTick ? 0.72 : 0.38));

  float3 tickCol = isNorthTick ? u.northColor.rgb : u.tickColor.rgb;
  float northBoost = isNorthTick ? mix(1.0, 1.45, isDark) : 1.0;
  outRGB += tickCol * tickMask * northBoost;
  outA = max(outA, clamp(tickMask, 0.0, 1.0));

  // 3. Cardinal letters (N, E, S, O) kept upright around r = 0.618
  float labelRadius = 0.615;
  float labelHalf = 0.072;
  for (int k = 0; k < 4; k++) {
    float cScreen = float(k) * 1.57079632679 - headingRad;
    float2 cCenter = labelRadius * float2(sin(cScreen), -cos(cScreen));
    float2 local = (p - cCenter) / labelHalf;
    if (abs(local.x) <= 1.0 && abs(local.y) <= 1.0) {
      float2 gUV = local * 0.5 + 0.5;
      float atlasU = (float(k) + clamp(gUV.x, 0.02, 0.98)) * 0.25;
      float glyphAlpha = glyphAtlas.sample(linearSampler, float2(atlasU, clamp(gUV.y, 0.02, 0.98))).r;
      if (glyphAlpha > 0.02) {
        float3 gCol = (k == 0) ? u.northColor.rgb : u.textColor.rgb;
        float gLum = (k == 0) ? mix(1.0, 1.55, isDark) : 0.92;
        outRGB = mix(outRGB, gCol * gLum, glyphAlpha * 0.92);
        outA = max(outA, glyphAlpha * 0.92);
      }
    }
  }

  // 4. Fixed 12 o'clock reticle (where user points the iPhone)
  float reticleD1 = sdSegment(p, float2(-0.036, -0.835), float2(0.0, -0.785));
  float reticleD2 = sdSegment(p, float2( 0.036, -0.835), float2(0.0, -0.785));
  float reticleD = min(reticleD1, reticleD2);
  float reticleStroke = 1.0 - smoothstep(px * 0.9, px * 2.1, reticleD);
  float reticleGlow = exp(-reticleD * 22.0) * (0.28 + lockMix * 0.95);
  float3 reticleCol = mix(u.textColor.rgb, u.alignedColor.rgb, lockMix * 0.95 + approach * 0.35);
  float reticleGain = mix(1.0, max(1.3, edrGain * (0.52 + 0.48 * lockMix)), isDark);
  outRGB += reticleCol * (reticleStroke * reticleGain + reticleGlow * reticleGain * 0.45);
  outA = max(outA, clamp(reticleStroke + reticleGlow * 0.55, 0.0, 1.0));

  if (hasLoc > 0.01) {
    // 5. Guided approach arc from 12 o'clock to Qibla angle along the dial bezel
    if (abs(deltaRad) > 0.015) {
      float arcParam = deltaRad >= 0.0
        ? (thetaScreen >= 0.0 && thetaScreen <= deltaRad ? thetaScreen / max(deltaRad, 1e-4) : -1.0)
        : (thetaScreen <= 0.0 && thetaScreen >= deltaRad ? thetaScreen / min(deltaRad, -1e-4) : -1.0);
      if (arcParam >= 0.0 && arcParam <= 1.0) {
        float arcBand = strokeMask(r - rDial, px * 2.1, aa * 1.4);
        float arcGlow = exp(-abs(r - rDial) * 28.0) * 0.45;
        float tipWeight = smoothstep(0.0, 0.15, arcParam) * smoothstep(0.02, 0.14, abs(deltaRad));
        float3 arcCol = mix(u.accentColor.rgb, u.alignedColor.rgb, approach * 0.85);
        float arcEDR = mix(1.0, max(1.15, edrGain * (0.35 + 0.45 * approach)), isDark);
        outRGB += arcCol * (arcBand + arcGlow) * tipWeight * hasLoc * arcEDR;
        outA = max(outA, clamp((arcBand + arcGlow * 0.65) * tipWeight * hasLoc, 0.0, 1.0));
      }
    }

    // 6. Dynamic Qibla Needle + Kaaba Beacon
    float2 qDir = float2(sin(qiblaScreenRad), -cos(qiblaScreenRad));
    float2 qPerp = float2(-qDir.y, qDir.x);
    float uCoord = dot(p, qDir);   // + along Qibla direction
    float vCoord = dot(p, qPerp);  // perpendicular offset

    // Subtle counterweight tail (-0.28 -> -0.08)
    float tailShaft = sdSegment(float2(uCoord, vCoord), float2(-0.28, 0.0), float2(-0.11, 0.0));
    float tailMask = 1.0 - smoothstep(px * 0.9, px * 2.1, tailShaft);
    outRGB += u.tickColor.rgb * tailMask * 0.55 * hasLoc;
    outA = max(outA, tailMask * 0.55 * hasLoc);

    // Tapered Qibla pointer shaft (0.14 -> 0.725)
    float shaftStart = 0.14;
    float shaftEnd = 0.725;
    float tShaft = clamp((uCoord - shaftStart) / (shaftEnd - shaftStart), 0.0, 1.0);
    float halfWidth = mix(0.028, 0.004, tShaft);
    float inSpan = (1.0 - smoothstep(-aa, aa, shaftStart - uCoord))
                 * (1.0 - smoothstep(-aa, aa, uCoord - shaftEnd));
    float shaftFill = (1.0 - smoothstep(halfWidth - aa, halfWidth + aa, abs(vCoord))) * inSpan;

    // Chevron spearhead near outer tip (0.58 -> 0.755)
    float tipT = clamp((uCoord - 0.59) / (0.755 - 0.59), 0.0, 1.0);
    float tipHalfW = mix(0.068, 0.0, tipT);
    float inTip = (1.0 - smoothstep(-aa, aa, 0.59 - uCoord))
                * (1.0 - smoothstep(-aa, aa, uCoord - 0.755));
    float tipFill = (1.0 - smoothstep(tipHalfW - aa, tipHalfW + aa, abs(vCoord))) * inTip;

    // Kaaba golden/luminous jewel box near center-forward (0.37) + gold band
    float2 kaabaLocal = float2(uCoord - 0.36, vCoord);
    float kaabaDist = sdBox(kaabaLocal, float2(0.052, 0.052));
    float kaabaStroke = strokeMask(kaabaDist, px * 1.45, aa);
    float kaabaFill = fillMask(kaabaDist, aa) * 0.25;
    float kaabaBand = fillMask(sdBox(float2(kaabaLocal.x - 0.018, kaabaLocal.y), float2(0.007, 0.048)), aa);

    float needleBody = clamp(max(shaftFill, tipFill) + kaabaStroke + kaabaFill, 0.0, 1.0);
    float needleDist = min(
      sdSegment(float2(uCoord, vCoord), float2(shaftStart, 0.0), float2(shaftEnd, 0.0)),
      abs(kaabaDist)
    );
    float halo = exp(-needleDist * 16.0) * (0.28 + 0.35 * approach + 0.55 * lockMix);
    float tipBeacon = exp(-length(float2(uCoord - 0.75, vCoord)) * 11.5) * (0.45 + 0.85 * lockMix);

    float idleBreath = 0.88 + 0.12 * sin(timeSec * 2.4);
    float3 needleBaseCol = mix(u.accentColor.rgb, u.alignedColor.rgb, lockMix * 0.92 + approach * 0.22);
    float peakEDR = mix(1.0, edrGain * (0.68 + 0.32 * max(lockMix, approach * 0.7)) * idleBreath, isDark);

    // Kaaba warm band glint when aligned
    float3 bandCol = mix(needleBaseCol * 1.2, u.alignedColor.rgb * 1.3, lockMix);

    outRGB += needleBaseCol * needleBody * peakEDR * hasLoc;
    outRGB += bandCol * kaabaBand * peakEDR * 0.95 * hasLoc;
    outRGB += needleBaseCol * (halo + tipBeacon) * edrGain * 0.45 * hasLoc;
    outA = max(outA, clamp((needleBody + halo * 0.75 + tipBeacon * 0.75) * hasLoc, 0.0, 1.0));

    // Central pivot dot
    float centerDot = fillMask(r - 0.056, aa);
    outRGB += needleBaseCol * centerDot * mix(1.0, edrGain * 0.78, isDark) * hasLoc;
    outA = max(outA, centerDot * hasLoc);

    // 7. Expanding EDR Lock-On Shockwave on alignment
    if (lockPulse > 0.005) {
      float pulseProgress = 1.0 - lockPulse;
      float waveRadius = mix(0.18, 0.86, pulseProgress);
      float waveRing = strokeMask(r - waveRadius, px * mix(3.2, 1.2, pulseProgress), aa * 1.6);
      float waveGlow = exp(-abs(r - waveRadius) * 26.0) * 0.65;
      float3 waveCol = u.alignedColor.rgb * (edrGain * lockPulse);
      outRGB += waveCol * (waveRing + waveGlow) * hasLoc;
      outA = max(outA, clamp((waveRing + waveGlow * 0.6) * lockPulse * hasLoc, 0.0, 1.0));
    }
  } else {
    // Waiting / unlocated gentle beacon pulse around center ring
    float pulse = 0.55 + 0.25 * sin(timeSec * 2.0);
    float waitDot = fillMask(r - 0.044, aa);
    outRGB += u.accentColor.rgb * waitDot * pulse * mix(1.0, edrGain * 0.5, isDark);
    outA = max(outA, waitDot * 0.8);
  }

  return float4(outRGB * outerAlpha, clamp(outA, 0.0, 1.0) * outerAlpha);
}
"""#

final class QiblaCompassView: ExpoView, CLLocationManagerDelegate {
  private static let kaabaLatDeg = 21.422487
  private static let kaabaLonDeg = 39.826206
  private static let lockEnterDeg = 2.5
  private static let lockExitDeg = 4.5
  private static let approachStartDeg = 25.0

  // MARK: - Expo Event & Props
  let onQiblaUpdate = EventDispatcher()

  private var accentUIColor = UIColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 1.0)
  private var alignedUIColor = UIColor(red: 0.20, green: 0.83, blue: 0.60, alpha: 1.0)
  private var northUIColor = UIColor(red: 0.97, green: 0.44, blue: 0.44, alpha: 1.0)
  private var ringUIColor = UIColor(white: 1.0, alpha: 0.22)
  private var tickUIColor = UIColor(white: 1.0, alpha: 0.55)
  private var textUIColor = UIColor(white: 1.0, alpha: 0.92)
  private var surfaceUIColor = UIColor(white: 1.0, alpha: 0.06)
  private var isDarkTheme = true
  private var reducedMotion = false
  private var hapticsEnabled = true
  private var isActive = true
  private var lastPermissionNonce = 0
  private var lastRefreshNonce = 0

  // MARK: - Metal & DisplayLink
  private let metalDevice: MTLDevice? = MTLCreateSystemDefaultDevice()
  private var commandQueue: MTLCommandQueue?
  private var pipelineState: MTLRenderPipelineState?
  private var glyphAtlas: MTLTexture?
  private let metalLayer = CAMetalLayer()
  private var displayLink: CADisplayLink?
  private var displayLinkProxy: QiblaDisplayLinkProxy?
  private var lastFrameTimestamp: CFTimeInterval = 0
  private var startTimestamp: CFTimeInterval = CACurrentMediaTime()

  // MARK: - CoreLocation & Qibla State
  private let locationManager = CLLocationManager()
  private var didAutoRequestPermission = false
  private var permissionStatusString = "notDetermined"
  private var isSensorsRunning = false

  private var hasLocation = false
  private var latitude = 0.0
  private var longitude = 0.0
  private var horizontalAccuracy = -1.0
  private var qiblaBearingDeg = 0.0
  private var distanceKm = 0.0

  private var hasHeading = false
  private var targetHeadingDeg = 0.0
  private var headingAccuracyDeg = -1.0
  private var isTrueNorthHeading = false

  private var displayedHeadingDeg = 0.0
  private var displayedQiblaDeg = 0.0
  private var lockMix: Float = 0.0
  private var lockPulse: Float = 0.0

  private var lastEventDispatchTime: CFTimeInterval = 0

  // MARK: - CoreHaptics & Fallback
  private var hapticEngine: CHHapticEngine?
  private var hapticEngineNeedsStart = true
  private var supportsCoreHaptics = false
  private var isLocked = false
  private var lastLockTimestamp: CFTimeInterval = -10.0
  private var lastDetentHeadingDeg: Double?
  private var lastDetentTimestamp: CFTimeInterval = -10.0
  private var lastApproachTimestamp: CFTimeInterval = -10.0
  private var lastHeadingMotionTimestamp: CFTimeInterval = -10.0
  private var lastSampledHeadingForMotion: Double?
  private let fallbackTickGenerator = UIImpactFeedbackGenerator(style: .light)
  private let fallbackApproachGenerator = UIImpactFeedbackGenerator(style: .soft)
  private let fallbackLockGenerator = UINotificationFeedbackGenerator()

  // MARK: - Init
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isOpaque = false
    backgroundColor = .clear
    clipsToBounds = false
    layer.masksToBounds = false
    layer.shouldRasterize = false

    #if compiler(>=6.2)
    if #available(iOS 26.0, *) {
      layer.preferredDynamicRange = .high
    }
    #endif

    setupMetal()
    setupLocationManager()
    setupHaptics()
  }

  deinit {
    stopDisplayLink()
    stopSensors()
    stopHapticEngine()
  }

  // MARK: - Prop Setters
  func setAccentColor(_ color: UIColor?) {
    if let color { accentUIColor = color }
  }

  func setAlignedColor(_ color: UIColor?) {
    if let color { alignedUIColor = color }
  }

  func setNorthColor(_ color: UIColor?) {
    if let color { northUIColor = color }
  }

  func setRingColor(_ color: UIColor?) {
    if let color { ringUIColor = color }
  }

  func setTickColor(_ color: UIColor?) {
    if let color { tickUIColor = color }
  }

  func setTextColor(_ color: UIColor?) {
    if let color { textUIColor = color }
  }

  func setSurfaceColor(_ color: UIColor?) {
    if let color { surfaceUIColor = color }
  }

  func setIsDark(_ value: Bool) {
    isDarkTheme = value
  }

  func setReducedMotion(_ value: Bool) {
    reducedMotion = value
  }

  func setHapticsEnabled(_ value: Bool) {
    hapticsEnabled = value
  }

  func setActive(_ value: Bool) {
    isActive = value
  }

  func setPermissionRequestNonce(_ value: Int) {
    if value > lastPermissionNonce {
      lastPermissionNonce = value
      requestLocationPermission()
    }
  }

  func setRefreshNonce(_ value: Int) {
    if value > lastRefreshNonce {
      lastRefreshNonce = value
      refreshLocationNow()
    }
  }

  func applyUpdatedProps() {
    updateLifecycle()
  }

  // MARK: - Layout & Window Lifecycle
  override func didMoveToWindow() {
    super.didMoveToWindow()
    updateLifecycle()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    metalLayer.frame = bounds
    let scale = window?.screen.scale ?? UIScreen.main.scale
    metalLayer.contentsScale = scale
    metalLayer.drawableSize = CGSize(
      width: max(1.0, round(bounds.width * scale)),
      height: max(1.0, round(bounds.height * scale))
    )
    renderFrame(dt: 0.0, now: CACurrentMediaTime())
  }

  private func updateLifecycle() {
    let shouldRun = isActive && window != nil
    if shouldRun {
      startDisplayLink()
      startSensors()
      if permissionStatusString == "notDetermined" && !didAutoRequestPermission {
        didAutoRequestPermission = true
        requestLocationPermission()
      }
      dispatchQiblaUpdate(force: true)
    } else {
      stopDisplayLink()
      stopSensors()
      stopHapticEngine()
    }
  }

  // MARK: - Metal Setup & Texture Atlas
  private func setupMetal() {
    guard let device = metalDevice else { return }
    commandQueue = device.makeCommandQueue()

    metalLayer.device = device
    metalLayer.pixelFormat = .rgba16Float
    metalLayer.colorspace = CGColorSpace(name: CGColorSpace.extendedLinearDisplayP3)
    metalLayer.wantsExtendedDynamicRangeContent = true
    metalLayer.edrMetadata = nil
    metalLayer.isOpaque = false
    metalLayer.masksToBounds = false
    metalLayer.framebufferOnly = true
    metalLayer.presentsWithTransaction = false

    #if compiler(>=6.2)
    if #available(iOS 26.0, *) {
      metalLayer.preferredDynamicRange = .high
    }
    #endif

    layer.addSublayer(metalLayer)

    do {
      let library = try device.makeLibrary(source: kQiblaShaderSource, options: nil)
      guard
        let vFunc = library.makeFunction(name: "qibla_vertex"),
        let fFunc = library.makeFunction(name: "qibla_fragment")
      else { return }

      let desc = MTLRenderPipelineDescriptor()
      desc.vertexFunction = vFunc
      desc.fragmentFunction = fFunc
      desc.colorAttachments[0].pixelFormat = .rgba16Float
      desc.colorAttachments[0].isBlendingEnabled = true
      desc.colorAttachments[0].rgbBlendOperation = .add
      desc.colorAttachments[0].alphaBlendOperation = .add
      desc.colorAttachments[0].sourceRGBBlendFactor = .one
      desc.colorAttachments[0].destinationRGBBlendFactor = .oneMinusSourceAlpha
      desc.colorAttachments[0].sourceAlphaBlendFactor = .one
      desc.colorAttachments[0].destinationAlphaBlendFactor = .oneMinusSourceAlpha

      pipelineState = try device.makeRenderPipelineState(descriptor: desc)
    } catch {
      return
    }

    glyphAtlas = makeCardinalAtlasTexture(device: device)
  }

  private func makeCardinalAtlasTexture(device: MTLDevice) -> MTLTexture? {
    let cellSize = 128
    let width = cellSize * 4
    let height = cellSize
    var rgba = [UInt8](repeating: 0, count: width * height * 4)
    let colorSpace = CGColorSpaceCreateDeviceRGB()

    guard let ctx = CGContext(
      data: &rgba,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: width * 4,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return nil }

    UIGraphicsPushContext(ctx)
    ctx.translateBy(x: 0, y: CGFloat(height))
    ctx.scaleBy(x: 1, y: -1)

    let labels = ["N", "E", "S", "O"]
    let font = UIFont.systemFont(ofSize: 74, weight: .heavy)
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center

    let attrs: [NSAttributedString.Key: Any] = [
      .font: font,
      .foregroundColor: UIColor.white,
      .paragraphStyle: paragraph
    ]

    for (index, label) in labels.enumerated() {
      let ns = label as NSString
      let textSize = ns.size(withAttributes: attrs)
      let x = CGFloat(index * cellSize) + (CGFloat(cellSize) - textSize.width) * 0.5
      let y = (CGFloat(cellSize) - textSize.height) * 0.5
      ns.draw(at: CGPoint(x: x, y: y), withAttributes: attrs)
    }

    UIGraphicsPopContext()

    var alphaOnly = [UInt8](repeating: 0, count: width * height)
    for i in 0..<(width * height) {
      alphaOnly[i] = rgba[i * 4 + 3]
    }

    let texDesc = MTLTextureDescriptor.texture2DDescriptor(
      pixelFormat: .r8Unorm,
      width: width,
      height: height,
      mipmapped: false
    )
    texDesc.usage = [.shaderRead]
    guard let tex = device.makeTexture(descriptor: texDesc) else { return nil }
    tex.replace(
      region: MTLRegionMake2D(0, 0, width, height),
      mipmapLevel: 0,
      withBytes: alphaOnly,
      bytesPerRow: width
    )
    return tex
  }

  // MARK: - DisplayLink Loop
  private func startDisplayLink() {
    guard displayLink == nil else { return }
    let proxy = QiblaDisplayLinkProxy(target: self)
    displayLinkProxy = proxy
    let link = CADisplayLink(target: proxy, selector: #selector(QiblaDisplayLinkProxy.onDisplayLink(_:)))
    link.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
    link.add(to: .main, forMode: .common)
    displayLink = link
    lastFrameTimestamp = CACurrentMediaTime()
  }

  private func stopDisplayLink() {
    displayLink?.invalidate()
    displayLink = nil
    displayLinkProxy = nil
  }

  fileprivate func handleDisplayLink(_ link: CADisplayLink) {
    let now = link.timestamp
    let dt = lastFrameTimestamp > 0 ? min(max(now - lastFrameTimestamp, 0.0), 0.05) : (1.0 / 60.0)
    lastFrameTimestamp = now
    renderFrame(dt: dt, now: now)
  }

  private func renderFrame(dt: CFTimeInterval, now: CFTimeInterval) {
    guard
      let pipelineState,
      let commandQueue,
      let glyphAtlas,
      metalLayer.drawableSize.width >= 2,
      metalLayer.drawableSize.height >= 2
    else { return }

    // Smoothly track heading and bearing with wrap-safe shortest angular interpolation.
    let tau = reducedMotion ? 0.015 : 0.055
    let alpha = dt > 0 ? (1.0 - exp(-dt / tau)) : 1.0
    let targetH = hasHeading ? targetHeadingDeg : 0.0
    let headingDiff = Self.signedAngleDeltaDeg(from: displayedHeadingDeg, to: targetH)
    displayedHeadingDeg = Self.normalizeDeg(displayedHeadingDeg + headingDiff * alpha)

    if hasLocation {
      let bearingDiff = Self.signedAngleDeltaDeg(from: displayedQiblaDeg, to: qiblaBearingDeg)
      displayedQiblaDeg = Self.normalizeDeg(displayedQiblaDeg + bearingDiff * alpha)
    }

    let deltaDeg = hasLocation && hasHeading
      ? Self.signedAngleDeltaDeg(from: displayedHeadingDeg, to: displayedQiblaDeg)
      : 0.0
    let absDelta = abs(deltaDeg)
    let targetLockMix: Float = (hasLocation && hasHeading && isLocked) ? 1.0 : 0.0
    let lockTau = reducedMotion ? 0.04 : 0.09
    let lockAlpha = Float(dt > 0 ? (1.0 - exp(-dt / lockTau)) : 1.0)
    lockMix += (targetLockMix - lockMix) * lockAlpha

    if lockPulse > 0 {
      lockPulse = max(0.0, lockPulse - Float(dt) / 0.55)
    }

    evaluateDynamicHaptics(now: now)

    guard let drawable = metalLayer.nextDrawable() else { return }

    let screen = window?.screen ?? UIScreen.main
    let maxHeadroom = max(Float(screen.potentialEDRHeadroom), Float(screen.currentEDRHeadroom), 1.0)
    let headingRad = Float(displayedHeadingDeg * .pi / 180.0)
    let qiblaScreenRad = Float(deltaDeg * .pi / 180.0)
    let absDeltaNorm = Float(min(max(absDelta / 60.0, 0.0), 1.0))

    var uniforms = QiblaUniforms(
      viewInfo: SIMD4<Float>(
        Float(max(bounds.width, 1.0)),
        Float(max(bounds.height, 1.0)),
        Float(now - startTimestamp),
        maxHeadroom
      ),
      angles: SIMD4<Float>(
        headingRad,
        qiblaScreenRad,
        qiblaScreenRad,
        absDeltaNorm
      ),
      state: SIMD4<Float>(
        hasLocation ? 1.0 : 0.0,
        lockMix,
        reducedMotion ? 0.0 : lockPulse,
        isDarkTheme ? 1.0 : 0.0
      ),
      accentColor: linearP3(accentUIColor),
      alignedColor: linearP3(alignedUIColor),
      northColor: linearP3(northUIColor),
      ringColor: linearP3(ringUIColor),
      tickColor: linearP3(tickUIColor),
      textColor: linearP3(textUIColor),
      surfaceColor: linearP3(surfaceUIColor)
    )

    let passDesc = MTLRenderPassDescriptor()
    passDesc.colorAttachments[0].texture = drawable.texture
    passDesc.colorAttachments[0].loadAction = .clear
    passDesc.colorAttachments[0].storeAction = .store
    passDesc.colorAttachments[0].clearColor = MTLClearColorMake(0, 0, 0, 0)

    guard
      let cmdBuf = commandQueue.makeCommandBuffer(),
      let encoder = cmdBuf.makeRenderCommandEncoder(descriptor: passDesc)
    else { return }

    encoder.setRenderPipelineState(pipelineState)
    encoder.setFragmentBytes(&uniforms, length: MemoryLayout<QiblaUniforms>.stride, index: 0)
    encoder.setFragmentTexture(glyphAtlas, index: 0)
    encoder.drawPrimitives(type: .triangleStrip, vertexStart: 0, vertexCount: 4)
    encoder.endEncoding()

    cmdBuf.present(drawable)
    cmdBuf.commit()
  }

  private func linearP3(_ color: UIColor) -> SIMD4<Float> {
    let resolved = color.resolvedColor(with: traitCollection)
    var r: CGFloat = 0
    var g: CGFloat = 0
    var b: CGFloat = 0
    var a: CGFloat = 1

    if let cs = CGColorSpace(name: CGColorSpace.extendedLinearDisplayP3),
       let converted = resolved.cgColor.converted(to: cs, intent: .defaultIntent, options: nil),
       let comps = converted.components,
       comps.count >= 3 {
      r = comps[0]
      g = comps[1]
      b = comps[2]
      a = comps.count >= 4 ? comps[3] : 1.0
    } else if resolved.getRed(&r, green: &g, blue: &b, alpha: &a) {
      let lin: (CGFloat) -> CGFloat = { c in
        c <= 0.04045 ? (c / 12.92) : pow((c + 0.055) / 1.055, 2.4)
      }
      r = lin(r)
      g = lin(g)
      b = lin(b)
    }

    return SIMD4<Float>(Float(r), Float(g), Float(b), Float(a))
  }

  // MARK: - CoreLocation
  private func setupLocationManager() {
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    locationManager.distanceFilter = 50.0
    locationManager.headingFilter = kCLHeadingFilterNone
    locationManager.headingOrientation = .portrait
    syncPermissionStatus()
  }

  private func syncPermissionStatus() {
    switch locationManager.authorizationStatus {
    case .notDetermined:
      permissionStatusString = "notDetermined"
    case .authorizedWhenInUse, .authorizedAlways:
      permissionStatusString = "authorized"
    case .denied:
      permissionStatusString = "denied"
    case .restricted:
      permissionStatusString = "restricted"
    @unknown default:
      permissionStatusString = "denied"
    }
  }

  private func requestLocationPermission() {
    syncPermissionStatus()
    if locationManager.authorizationStatus == .notDetermined {
      locationManager.requestWhenInUseAuthorization()
    } else if isActive && window != nil && permissionStatusString == "authorized" {
      refreshLocationNow()
    }
  }

  private func refreshLocationNow() {
    syncPermissionStatus()
    guard isActive, window != nil else { return }
    if permissionStatusString == "authorized" {
      locationManager.stopUpdatingLocation()
      locationManager.startUpdatingLocation()
    } else if permissionStatusString == "notDetermined" {
      locationManager.requestWhenInUseAuthorization()
    }
    if CLLocationManager.headingAvailable() {
      locationManager.stopUpdatingHeading()
      locationManager.startUpdatingHeading()
    }
  }

  private func startSensors() {
    guard !isSensorsRunning else { return }
    isSensorsRunning = true
    syncPermissionStatus()
    if permissionStatusString == "authorized" {
      locationManager.startUpdatingLocation()
    }
    if CLLocationManager.headingAvailable() {
      locationManager.startUpdatingHeading()
    }
  }

  private func stopSensors() {
    guard isSensorsRunning else { return }
    isSensorsRunning = false
    locationManager.stopUpdatingLocation()
    locationManager.stopUpdatingHeading()
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    let prev = permissionStatusString
    syncPermissionStatus()
    if isActive && window != nil && permissionStatusString == "authorized" {
      locationManager.startUpdatingLocation()
      if CLLocationManager.headingAvailable() {
        locationManager.startUpdatingHeading()
      }
    } else if permissionStatusString == "denied" || permissionStatusString == "restricted" {
      locationManager.stopUpdatingLocation()
      hasLocation = false
      isLocked = false
    }
    if prev != permissionStatusString {
      dispatchQiblaUpdate(force: true)
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let loc = locations.last, loc.horizontalAccuracy >= 0 else { return }
    latitude = loc.coordinate.latitude
    longitude = loc.coordinate.longitude
    horizontalAccuracy = loc.horizontalAccuracy
    qiblaBearingDeg = Self.computeQiblaBearing(latDeg: latitude, lonDeg: longitude)
    distanceKm = Self.computeDistanceKm(latDeg: latitude, lonDeg: longitude)
    if !hasLocation {
      displayedQiblaDeg = qiblaBearingDeg
    }
    hasLocation = true
    dispatchQiblaUpdate(force: true)
  }

  func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
    guard newHeading.headingAccuracy >= 0 else { return }
    let useTrue = newHeading.trueHeading >= 0
    let deg = useTrue ? newHeading.trueHeading : newHeading.magneticHeading
    let wasHeading = hasHeading
    hasHeading = true
    isTrueNorthHeading = useTrue
    headingAccuracyDeg = newHeading.headingAccuracy
    targetHeadingDeg = Self.normalizeDeg(deg)
    if !wasHeading {
      displayedHeadingDeg = targetHeadingDeg
      lastDetentHeadingDeg = (targetHeadingDeg / 15.0).rounded() * 15.0
    }

    let now = CACurrentMediaTime()
    if let prevMotion = lastSampledHeadingForMotion {
      if abs(Self.signedAngleDeltaDeg(from: prevMotion, to: targetHeadingDeg)) >= 0.35 {
        lastHeadingMotionTimestamp = now
        lastSampledHeadingForMotion = targetHeadingDeg
      }
    } else {
      lastSampledHeadingForMotion = targetHeadingDeg
      lastHeadingMotionTimestamp = now
    }

    dispatchQiblaUpdate(force: false)
  }

  func locationManagerShouldDisplayHeadingCalibration(_ manager: CLLocationManager) -> Bool {
    return headingAccuracyDeg < 0 || headingAccuracyDeg > 25.0
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    if let clErr = error as? CLError, clErr.code == .denied {
      syncPermissionStatus()
      dispatchQiblaUpdate(force: true)
    }
  }

  // MARK: - CoreHaptics Engine & Dynamic Feedback
  private func setupHaptics() {
    supportsCoreHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics
    guard supportsCoreHaptics else { return }
    do {
      let engine = try CHHapticEngine()
      engine.isAutoShutdownEnabled = true
      engine.resetHandler = { [weak self] in
        self?.hapticEngineNeedsStart = true
      }
      engine.stoppedHandler = { [weak self] _ in
        self?.hapticEngineNeedsStart = true
      }
      hapticEngine = engine
    } catch {
      supportsCoreHaptics = false
      hapticEngine = nil
    }
  }

  private func ensureHapticEngineStarted() -> CHHapticEngine? {
    guard supportsCoreHaptics, let engine = hapticEngine else { return nil }
    if hapticEngineNeedsStart {
      do {
        try engine.start()
        hapticEngineNeedsStart = false
      } catch {
        return nil
      }
    }
    return engine
  }

  private func stopHapticEngine() {
    hapticEngine?.stop(completionHandler: nil)
    hapticEngineNeedsStart = true
  }

  private func evaluateDynamicHaptics(now: CFTimeInterval) {
    guard isActive, window != nil, hasHeading else { return }

    if hasLocation {
      let delta = Self.signedAngleDeltaDeg(from: targetHeadingDeg, to: qiblaBearingDeg)
      let absDelta = abs(delta)

      if !isLocked && absDelta <= Self.lockEnterDeg {
        isLocked = true
        if now - lastLockTimestamp >= 0.45 {
          lastLockTimestamp = now
          lockPulse = 1.0
          if hapticsEnabled {
            playLockHaptic()
          }
        }
        dispatchQiblaUpdate(force: true)
        return
      }

      if isLocked && absDelta > Self.lockExitDeg {
        isLocked = false
        dispatchQiblaUpdate(force: true)
      }

      if hapticsEnabled && !isLocked && absDelta <= Self.approachStartDeg && absDelta > Self.lockEnterDeg {
        let movingRecently = (now - lastHeadingMotionTimestamp) <= 1.4
        if movingRecently {
          let closeness = min(
            max(1.0 - (absDelta - Self.lockEnterDeg) / (Self.approachStartDeg - Self.lockEnterDeg), 0.0),
            1.0
          )
          let interval = 0.30 - closeness * (0.30 - 0.085)
          if now - lastApproachTimestamp >= interval {
            lastApproachTimestamp = now
            let intensity = Float(0.32 + closeness * 0.48)
            let sharpness = Float(0.45 + closeness * 0.45)
            playTransientHaptic(intensity: intensity, sharpness: sharpness, fallback: fallbackApproachGenerator)
            return
          }
        }
      }
    }

    // Subtle 15-degree compass dial detent ticks when rotating outside Qibla lock
    if hapticsEnabled && !isLocked {
      let anchor = lastDetentHeadingDeg ?? ((targetHeadingDeg / 15.0).rounded() * 15.0)
      let stepDelta = abs(Self.signedAngleDeltaDeg(from: anchor, to: targetHeadingDeg))
      if stepDelta >= 15.0 {
        lastDetentHeadingDeg = Self.normalizeDeg((targetHeadingDeg / 15.0).rounded() * 15.0)
        if now - lastDetentTimestamp >= 0.045 {
          lastDetentTimestamp = now
          playTransientHaptic(intensity: 0.28, sharpness: 0.80, fallback: fallbackTickGenerator)
        }
      }
    }
  }

  private func playTransientHaptic(
    intensity: Float,
    sharpness: Float,
    fallback: UIImpactFeedbackGenerator
  ) {
    if let engine = ensureHapticEngineStarted() {
      let event = CHHapticEvent(
        eventType: .hapticTransient,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
        ],
        relativeTime: 0
      )
      if let pattern = try? CHHapticPattern(events: [event], parameters: []),
         let player = try? engine.makePlayer(with: pattern) {
        try? player.start(atTime: CHHapticTimeImmediate)
        return
      }
    }
    fallback.prepare()
    fallback.impactOccurred(intensity: CGFloat(min(max(intensity, 0.1), 1.0)))
  }

  private func playLockHaptic() {
    if let engine = ensureHapticEngineStarted() {
      let click = CHHapticEvent(
        eventType: .hapticTransient,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.92),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.88)
        ],
        relativeTime: 0
      )
      let swell = CHHapticEvent(
        eventType: .hapticContinuous,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.68),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.35)
        ],
        relativeTime: 0.065,
        duration: 0.14
      )
      if let pattern = try? CHHapticPattern(events: [click, swell], parameters: []),
         let player = try? engine.makePlayer(with: pattern) {
        try? player.start(atTime: CHHapticTimeImmediate)
        return
      }
    }
    fallbackLockGenerator.prepare()
    fallbackLockGenerator.notificationOccurred(.success)
  }

  // MARK: - Event Dispatch (~10 Hz throttle + immediate transitions)
  private func dispatchQiblaUpdate(force: Bool) {
    let now = CACurrentMediaTime()
    if !force && (now - lastEventDispatchTime) < 0.10 {
      return
    }
    lastEventDispatchTime = now

    let deltaDeg = (hasLocation && hasHeading)
      ? Self.signedAngleDeltaDeg(from: targetHeadingDeg, to: qiblaBearingDeg)
      : 0.0

    onQiblaUpdate([
      "permissionStatus": permissionStatusString,
      "headingAvailable": hasHeading,
      "locationAvailable": hasLocation,
      "isTrueNorth": isTrueNorthHeading,
      "headingDeg": targetHeadingDeg,
      "qiblaBearingDeg": qiblaBearingDeg,
      "deltaDeg": deltaDeg,
      "distanceKm": distanceKm,
      "headingAccuracyDeg": headingAccuracyDeg,
      "horizontalAccuracyM": horizontalAccuracy,
      "latitude": latitude,
      "longitude": longitude,
      "isAligned": hasLocation && hasHeading && isLocked
    ])
  }

  // MARK: - Geodesic & Angular Math
  private static func normalizeDeg(_ deg: Double) -> Double {
    var d = deg.truncatingRemainder(dividingBy: 360.0)
    if d < 0 { d += 360.0 }
    return d
  }

  private static func signedAngleDeltaDeg(from heading: Double, to target: Double) -> Double {
    var d = (target - heading).truncatingRemainder(dividingBy: 360.0)
    if d > 180.0 { d -= 360.0 }
    if d <= -180.0 { d += 360.0 }
    return d
  }

  private static func computeQiblaBearing(latDeg: Double, lonDeg: Double) -> Double {
    let phi1 = latDeg * .pi / 180.0
    let phi2 = kaabaLatDeg * .pi / 180.0
    let dLambda = (kaabaLonDeg - lonDeg) * .pi / 180.0
    let y = sin(dLambda) * cos(phi2)
    let x = cos(phi1) * sin(phi2) - sin(phi1) * cos(phi2) * cos(dLambda)
    let raw = atan2(y, x) * 180.0 / .pi
    return normalizeDeg(raw)
  }

  private static func computeDistanceKm(latDeg: Double, lonDeg: Double) -> Double {
    let r = 6371.0088
    let phi1 = latDeg * .pi / 180.0
    let phi2 = kaabaLatDeg * .pi / 180.0
    let dPhi = (kaabaLatDeg - latDeg) * .pi / 180.0
    let dLambda = (kaabaLonDeg - lonDeg) * .pi / 180.0
    let s1 = sin(dPhi * 0.5)
    let s2 = sin(dLambda * 0.5)
    let a = s1 * s1 + cos(phi1) * cos(phi2) * s2 * s2
    let c = 2.0 * atan2(sqrt(max(0.0, a)), sqrt(max(0.0, 1.0 - a)))
    return r * c
  }
}
