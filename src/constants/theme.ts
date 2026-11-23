import "@/global.css";
import { Platform } from "react-native";
import { Course } from "@/lib/ics";

export type ThemeMode = "nuit" | "clair" | "oled" | "auto";
export type BaseThemeMode = "nuit" | "clair" | "oled";

export type TintName = "glacier" | "violet" | "corail" | "menthe" | "ambre";

export type AccentPreset =
  | "glacier"
  | "cyan"
  | "bleu"
  | "indigo"
  | "violet"
  | "rose"
  | "corail"
  | "rubis"
  | "mandarine"
  | "ambre"
  | "menthe"
  | "titane";

export const ACCENT_PRESETS: readonly { key: AccentPreset; label: string }[] = [
  { key: "glacier", label: "Glacier" },
  { key: "cyan", label: "Turquoise" },
  { key: "bleu", label: "Cobalt" },
  { key: "indigo", label: "Indigo" },
  { key: "violet", label: "Violet" },
  { key: "rose", label: "Fuchsia" },
  { key: "corail", label: "Corail" },
  { key: "rubis", label: "Rubis" },
  { key: "mandarine", label: "Mandarine" },
  { key: "ambre", label: "Ambre" },
  { key: "menthe", label: "Émeraude" },
  { key: "titane", label: "Titane" },
];

export type Scale7 = {
  50: string;  // Fond de carte teinté subtil
  100: string; // Fond de badge / pilule / état survol
  300: string; // Bordure subtile / séparateur coloré
  500: string; // Accent principal / icône / barre latérale
  600: string; // État pressé / CTA plein à contraste élevé
  700: string; // Texte contrasté haute lisibilité
  900: string; // Variante sombre profonde
};

export type AccentTiers = {
  solidBg: string;  // Importance max : boutons CTA pleins, pastilles compteurs (contraste élevé avec textOnAccent)
  primary: string;  // Importance haute : icônes actives, barre d'onglets, switches, repères "Aujourd'hui"
  pressed: string;  // État pressé / accent soutenu
  text: string;     // Texte contrasté sur surfaces teintées (pastel clair en sombre/OLED, soutenu en clair)
  border: string;   // Importance moyenne : bordures sélectionnées / anneaux de focus
  softBg: string;   // Importance moyenne : fond de chips sélectionnés, pilules actives, badges icônes
  subtleBg: string; // Importance subtile : fond colonne "Aujourd'hui", surbrillance douce
  deep: string;     // Nuance d'ancrage sombre
};

export type AppTheme = {
  name: ThemeMode;
  isDark: boolean;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  backgroundHover: string;
  cardBg: string;
  cardBgSubtle: string;
  cardBorder: string;
  cardHighlight: string;
  surfaceMuted: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  switchThumb: string;
  shadow: string;
  scrim: string;
  accent: string;
  accentSecondary: string;
  accentPreset: AccentPreset;
  accentScale: Scale7;
  accentTiers: AccentTiers;
  auroraPrimary: string;
  auroraSecondary: string;
  auroraTertiary: string;
  daySelectedNumber: string;
  daySelectedGlow: string;
  // Échelles 7 nuances par teinte
  glacier: Scale7;
  violet: Scale7;
  corail: Scale7;
  menthe: Scale7;
  ambre: Scale7;
};

type ThemeBase = Omit<
  AppTheme,
  "accentPreset" | "accentScale" | "accentTiers"
>;

// 1. Thème Nuit (Graphite profond discret, accents hiérarchisés)
const nuitThemeBase: ThemeBase = {
  name: "nuit",
  isDark: true,
  background: "#0C0E13",
  backgroundElement: "rgba(21, 24, 32, 0.90)",
  backgroundSelected: "#202531",
  backgroundHover: "#282E3D",
  cardBg: "#141720",
  cardBgSubtle: "#10131A",
  cardBorder: "rgba(160, 174, 198, 0.11)",
  cardHighlight: "rgba(255, 255, 255, 0.05)",
  surfaceMuted: "rgba(148, 163, 184, 0.13)",
  border: "rgba(148, 163, 184, 0.16)",
  borderSubtle: "rgba(148, 163, 184, 0.08)",
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  textOnAccent: "#FFFFFF",
  switchThumb: "#FFFFFF",
  shadow: "#000000",
  scrim: "rgba(0, 0, 0, 0.48)",
  accent: "#38BDF8",
  accentSecondary: "#A78BFA",
  auroraPrimary: "rgba(56, 152, 248, 0.10)",
  auroraSecondary: "rgba(139, 118, 246, 0.065)",
  auroraTertiary: "rgba(56, 152, 248, 0.085)",
  daySelectedNumber: "#FFFFFF",
  daySelectedGlow: "rgba(56, 189, 248, 0.34)",
  glacier: {
    50: "rgba(56, 189, 248, 0.10)",
    100: "rgba(56, 189, 248, 0.20)",
    300: "rgba(56, 189, 248, 0.38)",
    500: "#38BDF8",
    600: "#0EA5E9",
    700: "#BAE6FD",
    900: "#082F49",
  },
  violet: {
    50: "rgba(167, 139, 250, 0.10)",
    100: "rgba(167, 139, 250, 0.20)",
    300: "rgba(167, 139, 250, 0.38)",
    500: "#A78BFA",
    600: "#8B5CF6",
    700: "#DDD6FE",
    900: "#2E1065",
  },
  corail: {
    50: "rgba(251, 113, 133, 0.10)",
    100: "rgba(251, 113, 133, 0.20)",
    300: "rgba(251, 113, 133, 0.38)",
    500: "#FB7185",
    600: "#F43F5E",
    700: "#FECDD3",
    900: "#4C0519",
  },
  menthe: {
    50: "rgba(52, 211, 153, 0.10)",
    100: "rgba(52, 211, 153, 0.20)",
    300: "rgba(52, 211, 153, 0.38)",
    500: "#34D399",
    600: "#10B981",
    700: "#A7F3D0",
    900: "#022C22",
  },
  ambre: {
    50: "rgba(251, 191, 36, 0.10)",
    100: "rgba(251, 191, 36, 0.20)",
    300: "rgba(251, 191, 36, 0.38)",
    500: "#FBBF24",
    600: "#F59E0B",
    700: "#FDE68A",
    900: "#451A03",
  },
};

// 2. Thème Clair
const clairThemeBase: ThemeBase = {
  name: "clair",
  isDark: false,
  background: "#F4F6FA",
  backgroundElement: "rgba(255, 255, 255, 0.90)",
  backgroundSelected: "#E5EAF3",
  backgroundHover: "#EEF2F7",
  cardBg: "#FFFFFF",
  cardBgSubtle: "#EEF2F7",
  cardBorder: "rgba(15, 23, 42, 0.08)",
  cardHighlight: "rgba(255, 255, 255, 0.90)",
  surfaceMuted: "rgba(15, 23, 42, 0.07)",
  border: "rgba(15, 23, 42, 0.10)",
  borderSubtle: "rgba(15, 23, 42, 0.06)",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textOnAccent: "#FFFFFF",
  switchThumb: "#FFFFFF",
  shadow: "#000000",
  scrim: "rgba(15, 23, 42, 0.35)",
  accent: "#0284C7",
  accentSecondary: "#7C3AED",
  auroraPrimary: "rgba(14, 165, 233, 0.09)",
  auroraSecondary: "rgba(124, 58, 237, 0.06)",
  auroraTertiary: "rgba(186, 230, 253, 0.12)",
  daySelectedNumber: "#0369A1",
  daySelectedGlow: "rgba(2, 132, 199, 0.24)",
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

// 3. Thème Noir OLED (Défaut sombre : noir pur + lueur colorée vivante haut/bas)
const oledThemeBase: ThemeBase = {
  ...nuitThemeBase,
  name: "oled",
  background: "#000000",
  backgroundElement: "rgba(18, 19, 24, 0.92)",
  backgroundSelected: "#1E2028",
  backgroundHover: "#282830",
  cardBg: "#0E1015",
  cardBgSubtle: "#090A0D",
  cardBorder: "rgba(255, 255, 255, 0.09)",
  cardHighlight: "rgba(255, 255, 255, 0.06)",
  surfaceMuted: "rgba(255, 255, 255, 0.10)",
  border: "rgba(255, 255, 255, 0.14)",
  borderSubtle: "rgba(255, 255, 255, 0.07)",
  auroraPrimary: "rgba(56, 189, 248, 0.115)",
  auroraSecondary: "rgba(139, 118, 246, 0.075)",
  auroraTertiary: "rgba(14, 165, 233, 0.105)",
  daySelectedNumber: "#FFFFFF",
  daySelectedGlow: "rgba(56, 189, 248, 0.42)",
};

type AccentDefinition = {
  scale: Scale7;
  auroraPrimary: string;
  auroraSecondary: string;
  auroraTertiary: string;
  daySelectedGlow: string;
  secondaryAccent: string;
};

const NUIT_ACCENT_DEFS: Record<AccentPreset, AccentDefinition> = {
  glacier: {
    scale: {
      50: "rgba(56, 189, 248, 0.10)",
      100: "rgba(56, 189, 248, 0.20)",
      300: "rgba(56, 189, 248, 0.40)",
      500: "#38BDF8",
      600: "#0284C7",
      700: "#BAE6FD",
      900: "#082F49",
    },
    auroraPrimary: "rgba(56, 152, 248, 0.10)",
    auroraSecondary: "rgba(139, 118, 246, 0.065)",
    auroraTertiary: "rgba(56, 152, 248, 0.09)",
    daySelectedGlow: "rgba(56, 189, 248, 0.34)",
    secondaryAccent: "#A78BFA",
  },
  cyan: {
    scale: {
      50: "rgba(34, 211, 238, 0.10)",
      100: "rgba(34, 211, 238, 0.20)",
      300: "rgba(34, 211, 238, 0.40)",
      500: "#22D3EE",
      600: "#0E7490",
      700: "#A5F3FC",
      900: "#083344",
    },
    auroraPrimary: "rgba(34, 211, 238, 0.10)",
    auroraSecondary: "rgba(56, 189, 248, 0.065)",
    auroraTertiary: "rgba(6, 182, 212, 0.09)",
    daySelectedGlow: "rgba(34, 211, 238, 0.34)",
    secondaryAccent: "#38BDF8",
  },
  bleu: {
    scale: {
      50: "rgba(96, 165, 250, 0.10)",
      100: "rgba(96, 165, 250, 0.20)",
      300: "rgba(96, 165, 250, 0.40)",
      500: "#60A5FA",
      600: "#2563EB",
      700: "#BFDBFE",
      900: "#172554",
    },
    auroraPrimary: "rgba(59, 130, 246, 0.105)",
    auroraSecondary: "rgba(129, 140, 248, 0.065)",
    auroraTertiary: "rgba(96, 165, 250, 0.09)",
    daySelectedGlow: "rgba(96, 165, 250, 0.35)",
    secondaryAccent: "#818CF8",
  },
  indigo: {
    scale: {
      50: "rgba(99, 102, 241, 0.11)",
      100: "rgba(99, 102, 241, 0.22)",
      300: "rgba(129, 140, 248, 0.42)",
      500: "#818CF8",
      600: "#4F46E5",
      700: "#C7D2FE",
      900: "#1E1B4B",
    },
    auroraPrimary: "rgba(99, 102, 241, 0.105)",
    auroraSecondary: "rgba(56, 189, 248, 0.065)",
    auroraTertiary: "rgba(129, 140, 248, 0.09)",
    daySelectedGlow: "rgba(129, 140, 248, 0.35)",
    secondaryAccent: "#38BDF8",
  },
  violet: {
    scale: {
      50: "rgba(167, 139, 250, 0.10)",
      100: "rgba(167, 139, 250, 0.20)",
      300: "rgba(167, 139, 250, 0.40)",
      500: "#A78BFA",
      600: "#6D28D9",
      700: "#DDD6FE",
      900: "#2E1065",
    },
    auroraPrimary: "rgba(139, 92, 246, 0.105)",
    auroraSecondary: "rgba(56, 189, 248, 0.065)",
    auroraTertiary: "rgba(167, 139, 250, 0.09)",
    daySelectedGlow: "rgba(167, 139, 250, 0.35)",
    secondaryAccent: "#38BDF8",
  },
  rose: {
    scale: {
      50: "rgba(232, 121, 249, 0.10)",
      100: "rgba(232, 121, 249, 0.20)",
      300: "rgba(232, 121, 249, 0.40)",
      500: "#E879F9",
      600: "#A21CAF",
      700: "#F5D0FE",
      900: "#4A044E",
    },
    auroraPrimary: "rgba(217, 70, 239, 0.10)",
    auroraSecondary: "rgba(167, 139, 250, 0.065)",
    auroraTertiary: "rgba(232, 121, 249, 0.085)",
    daySelectedGlow: "rgba(232, 121, 249, 0.35)",
    secondaryAccent: "#A78BFA",
  },
  corail: {
    scale: {
      50: "rgba(251, 113, 133, 0.10)",
      100: "rgba(251, 113, 133, 0.20)",
      300: "rgba(251, 113, 133, 0.40)",
      500: "#FB7185",
      600: "#BE123C",
      700: "#FECDD3",
      900: "#4C0519",
    },
    auroraPrimary: "rgba(244, 63, 94, 0.095)",
    auroraSecondary: "rgba(167, 139, 250, 0.06)",
    auroraTertiary: "rgba(251, 113, 133, 0.085)",
    daySelectedGlow: "rgba(251, 113, 133, 0.34)",
    secondaryAccent: "#A78BFA",
  },
  rubis: {
    scale: {
      50: "rgba(248, 113, 113, 0.10)",
      100: "rgba(248, 113, 113, 0.20)",
      300: "rgba(248, 113, 113, 0.40)",
      500: "#F87171",
      600: "#DC2626",
      700: "#FECACA",
      900: "#450A0A",
    },
    auroraPrimary: "rgba(239, 68, 68, 0.095)",
    auroraSecondary: "rgba(251, 146, 60, 0.06)",
    auroraTertiary: "rgba(248, 113, 113, 0.085)",
    daySelectedGlow: "rgba(248, 113, 113, 0.34)",
    secondaryAccent: "#FB923C",
  },
  mandarine: {
    scale: {
      50: "rgba(251, 146, 60, 0.10)",
      100: "rgba(251, 146, 60, 0.20)",
      300: "rgba(251, 146, 60, 0.40)",
      500: "#FB923C",
      600: "#C2410C",
      700: "#FED7AA",
      900: "#431407",
    },
    auroraPrimary: "rgba(249, 115, 22, 0.095)",
    auroraSecondary: "rgba(251, 191, 36, 0.06)",
    auroraTertiary: "rgba(251, 146, 60, 0.085)",
    daySelectedGlow: "rgba(251, 146, 60, 0.34)",
    secondaryAccent: "#FBBF24",
  },
  ambre: {
    scale: {
      50: "rgba(251, 191, 36, 0.10)",
      100: "rgba(251, 191, 36, 0.20)",
      300: "rgba(251, 191, 36, 0.40)",
      500: "#FBBF24",
      600: "#B45309",
      700: "#FDE68A",
      900: "#451A03",
    },
    auroraPrimary: "rgba(245, 158, 11, 0.09)",
    auroraSecondary: "rgba(56, 189, 248, 0.06)",
    auroraTertiary: "rgba(251, 191, 36, 0.08)",
    daySelectedGlow: "rgba(251, 191, 36, 0.32)",
    secondaryAccent: "#38BDF8",
  },
  menthe: {
    scale: {
      50: "rgba(52, 211, 153, 0.10)",
      100: "rgba(52, 211, 153, 0.20)",
      300: "rgba(52, 211, 153, 0.40)",
      500: "#34D399",
      600: "#047857",
      700: "#A7F3D0",
      900: "#022C22",
    },
    auroraPrimary: "rgba(16, 185, 129, 0.095)",
    auroraSecondary: "rgba(56, 189, 248, 0.06)",
    auroraTertiary: "rgba(52, 211, 153, 0.085)",
    daySelectedGlow: "rgba(52, 211, 153, 0.32)",
    secondaryAccent: "#38BDF8",
  },
  titane: {
    scale: {
      50: "rgba(226, 232, 240, 0.10)",
      100: "rgba(226, 232, 240, 0.18)",
      300: "rgba(226, 232, 240, 0.38)",
      500: "#E2E8F0",
      600: "#475569",
      700: "#F8FAFC",
      900: "#0F172A",
    },
    auroraPrimary: "rgba(226, 232, 240, 0.085)",
    auroraSecondary: "rgba(148, 163, 184, 0.055)",
    auroraTertiary: "rgba(226, 232, 240, 0.075)",
    daySelectedGlow: "rgba(248, 250, 252, 0.32)",
    secondaryAccent: "#94A3B8",
  },
};

const CLAIR_ACCENT_DEFS: Record<AccentPreset, AccentDefinition> = {
  glacier: {
    scale: clairThemeBase.glacier,
    auroraPrimary: "rgba(14, 165, 233, 0.09)",
    auroraSecondary: "rgba(124, 58, 237, 0.06)",
    auroraTertiary: "rgba(14, 165, 233, 0.085)",
    daySelectedGlow: "rgba(2, 132, 199, 0.24)",
    secondaryAccent: "#7C3AED",
  },
  cyan: {
    scale: {
      50: "#ECFEFF",
      100: "#CFFAFE",
      300: "#67E8F9",
      500: "#0891B2",
      600: "#0E7490",
      700: "#155E75",
      900: "#164E63",
    },
    auroraPrimary: "rgba(8, 145, 178, 0.085)",
    auroraSecondary: "rgba(2, 132, 199, 0.06)",
    auroraTertiary: "rgba(8, 145, 178, 0.08)",
    daySelectedGlow: "rgba(8, 145, 178, 0.24)",
    secondaryAccent: "#0284C7",
  },
  bleu: {
    scale: {
      50: "#EFF6FF",
      100: "#DBEAFE",
      300: "#93C5FD",
      500: "#2563EB",
      600: "#1D4ED8",
      700: "#1E40AF",
      900: "#1E3A8A",
    },
    auroraPrimary: "rgba(37, 99, 235, 0.085)",
    auroraSecondary: "rgba(79, 70, 229, 0.06)",
    auroraTertiary: "rgba(37, 99, 235, 0.08)",
    daySelectedGlow: "rgba(37, 99, 235, 0.24)",
    secondaryAccent: "#4F46E5",
  },
  indigo: {
    scale: {
      50: "#EEF2FF",
      100: "#E0E7FF",
      300: "#A5B4FC",
      500: "#4F46E5",
      600: "#4338CA",
      700: "#3730A3",
      900: "#312E81",
    },
    auroraPrimary: "rgba(79, 70, 229, 0.085)",
    auroraSecondary: "rgba(14, 165, 233, 0.06)",
    auroraTertiary: "rgba(79, 70, 229, 0.08)",
    daySelectedGlow: "rgba(79, 70, 229, 0.24)",
    secondaryAccent: "#0284C7",
  },
  violet: {
    scale: clairThemeBase.violet,
    auroraPrimary: "rgba(124, 58, 237, 0.085)",
    auroraSecondary: "rgba(14, 165, 233, 0.06)",
    auroraTertiary: "rgba(124, 58, 237, 0.08)",
    daySelectedGlow: "rgba(124, 58, 237, 0.24)",
    secondaryAccent: "#0284C7",
  },
  rose: {
    scale: {
      50: "#FDF4FF",
      100: "#FAE8FF",
      300: "#F0ABFC",
      500: "#C026D3",
      600: "#A21CAF",
      700: "#86198F",
      900: "#701A75",
    },
    auroraPrimary: "rgba(192, 38, 211, 0.08)",
    auroraSecondary: "rgba(124, 58, 237, 0.055)",
    auroraTertiary: "rgba(192, 38, 211, 0.075)",
    daySelectedGlow: "rgba(192, 38, 211, 0.24)",
    secondaryAccent: "#7C3AED",
  },
  corail: {
    scale: clairThemeBase.corail,
    auroraPrimary: "rgba(225, 29, 72, 0.085)",
    auroraSecondary: "rgba(124, 58, 237, 0.05)",
    auroraTertiary: "rgba(225, 29, 72, 0.08)",
    daySelectedGlow: "rgba(225, 29, 72, 0.24)",
    secondaryAccent: "#7C3AED",
  },
  rubis: {
    scale: {
      50: "#FEF2F2",
      100: "#FEE2E2",
      300: "#FCA5A5",
      500: "#EF4444",
      600: "#B91C1C",
      700: "#991B1B",
      900: "#7F1D1D",
    },
    auroraPrimary: "rgba(220, 38, 38, 0.08)",
    auroraSecondary: "rgba(234, 88, 12, 0.05)",
    auroraTertiary: "rgba(220, 38, 38, 0.075)",
    daySelectedGlow: "rgba(220, 38, 38, 0.24)",
    secondaryAccent: "#EA580C",
  },
  mandarine: {
    scale: {
      50: "#FFF7ED",
      100: "#FFEDD5",
      300: "#FDBA74",
      500: "#EA580C",
      600: "#C2410C",
      700: "#9A3412",
      900: "#7C2D12",
    },
    auroraPrimary: "rgba(234, 88, 12, 0.08)",
    auroraSecondary: "rgba(217, 119, 6, 0.05)",
    auroraTertiary: "rgba(234, 88, 12, 0.075)",
    daySelectedGlow: "rgba(234, 88, 12, 0.24)",
    secondaryAccent: "#D97706",
  },
  ambre: {
    scale: clairThemeBase.ambre,
    auroraPrimary: "rgba(217, 119, 6, 0.085)",
    auroraSecondary: "rgba(14, 165, 233, 0.05)",
    auroraTertiary: "rgba(217, 119, 6, 0.08)",
    daySelectedGlow: "rgba(217, 119, 6, 0.24)",
    secondaryAccent: "#0284C7",
  },
  menthe: {
    scale: clairThemeBase.menthe,
    auroraPrimary: "rgba(5, 150, 105, 0.085)",
    auroraSecondary: "rgba(14, 165, 233, 0.06)",
    auroraTertiary: "rgba(5, 150, 105, 0.08)",
    daySelectedGlow: "rgba(5, 150, 105, 0.24)",
    secondaryAccent: "#0284C7",
  },
  titane: {
    scale: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      300: "#CBD5E1",
      500: "#475569",
      600: "#334155",
      700: "#1E293B",
      900: "#0F172A",
    },
    auroraPrimary: "rgba(71, 85, 105, 0.08)",
    auroraSecondary: "rgba(100, 116, 139, 0.05)",
    auroraTertiary: "rgba(71, 85, 105, 0.07)",
    daySelectedGlow: "rgba(51, 65, 85, 0.22)",
    secondaryAccent: "#64748B",
  },
};

const OLED_ACCENT_DEFS: Record<AccentPreset, AccentDefinition> = {
  glacier: {
    scale: {
      50: "rgba(56, 189, 248, 0.08)",
      100: "rgba(56, 189, 248, 0.16)",
      300: "rgba(56, 189, 248, 0.34)",
      500: "#38BDF8",
      600: "#0284C7",
      700: "#BAE6FD",
      900: "#082F49",
    },
    auroraPrimary: "rgba(56, 189, 248, 0.115)",
    auroraSecondary: "rgba(139, 118, 246, 0.075)",
    auroraTertiary: "rgba(14, 165, 233, 0.105)",
    daySelectedGlow: "rgba(56, 189, 248, 0.42)",
    secondaryAccent: "#A78BFA",
  },
  cyan: {
    scale: {
      50: "rgba(34, 211, 238, 0.08)",
      100: "rgba(34, 211, 238, 0.16)",
      300: "rgba(34, 211, 238, 0.34)",
      500: "#22D3EE",
      600: "#0E7490",
      700: "#A5F3FC",
      900: "#083344",
    },
    auroraPrimary: "rgba(34, 211, 238, 0.115)",
    auroraSecondary: "rgba(56, 189, 248, 0.075)",
    auroraTertiary: "rgba(6, 182, 212, 0.105)",
    daySelectedGlow: "rgba(34, 211, 238, 0.42)",
    secondaryAccent: "#38BDF8",
  },
  bleu: {
    scale: {
      50: "rgba(96, 165, 250, 0.08)",
      100: "rgba(96, 165, 250, 0.16)",
      300: "rgba(96, 165, 250, 0.34)",
      500: "#60A5FA",
      600: "#2563EB",
      700: "#BFDBFE",
      900: "#172554",
    },
    auroraPrimary: "rgba(59, 130, 246, 0.12)",
    auroraSecondary: "rgba(129, 140, 248, 0.075)",
    auroraTertiary: "rgba(96, 165, 250, 0.105)",
    daySelectedGlow: "rgba(96, 165, 250, 0.42)",
    secondaryAccent: "#818CF8",
  },
  indigo: {
    scale: {
      50: "rgba(129, 140, 248, 0.08)",
      100: "rgba(129, 140, 248, 0.16)",
      300: "rgba(129, 140, 248, 0.34)",
      500: "#818CF8",
      600: "#4F46E5",
      700: "#C7D2FE",
      900: "#1E1B4B",
    },
    auroraPrimary: "rgba(99, 102, 241, 0.12)",
    auroraSecondary: "rgba(56, 189, 248, 0.075)",
    auroraTertiary: "rgba(129, 140, 248, 0.105)",
    daySelectedGlow: "rgba(129, 140, 248, 0.42)",
    secondaryAccent: "#38BDF8",
  },
  violet: {
    scale: {
      50: "rgba(167, 139, 250, 0.08)",
      100: "rgba(167, 139, 250, 0.16)",
      300: "rgba(167, 139, 250, 0.34)",
      500: "#A78BFA",
      600: "#6D28D9",
      700: "#DDD6FE",
      900: "#2E1065",
    },
    auroraPrimary: "rgba(139, 92, 246, 0.12)",
    auroraSecondary: "rgba(56, 189, 248, 0.075)",
    auroraTertiary: "rgba(167, 139, 250, 0.105)",
    daySelectedGlow: "rgba(167, 139, 250, 0.42)",
    secondaryAccent: "#38BDF8",
  },
  rose: {
    scale: {
      50: "rgba(232, 121, 249, 0.08)",
      100: "rgba(232, 121, 249, 0.16)",
      300: "rgba(232, 121, 249, 0.34)",
      500: "#E879F9",
      600: "#A21CAF",
      700: "#F5D0FE",
      900: "#4A044E",
    },
    auroraPrimary: "rgba(217, 70, 239, 0.115)",
    auroraSecondary: "rgba(167, 139, 250, 0.075)",
    auroraTertiary: "rgba(232, 121, 249, 0.10)",
    daySelectedGlow: "rgba(232, 121, 249, 0.42)",
    secondaryAccent: "#A78BFA",
  },
  corail: {
    scale: {
      50: "rgba(251, 113, 133, 0.08)",
      100: "rgba(251, 113, 133, 0.16)",
      300: "rgba(251, 113, 133, 0.34)",
      500: "#FB7185",
      600: "#BE123C",
      700: "#FECDD3",
      900: "#4C0519",
    },
    auroraPrimary: "rgba(244, 63, 94, 0.115)",
    auroraSecondary: "rgba(167, 139, 250, 0.07)",
    auroraTertiary: "rgba(251, 113, 133, 0.10)",
    daySelectedGlow: "rgba(251, 113, 133, 0.40)",
    secondaryAccent: "#A78BFA",
  },
  rubis: {
    scale: {
      50: "rgba(248, 113, 113, 0.08)",
      100: "rgba(248, 113, 113, 0.16)",
      300: "rgba(248, 113, 113, 0.34)",
      500: "#F87171",
      600: "#DC2626",
      700: "#FECACA",
      900: "#450A0A",
    },
    auroraPrimary: "rgba(239, 68, 68, 0.115)",
    auroraSecondary: "rgba(251, 146, 60, 0.07)",
    auroraTertiary: "rgba(248, 113, 113, 0.10)",
    daySelectedGlow: "rgba(248, 113, 113, 0.40)",
    secondaryAccent: "#FB923C",
  },
  mandarine: {
    scale: {
      50: "rgba(251, 146, 60, 0.08)",
      100: "rgba(251, 146, 60, 0.16)",
      300: "rgba(251, 146, 60, 0.34)",
      500: "#FB923C",
      600: "#C2410C",
      700: "#FED7AA",
      900: "#431407",
    },
    auroraPrimary: "rgba(249, 115, 22, 0.115)",
    auroraSecondary: "rgba(251, 191, 36, 0.07)",
    auroraTertiary: "rgba(251, 146, 60, 0.10)",
    daySelectedGlow: "rgba(251, 146, 60, 0.40)",
    secondaryAccent: "#FBBF24",
  },
  ambre: {
    scale: {
      50: "rgba(251, 191, 36, 0.08)",
      100: "rgba(251, 191, 36, 0.16)",
      300: "rgba(251, 191, 36, 0.34)",
      500: "#FBBF24",
      600: "#B45309",
      700: "#FDE68A",
      900: "#451A03",
    },
    auroraPrimary: "rgba(245, 158, 11, 0.11)",
    auroraSecondary: "rgba(56, 189, 248, 0.07)",
    auroraTertiary: "rgba(251, 191, 36, 0.095)",
    daySelectedGlow: "rgba(251, 191, 36, 0.40)",
    secondaryAccent: "#38BDF8",
  },
  menthe: {
    scale: {
      50: "rgba(52, 211, 153, 0.08)",
      100: "rgba(52, 211, 153, 0.16)",
      300: "rgba(52, 211, 153, 0.34)",
      500: "#34D399",
      600: "#047857",
      700: "#A7F3D0",
      900: "#022C22",
    },
    auroraPrimary: "rgba(16, 185, 129, 0.11)",
    auroraSecondary: "rgba(56, 189, 248, 0.07)",
    auroraTertiary: "rgba(52, 211, 153, 0.10)",
    daySelectedGlow: "rgba(52, 211, 153, 0.40)",
    secondaryAccent: "#38BDF8",
  },
  titane: {
    scale: {
      50: "rgba(226, 232, 240, 0.08)",
      100: "rgba(226, 232, 240, 0.16)",
      300: "rgba(226, 232, 240, 0.34)",
      500: "#E2E8F0",
      600: "#475569",
      700: "#F8FAFC",
      900: "#0F172A",
    },
    auroraPrimary: "rgba(226, 232, 240, 0.095)",
    auroraSecondary: "rgba(148, 163, 184, 0.06)",
    auroraTertiary: "rgba(226, 232, 240, 0.085)",
    daySelectedGlow: "rgba(248, 250, 252, 0.38)",
    secondaryAccent: "#94A3B8",
  },
};

function buildAccentTiers(scale: Scale7): AccentTiers {
  return {
    solidBg: scale[600],
    primary: scale[500],
    pressed: scale[600],
    text: scale[700],
    border: scale[300],
    softBg: scale[100],
    subtleBg: scale[50],
    deep: scale[900],
  };
}

/**
 * Retourne l'échelle 7 nuances de prévisualisation d'une couleur d'accent pour un thème donné.
 */
export function getAccentPreviewColor(
  preset: AccentPreset,
  baseMode: BaseThemeMode
): Scale7 {
  if (baseMode === "clair") return CLAIR_ACCENT_DEFS[preset].scale;
  if (baseMode === "oled") return OLED_ACCENT_DEFS[preset].scale;
  return NUIT_ACCENT_DEFS[preset].scale;
}

/**
 * Résout le thème complet en combinant le thème de base (`nuit`, `clair`, `oled`)
 * et la couleur d'accentuation hiérarchisée par niveau d'importance.
 */
export function resolveTheme(
  baseMode: BaseThemeMode,
  accentPreset: AccentPreset = "glacier"
): AppTheme {
  const base =
    baseMode === "clair"
      ? clairThemeBase
      : baseMode === "oled"
        ? oledThemeBase
        : nuitThemeBase;
  const def =
    baseMode === "clair"
      ? CLAIR_ACCENT_DEFS[accentPreset]
      : baseMode === "oled"
        ? OLED_ACCENT_DEFS[accentPreset]
        : NUIT_ACCENT_DEFS[accentPreset];

  return {
    ...base,
    accent: def.scale[500],
    accentSecondary: def.secondaryAccent,
    accentPreset,
    accentScale: def.scale,
    accentTiers: buildAccentTiers(def.scale),
    auroraPrimary: def.auroraPrimary,
    auroraSecondary: def.auroraSecondary,
    auroraTertiary: def.auroraTertiary,
    daySelectedNumber: base.isDark ? base.textOnAccent : def.scale[600],
    daySelectedGlow: def.daySelectedGlow,
  };
}

export const Themes: Record<BaseThemeMode, AppTheme> = {
  nuit: resolveTheme("nuit", "glacier"),
  clair: resolveTheme("clair", "glacier"),
  oled: resolveTheme("oled", "glacier"),
};

export const Colors = {
  light: Themes.clair,
  dark: Themes.oled,
};

export type ThemeColor =
  | "background"
  | "backgroundElement"
  | "backgroundSelected"
  | "backgroundHover"
  | "cardBg"
  | "cardBgSubtle"
  | "cardBorder"
  | "cardHighlight"
  | "surfaceMuted"
  | "border"
  | "borderSubtle"
  | "text"
  | "textSecondary"
  | "textMuted"
  | "textOnAccent"
  | "accent"
  | "accentSecondary";

export const FontFamilies = {
  displayMedium: "PlusJakartaSans_500Medium",
  displaySemiBold: "PlusJakartaSans_600SemiBold",
  displayBold: "PlusJakartaSans_700Bold",
  displayExtraBold: "PlusJakartaSans_800ExtraBold",
  bodyRegular: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  monoMedium: "JetBrainsMono_500Medium",
  monoSemiBold: "JetBrainsMono_600SemiBold",
} as const;

export const Fonts = Platform.select({
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
  default: {
    sans: FontFamilies.bodyMedium,
    serif: "serif",
    rounded: FontFamilies.displaySemiBold,
    mono: FontFamilies.monoMedium,
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

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 26,
  pill: 999,
} as const;

/**
 * Calcule un rayon concentrique conforme aux HIG iOS 26 (rayon interne = max(8, rayon externe - marge interne)).
 */
export function concentricRadius(outer: number, inset: number): number {
  return Math.max(8, outer - inset);
}

export const BottomTabInset = Platform.select({ ios: 74, android: 80 }) ?? 0;

/**
 * Marge basse du ScrollView dans un écran NativeTabs.
 * Sur iOS (`contentInsetAdjustmentBehavior="automatic"`) et Android (`SafeAreaView` natif),
 * la marge inférieure et la hauteur de la barre d'onglets sont déjà prises en charge par le système ;
 * on ajoute uniquement la marge visuelle au-dessus de la barre d'onglets (symétrique à celle du dessous).
 */
export function getTabScrollPaddingBottom(bottomInset: number): number {
  if (Platform.OS === "ios") {
    return bottomInset > 0 ? Spacing.three + Spacing.one : Spacing.three;
  }
  if (Platform.OS === "android") {
    return Spacing.three;
  }
  return BottomTabInset + Spacing.three;
}

export const MaxContentWidth = 800;

const TINTS: TintName[] = ["glacier", "violet", "corail", "menthe", "ambre"];

/**
 * Hash déterministe pour associer de manière stable n'importe quel code matière
 * à l'une des 5 teintes du design system.
 */
export function getSubjectTint(subject: string): TintName {
  const upper = subject.toUpperCase();
  if (upper.startsWith("SAE")) return "violet";
  let h = 2166136261;
  for (let i = 0; i < upper.length; i++) {
    h = Math.imul(h ^ upper.charCodeAt(i), 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  const index = Math.abs(h >>> 0) % TINTS.length;
  return TINTS[index];
}

export type CourseColorTokens = {
  tintName: TintName;
  glassTint: string | undefined;
  cardBg: string;
  badgeBg: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
};

/**
 * Calcule les tokens de couleur d'un cours :
 * Teinte dérivée du hash du subject, nuance modulée par le kind (DS, TP, TD, CM, TUT).
 * `glassTint` reste `undefined` afin que le Liquid Glass natif d'iOS 26 reste cristallin
 * sans teinte boueuse, les accents colorés étant portés par les pilules et bordures internes.
 */
export function getCourseColorTokens(
  subject: string,
  kind: Course["kind"],
  theme: AppTheme
): CourseColorTokens {
  const tintName = getSubjectTint(subject);
  const scale = theme[tintName];

  if (kind === "DS") {
    const corail = theme.corail;
    return {
      tintName: "corail",
      glassTint: undefined,
      cardBg: corail[50],
      badgeBg: corail[100],
      borderColor: corail[500],
      accentColor: corail[500],
      textColor: corail[700],
    };
  }

  if (kind === "CM") {
    return {
      tintName,
      glassTint: undefined,
      cardBg: scale[50],
      badgeBg: scale[100],
      borderColor: scale[500],
      accentColor: scale[600],
      textColor: scale[700],
    };
  }

  if (kind === "TP" || kind === "TD" || kind === "TUT") {
    return {
      tintName,
      glassTint: undefined,
      cardBg: scale[50],
      badgeBg: scale[100],
      borderColor: scale[300],
      accentColor: scale[500],
      textColor: scale[700],
    };
  }

  return {
    tintName,
    glassTint: undefined,
    cardBg: scale[50],
    badgeBg: scale[100],
    borderColor: theme.cardBorder,
    accentColor: scale[500],
    textColor: scale[700],
  };
}
