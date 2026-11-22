import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACCENT_PRESETS,
  type AccentPreset,
  type AppTheme,
  type BaseThemeMode,
  type ThemeMode,
  Themes,
  resolveTheme,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const THEME_STORAGE_KEY = "app:theme_mode_v1";
const ACCENT_STORAGE_KEY = "app:accent_preset_v1";

const VALID_ACCENTS = new Set<string>(ACCENT_PRESETS.map((p) => p.key));

type ThemeContextType = {
  theme: AppTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  accentPreset: AccentPreset;
  setAccentPreset: (preset: AccentPreset) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: Themes.nuit,
  themeMode: "nuit",
  setThemeMode: () => {},
  accentPreset: "glacier",
  setAccentPreset: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("nuit");
  const [accentPreset, setAccentPresetState] = useState<AccentPreset>("glacier");

  // Charger le mode de thème et la couleur d'accentuation sauvegardés
  useEffect(() => {
    let mounted = true;
    async function loadPreferences() {
      try {
        const [savedMode, savedAccent] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(ACCENT_STORAGE_KEY),
        ]);
        if (
          mounted &&
          savedMode &&
          (savedMode === "nuit" ||
            savedMode === "clair" ||
            savedMode === "oled" ||
            savedMode === "auto")
        ) {
          setThemeModeState(savedMode as ThemeMode);
        }
        if (mounted && savedAccent && VALID_ACCENTS.has(savedAccent)) {
          setAccentPresetState(savedAccent as AccentPreset);
        }
      } catch (e) {
        console.warn("Erreur chargement thème:", e);
      }
    }
    loadPreferences();
    return () => {
      mounted = false;
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch((e) => {
      console.warn("Erreur sauvegarde thème:", e);
    });
  }, []);

  const setAccentPreset = useCallback((preset: AccentPreset) => {
    setAccentPresetState(preset);
    AsyncStorage.setItem(ACCENT_STORAGE_KEY, preset).catch((e) => {
      console.warn("Erreur sauvegarde accent:", e);
    });
  }, []);

  // Résoudre le thème de base effectif puis appliquer l'échelle d'accent hiérarchisée
  const theme = useMemo<AppTheme>(() => {
    const resolvedBase: BaseThemeMode =
      themeMode === "auto"
        ? systemScheme === "dark"
          ? "nuit"
          : "clair"
        : themeMode;
    return resolveTheme(resolvedBase, accentPreset);
  }, [themeMode, systemScheme, accentPreset]);

  return (
    <ThemeContext.Provider
      value={{ theme, themeMode, setThemeMode, accentPreset, setAccentPreset }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook principal retournant le thème actif (avec ses tokens et échelles de couleurs).
 */
export function useTheme(): AppTheme {
  const context = useContext(ThemeContext);
  return context.theme;
}

/**
 * Hook permettant de lire et modifier le mode de thème et la couleur d'accentuation.
 */
export function useThemeContext(): ThemeContextType {
  return useContext(ThemeContext);
}
