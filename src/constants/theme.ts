import "@/global.css";
import { Platform } from "react-native";
import { Course } from "@/lib/ics";

export type ThemeMode = "nuit" | "clair" | "oled" | "auto";

export type TintName = "glacier" | "violet" | "corail" | "menthe" | "ambre";

export type Scale7 = {
  50: string;  // Fond de carte teinté subtil
  100: string; // Fond de badge / état survol
  300: string; // Bordure subtile
  500: string; // Accent principal / icône
  600: string; // État pressé / actif
  700: string; // Texte contrasté
  900: string; // Variante sombre profonde
};

export type AppTheme = {
  name: ThemeMode;
  isDark: boolean;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  backgroundHover: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSecondary: string;
  // Échelles 7 nuances par teinte
  glacier: Scale7;
  violet: Scale7;
  corail: Scale7;
  menthe: Scale7;
  ambre: Scale7;
};

// 1. Thème Nuit (Défaut : Fond bleu nuit, accents bleu glacier et violet)
const nuitTheme: AppTheme = {
  name: "nuit",
  isDark: true,
  background: "#0B111E",
  backgroundElement: "#131C2E",
  backgroundSelected: "#1E2B45",
  backgroundHover: "#253554",
  border: "#1E2B45",
  borderSubtle: "#152033",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  accent: "#38BDF8", // bleu glacier
  accentSecondary: "#A78BFA", // violet
  glacier: {
    50: "rgba(56, 189, 248, 0.08)",
    100: "rgba(56, 189, 248, 0.16)",
    300: "rgba(56, 189, 248, 0.35)",
    500: "#38BDF8",
    600: "#0EA5E9",
    700: "#7DD3FC",
    900: "#082F49",
  },
  violet: {
    50: "rgba(167, 139, 250, 0.08)",
    100: "rgba(167, 139, 250, 0.16)",
    300: "rgba(167, 139, 250, 0.35)",
    500: "#A78BFA",
    600: "#8B5CF6",
    700: "#C4B5FD",
    900: "#2E1065",
  },
  corail: {
    50: "rgba(251, 113, 133, 0.08)",
    100: "rgba(251, 113, 133, 0.16)",
    300: "rgba(251, 113, 133, 0.35)",
    500: "#FB7185",
    600: "#F43F5E",
    700: "#FDA4AF",
    900: "#4C0519",
  },
  menthe: {
    50: "rgba(52, 211, 153, 0.08)",
    100: "rgba(52, 211, 153, 0.16)",
    300: "rgba(52, 211, 153, 0.35)",
    500: "#34D399",
    600: "#10B981",
    700: "#6EE7B7",
    900: "#022C22",
  },
  ambre: {
    50: "rgba(251, 191, 36, 0.08)",
    100: "rgba(251, 191, 36, 0.16)",
    300: "rgba(251, 191, 36, 0.35)",
    500: "#FBBF24",
    600: "#F59E0B",
    700: "#FDE68A",
    900: "#451A03",
  },
};

// 2. Thème Clair
const clairTheme: AppTheme = {
  name: "clair",
  isDark: false,
  background: "#F8FAFC",
  backgroundElement: "#FFFFFF",
  backgroundSelected: "#E2E8F0",
  backgroundHover: "#F1F5F9",
  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  accent: "#0284C7",
  accentSecondary: "#7C3AED",
  glacier: {
    50: "#F0F9FF",
    100: "#E0F2FE",
    300: "#7DD3FC",
    500: "#0284C7",
    600: "#0369A1",
    700: "#075985",
    900: "#0C4A6E",
  },
  violet: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    300: "#C4B5FD",
    500: "#7C3AED",
    600: "#6D28D9",
    700: "#5B21B6",
    900: "#4C1D95",
  },
  corail: {
    50: "#FFF1F2",
    100: "#FFE4E6",
    300: "#FDA4AF",
    500: "#E11D48",
    600: "#BE123C",
    700: "#9F1239",
    900: "#881337",
  },
  menthe: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    300: "#6EE7B7",
    500: "#059669",
    600: "#047857",
    700: "#065F46",
    900: "#064E3B",
  },
  ambre: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    300: "#FCD34D",
    500: "#D97706",
    600: "#B45309",
    700: "#92400E",
    900: "#78350F",
  },
};

// 3. Thème Noir OLED
const oledTheme: AppTheme = {
  ...nuitTheme,
  name: "oled",
  background: "#000000",
  backgroundElement: "#101010",
  backgroundSelected: "#202020",
  backgroundHover: "#282828",
  border: "#202020",
  borderSubtle: "#161616",
};

export const Themes: Record<"nuit" | "clair" | "oled", AppTheme> = {
  nuit: nuitTheme,
  clair: clairTheme,
  oled: oledTheme,
};

// Rétrocompatibilité avec les anciens composants
export const Colors = {
  light: clairTheme,
  dark: nuitTheme,
};

export type ThemeColor =
  | "background"
  | "backgroundElement"
  | "backgroundSelected"
  | "backgroundHover"
  | "border"
  | "borderSubtle"
  | "text"
  | "textSecondary"
  | "textMuted"
  | "accent"
  | "accentSecondary";

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

const TINTS: TintName[] = ["glacier", "violet", "corail", "menthe", "ambre"];

/**
 * Hash déterministe pour associer de manière stable n'importe quel code matière
 * à l'une des 5 teintes du design system.
 */
export function getSubjectTint(subject: string): TintName {
  let h = 2166136261;
  const str = subject.toUpperCase();
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  const index = Math.abs(h >>> 0) % TINTS.length;
  return TINTS[index];
}

export type CourseColorTokens = {
  tintName: TintName;
  cardBg: string;
  badgeBg: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
};

/**
 * Calcule les tokens de couleur d'un cours :
 * Teinte dérivée du hash du subject, nuance modulée par le kind (DS, TP, TD, CM, TUT).
 */
export function getCourseColorTokens(
  subject: string,
  kind: Course["kind"],
  theme: AppTheme
): CourseColorTokens {
  const tintName = getSubjectTint(subject);
  const scale = theme[tintName];

  // Le kind module la nuance selon les spécifications d'AGENTS.md
  if (kind === "DS") {
    // DS = évaluation : nuance corail vive pour alerte
    const corail = theme.corail;
    return {
      tintName,
      cardBg: corail[50],
      badgeBg: corail[100],
      borderColor: corail[500],
      accentColor: corail[500],
      textColor: corail[700],
    };
  }

  if (kind === "TP") {
    return {
      tintName,
      cardBg: scale[50],
      badgeBg: scale[100],
      borderColor: scale[300],
      accentColor: scale[500],
      textColor: scale[700],
    };
  }

  if (kind === "CM") {
    return {
      tintName,
      cardBg: scale[50],
      badgeBg: scale[100],
      borderColor: scale[500],
      accentColor: scale[600],
      textColor: scale[700],
    };
  }

  if (kind === "TD") {
    return {
      tintName,
      cardBg: scale[50],
      badgeBg: scale[100],
      borderColor: scale[300],
      accentColor: scale[500],
      textColor: scale[700],
    };
  }

  if (kind === "TUT") {
    return {
      tintName,
      cardBg: scale[50],
      badgeBg: scale[100],
      borderColor: scale[300],
      accentColor: scale[500],
      textColor: scale[700],
    };
  }

  // null = sans type explicite
  return {
    tintName,
    cardBg: scale[50],
    badgeBg: scale[100],
    borderColor: theme.borderSubtle,
    accentColor: scale[500],
    textColor: scale[700],
  };
}
