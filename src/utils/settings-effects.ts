import { createContext, useContext, useMemo } from "react";

export const ThemeOverrideContext = createContext<"light" | "dark" | null>(null);

import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  AccentColor,
  FontScale,
  useAppSettingsStore,
} from "@/src/store/settings-store";
import { colors } from "@/src/theme/tokens";

export function applyFontScale(size: number, fontScale: FontScale) {
  const multiplier = {
    small: 0.92,
    medium: 1,
    large: 1.12,
  }[fontScale];

  return Math.round(size * multiplier);
}

export function compactValue(
  value: number,
  compactLayout: boolean,
  multiplier = 0.78,
) {
  return compactLayout ? Math.round(value * multiplier) : value;
}

export const lightColors = colors;

export const darkColors: typeof colors = {
  accentAmber: "#6B4A1E",
  accentBlue: "#1D3F63",
  accentGreen: "#1D4F36",
  accentGreenDeep: "#A7F3C7",
  accentGreenSoft: "#173D2A",
  background: "#0F1411",
  border: "#334137",
  muted: "#A7B2A9",
  primary: "#65D58B",
  primarySoft: "#173D2A",
  surface: "#171D19",
  surfaceAlt: "#202821",
  text: "#F3F7F1",
  white: "#FFFFFF",
};

type AccentPalette = {
  light: {
    accentGreen: string;
    accentGreenDeep: string;
    accentGreenSoft: string;
    background: string;
    primary: string;
    primarySoft: string;
    surfaceAlt: string;
  };
  dark: {
    accentGreen: string;
    accentGreenDeep: string;
    accentGreenSoft: string;
    primary: string;
    primarySoft: string;
  };
};

export const accentPalettes: Record<AccentColor, AccentPalette> = {
  amber: {
    light: {
      accentGreen: "#FEF3C7",
      accentGreenDeep: "#92400E",
      accentGreenSoft: "#FEF3C7",
      background: "#FAF4E8",
      primary: "#B45309",
      primarySoft: "#FEF3C7",
      surfaceAlt: "#F3E7D3",
    },
    dark: {
      accentGreen: "#451A03",
      accentGreenDeep: "#FDE68A",
      accentGreenSoft: "#451A03",
      primary: "#FBBF24",
      primarySoft: "#451A03",
    },
  },
  emerald: {
    light: {
      accentGreen: "#D9F4E2",
      accentGreenDeep: "#14532D",
      accentGreenSoft: "#D9F4E2",
      background: "#F4F8F1",
      primary: "#14532D",
      primarySoft: "#D9F4E2",
      surfaceAlt: "#E7EFE1",
    },
    dark: {
      accentGreen: "#173D2A",
      accentGreenDeep: "#A7F3C7",
      accentGreenSoft: "#173D2A",
      primary: "#65D58B",
      primarySoft: "#173D2A",
    },
  },
  lightRed: {
    light: {
      accentGreen: "#FEE2E2",
      accentGreenDeep: "#B91C1C",
      accentGreenSoft: "#FEE2E2",
      background: "#FCF4F4",
      primary: "#DC2626",
      primarySoft: "#FEE2E2",
      surfaceAlt: "#F7E7E7",
    },
    dark: {
      accentGreen: "#450A0A",
      accentGreenDeep: "#FECACA",
      accentGreenSoft: "#450A0A",
      primary: "#F87171",
      primarySoft: "#450A0A",
    },
  },
  skyBlue: {
    light: {
      accentGreen: "#DBEAFE",
      accentGreenDeep: "#0369A1",
      accentGreenSoft: "#DBEAFE",
      background: "#F3F7FC",
      primary: "#0284C7",
      primarySoft: "#DBEAFE",
      surfaceAlt: "#E5EDF8",
    },
    dark: {
      accentGreen: "#082F49",
      accentGreenDeep: "#BAE6FD",
      accentGreenSoft: "#082F49",
      primary: "#38BDF8",
      primarySoft: "#082F49",
    },
  },
  yellow: {
    light: {
      accentGreen: "#FEF9C3",
      accentGreenDeep: "#A16207",
      accentGreenSoft: "#FEF9C3",
      background: "#FAF9EA",
      primary: "#CA8A04",
      primarySoft: "#FEF9C3",
      surfaceAlt: "#F2EFCF",
    },
    dark: {
      accentGreen: "#422006",
      accentGreenDeep: "#FEF08A",
      accentGreenSoft: "#422006",
      primary: "#FACC15",
      primarySoft: "#422006",
    },
  },
};

export function useThemeColors() {
  const systemScheme = useColorScheme();
  const themeMode = useAppSettingsStore((state) => state.themeMode);
  const accentColor = useAppSettingsStore((state) => state.accentColor);
  const override = useContext(ThemeOverrideContext);
  const effectiveTheme = override ?? (themeMode === "system" ? systemScheme : themeMode);


  return useMemo(() => {
    const mode = effectiveTheme === "dark" ? "dark" : "light";
    const baseColors = mode === "dark" ? darkColors : lightColors;
    const accent =
      accentPalettes[accentColor]?.[mode] ?? accentPalettes.skyBlue[mode];

    return {
      ...baseColors,
      ...accent,
    };
  }, [accentColor, effectiveTheme]);
}
