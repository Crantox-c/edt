import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppTheme, ThemeMode, Themes } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const THEME_STORAGE_KEY = "app:theme_mode_v1";

type ThemeContextType = {
  theme: AppTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: Themes.nuit,
  themeMode: "nuit",
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("nuit");

  // Charger le mode de thème sauvegardé
  useEffect(() => {
    let mounted = true;
    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === "nuit" || saved === "clair" || saved === "oled" || saved === "auto")) {
          if (mounted) setThemeModeState(saved as ThemeMode);
        }
      } catch (e) {
        console.warn("Erreur chargement thème:", e);
      }
    }
    loadTheme();
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

  // Résoudre le thème effectif
  const theme = useMemo<AppTheme>(() => {
    if (themeMode === "auto") {
      return systemScheme === "dark" ? Themes.nuit : Themes.clair;
    }
    return Themes[themeMode];
  }, [themeMode, systemScheme]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
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
 * Hook permettant de lire et modifier le mode de thème (nuit, clair, oled, auto).
 */
export function useThemeContext(): ThemeContextType {
  return useContext(ThemeContext);
}
