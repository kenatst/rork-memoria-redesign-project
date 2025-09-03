const palette = {
  beige: "#F2EBE1",
  cream: "#F4EEE6",
  taupe: "#7A6F63",
  taupeSoft: "#EDE4D8",
  taupeDeep: "#2C2C2C",
  accentGold: "#D6C08F",
  accentGoldDark: "#B7A67A",
  accentGoldLight: "#E2D9B8",
  border: "#EBE3D8",
  card: "#FFFFFF",
  overlay: "rgba(0,0,0,0.08)",
  overlayStrong: "rgba(0,0,0,0.12)",
  error: "#E74C3C",
  success: "#2ECC71",
  warning: "#D6C08F",
  info: "#8C93A8",
} as const;

export default {
  light: {
    text: "#2C2C2C",
    background: "#F2EBE1",
    tint: "#2C2C2C",
    tabIconDefault: "#AFA193",
    tabIconSelected: "#2C2C2C",
  },
  palette,
};