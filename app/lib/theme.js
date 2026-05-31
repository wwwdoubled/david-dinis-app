// ─────────────────────────────────────────────────────────────────────────
// app/lib/theme.js — tokens de tema partilhados (v3.23.5)
// T é um objecto MUTÁVEL singleton: applyTheme() altera as suas propriedades
// in-place (Object.assign), por isso o reference é estável e todos os
// componentes que importam T vêem as cores actualizadas após um re-render.
// Extraído de CampaignPlatform.jsx para permitir code-splitting das vistas.
// ─────────────────────────────────────────────────────────────────────────

export const THEMES = {
  // ── Soft Spatial · light ──────────────────────────────────────────
  light: {
    bg: '#EFECE3', bgEl: '#FAF7EE', ink: '#1A1814', inkSoft: '#5E594F',
    inkMute: '#928D80', line: '#DCD5C4', lineSoft: '#E8E2D0',
    accent: '#6B5BD8', accentSoft: '#E3DEFA',
    green: '#3F8F5E', red: '#C8473A', orange: '#D17B2A',
    blue: '#3F6FC8', cyan: '#CFE3F2', yellow: '#E8C268',
    purple: '#6B5BD8',
    cellAlt: '#E6E2D6',
    paper: '#FAF7EE',
  },
  // ── Soft Spatial · dark ───────────────────────────────────────────
  dark: {
    bg: '#13120E', bgEl: '#1E1C16', ink: '#F0EBE0', inkSoft: '#B0AA9A',
    inkMute: '#7A7568', line: '#2A271F', lineSoft: '#221F18',
    accent: '#9C8CF5', accentSoft: '#251F44',
    green: '#74C28B', red: '#E26B5C', orange: '#E8A55A',
    blue: '#8FB6E8', cyan: '#2A4658', yellow: '#E8C268',
    purple: '#9C8CF5',
    cellAlt: '#181610',
    paper: '#1E1C16',
  },
  // FNAC Portugal — brand orange + black + white
  fnac: {
    bg: '#F4F4F4', bgEl: '#FFFFFF', ink: '#000000', inkSoft: '#3A3A3A',
    inkMute: '#7A7A7A', line: '#D9D9D9', lineSoft: '#ECECEC',
    accent: '#E68A00', accentSoft: '#FFE9C7',
    green: '#2E8540', red: '#D81B1B', orange: '#E68A00',
    blue: '#1F4FB3', cyan: '#CFE7F8', yellow: '#FFCB05',
    purple: '#6A3FB0',
    cellAlt: '#EFEFEF',
    paper: '#FFFFFF',
  },
};

export const THEME_LABELS = { light: 'Claro', dark: 'Escuro', fnac: 'FNAC' };
export const THEME_ORDER = ['light', 'dark', 'fnac'];

// Singleton mutável — começa em light.
export const T = { ...THEMES.light };

export function applyTheme(mode) {
  const palette = THEMES[mode] || THEMES.light;
  Object.assign(T, palette);
}
