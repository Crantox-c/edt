export type QiblaPermissionStatus =
  | "notDetermined"
  | "authorized"
  | "denied"
  | "restricted";

export const KAABA_LAT = 21.422487;
export const KAABA_LON = 39.826206;

const CARDINALS_FR = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSO",
  "SO",
  "OSO",
  "O",
  "ONO",
  "NO",
  "NNO",
] as const;

export function normalizeBearingDeg(deg: number): number {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Calcule l'azimut initial (grand cercle) en degrés [0, 360) vers la Kaaba à La Mecque.
 */
export function computeQiblaBearing(latDeg: number, lonDeg: number): number {
  const toRad = Math.PI / 180;
  const phi1 = latDeg * toRad;
  const phi2 = KAABA_LAT * toRad;
  const dLambda = (KAABA_LON - lonDeg) * toRad;

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

  const raw = (Math.atan2(y, x) * 180) / Math.PI;
  return normalizeBearingDeg(raw);
}

/**
 * Distance géodésique (Haversine) en kilomètres jusqu'à La Mecque.
 */
export function computeDistanceToMeccaKm(latDeg: number, lonDeg: number): number {
  const earthRadiusKm = 6371.0088;
  const toRad = Math.PI / 180;
  const phi1 = latDeg * toRad;
  const phi2 = KAABA_LAT * toRad;
  const dPhi = (KAABA_LAT - latDeg) * toRad;
  const dLambda = (KAABA_LON - lonDeg) * toRad;

  const s1 = Math.sin(dPhi * 0.5);
  const s2 = Math.sin(dLambda * 0.5);
  const a = s1 * s1 + Math.cos(phi1) * Math.cos(phi2) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
  return earthRadiusKm * c;
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return "—";
  if (km < 10) {
    return `${km.toFixed(1).replace(".", ",")} km`;
  }
  return `${Math.round(km).toLocaleString("fr-FR")} km`;
}

export function formatCardinalFrench(deg: number): string {
  const norm = normalizeBearingDeg(deg);
  const idx = Math.round(norm / 22.5) % 16;
  return CARDINALS_FR[idx] ?? "N";
}

export function formatCoordinatePair(latDeg: number, lonDeg: number): string {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return "—";
  const latHemi = latDeg >= 0 ? "N" : "S";
  const lonHemi = lonDeg >= 0 ? "E" : "O";
  return `${Math.abs(latDeg).toFixed(2)}° ${latHemi} · ${Math.abs(lonDeg).toFixed(2)}° ${lonHemi}`;
}

export type AlignmentGuidance = {
  tone: "aligned" | "approaching" | "seeking" | "pending" | "denied";
  title: string;
  subtitle: string;
};

export function getAlignmentGuidance(params: {
  permissionStatus: QiblaPermissionStatus;
  headingAvailable: boolean;
  locationAvailable: boolean;
  deltaDeg: number;
  isAligned: boolean;
}): AlignmentGuidance {
  const { permissionStatus, headingAvailable, locationAvailable, deltaDeg, isAligned } = params;

  if (permissionStatus === "denied" || permissionStatus === "restricted") {
    return {
      tone: "denied",
      title: "Localisation désactivée",
      subtitle: "Autorisez l'accès dans Réglages pour situer la Qibla",
    };
  }

  if (!locationAvailable) {
    if (permissionStatus === "notDetermined") {
      return {
        tone: "pending",
        title: "Autorisation requise",
        subtitle: "Activez la localisation pour calculer l'azimut exact",
      };
    }
    return {
      tone: "pending",
      title: "Acquisition GPS…",
      subtitle: "Calcul du cap précis vers La Mecque",
    };
  }

  if (!headingAvailable) {
    return {
      tone: "pending",
      title: "Initialisation boussole…",
      subtitle: "Tenez l'appareil à plat, loin d'objets métalliques",
    };
  }

  if (isAligned) {
    return {
      tone: "aligned",
      title: "Aligné sur la Qibla",
      subtitle: "Direction exacte de la Kaaba · La Mecque",
    };
  }

  const absRounded = Math.max(1, Math.round(Math.abs(deltaDeg)));
  const turnLabel = deltaDeg >= 0 ? "à droite" : "à gauche";

  if (Math.abs(deltaDeg) <= 25) {
    return {
      tone: "approaching",
      title: "Presque aligné",
      subtitle: `Tournez doucement ${turnLabel} (${absRounded}°)`,
    };
  }

  return {
    tone: "seeking",
    title: `Tournez ${turnLabel}`,
    subtitle: `Écart de ${absRounded}° par rapport à la Qibla`,
  };
}
