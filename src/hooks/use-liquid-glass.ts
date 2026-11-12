import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";

/**
 * Hook pour déterminer si le Liquid Glass natif d'iOS est disponible et utilisable.
 * Règle AGENTS.md :
 * Avant tout GlassView, tester isLiquidGlassAvailable().
 * Sinon (iOS < 26, accessibilité « réduire la transparence », Android, aperçu web) :
 * repli sur une surface opaque ou semi-opaque propre, jamais un verre imité.
 */
export function useLiquidGlass(): boolean {
  const [reduceTransparency, setReduceTransparency] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    // Sur iOS, vérifier le réglage système "Réduire la transparence"
    if (Platform.OS === "ios") {
      AccessibilityInfo.isReduceTransparencyEnabled()
        .then((enabled) => {
          if (mounted) setReduceTransparency(enabled);
        })
        .catch(() => {});

      const sub = AccessibilityInfo.addEventListener(
        "reduceTransparencyChanged",
        (enabled: boolean) => {
          setReduceTransparency(enabled);
        }
      );

      return () => {
        mounted = false;
        sub.remove();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Sur plateforme non-iOS ou si la transparence est réduite, repli direct
  if (Platform.OS !== "ios" || reduceTransparency) {
    return false;
  }

  // Vérification de la disponibilité du composant natif expo-glass-effect
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}
