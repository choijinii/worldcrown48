/**
 * Domain 2 · The Lab — dark theme tokens (handoff §6).
 *
 * Shared so every Lab component pulls the same values; Crown Gold #FCD006 is
 * the only point colour (불변 원칙 #2). Centralised here rather than a CSS file
 * to match the codebase's inline-style convention.
 */
export const lab = {
  bg: "#0E0944",
  surface: "#1A1466",
  surfaceElev: "#241754",
  text: "#FFFFFF",
  textSub: "#B8C4D9",
  textMuted: "#6B7896",
  gold: "#FCD006",
  goldHover: "#E3BB05",
  goldSubtle: "rgba(252,208,6,0.12)",
  goldGlow: "rgba(252,208,6,0.30)",
  crimson: "#D7063A",
  turquoise: "#00A3B7",
  border: "rgba(255,255,255,0.12)",
  borderDashed: "rgba(252,208,6,0.40)",
  font: "Inter, system-ui, sans-serif",
} as const;
