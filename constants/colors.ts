const palette = {
  beige: "#0B0B0D",
  cream: "#131417",
  taupe: "#A9AFBC",
  taupeSoft: "#2A2D34",
  taupeDeep: "#E8EAF0",
  accentGold: "#FFD700",
  error: "#FF6B6B",
  success: "#4ADE80",
  warning: "#FFA500",
  info: "#3B82F6",
} as const;

export default {
  light: {
    text: "#FFFFFF",
    background: "#0B0B0D",
    tint: "#FFFFFF",
    tabIconDefault: "#A9AFBC",
    tabIconSelected: "#FFFFFF",
  },
  palette,
};