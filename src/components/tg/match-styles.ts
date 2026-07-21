// Shared dark-theme styles for match-flow pages (section, captain, vc, combination, transfer)
// Ensures all pages match the new "Apna Cricket Pro" dark glassmorphism model.

export const cardStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

export const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#e8eefc",
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export const subtitle: React.CSSProperties = {
  fontSize: 12,
  color: "#8a94b3",
  marginBottom: 12,
  lineHeight: 1.5,
};

// Stat box (players selected, credits left, etc.)
export const statBox: React.CSSProperties = {
  flex: 1,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export const statNum: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "#e8eefc",
  lineHeight: 1,
};

export const statLabel: React.CSSProperties = {
  fontSize: 9,
  color: "#8a94b3",
  marginTop: 2,
};

// Pill button (selectable options)
export const pillBtn = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "8px 4px",
  border: active
    ? "1px solid rgba(52,211,153,0.5)"
    : "1px solid rgba(255,255,255,0.08)",
  background: active
    ? "linear-gradient(135deg, rgba(52,211,153,0.25), rgba(16,185,129,0.15))"
    : "rgba(255,255,255,0.03)",
  color: active ? "#34d399" : "#8a94b3",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.2s ease",
});

// Chip button
export const chipBtn = (active: boolean): React.CSSProperties => ({
  padding: "7px 12px",
  border: active ? "1px solid rgba(52,211,153,0.5)" : "1px solid rgba(255,255,255,0.08)",
  background: active ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
  color: active ? "#34d399" : "#b4bcd6",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
});

// Player row (selectable)
export const playerRow = (selected: boolean, roleColor?: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: selected
    ? roleColor
      ? `${roleColor}1A`
      : "rgba(52,211,153,0.1)"
    : "rgba(255,255,255,0.03)",
  border: selected
    ? roleColor
      ? `1px solid ${roleColor}66`
      : "1px solid rgba(52,211,153,0.4)"
    : "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  cursor: "pointer",
  textAlign: "left" as const,
  transition: "all 0.2s ease",
});

// Avatar circle (player initial)
export const avatar = (bg: string): React.CSSProperties => ({
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: bg,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
});

// Player name
export const playerName: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#e8eefc",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

// Player subtitle (team, sel%)
export const playerSub: React.CSSProperties = {
  fontSize: 10,
  color: "#8a94b3",
  marginTop: 2,
};

// Credits display
export const creditsVal: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#34d399",
};

export const creditsLabel: React.CSSProperties = {
  fontSize: 9,
  color: "#8a94b3",
};

// Sticky bottom action bar
export const actionBar: React.CSSProperties = {
  position: "sticky",
  bottom: 8,
  left: 0,
  right: 0,
  background: "rgba(10,16,36,0.9)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  padding: "10px",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  gap: 8,
  zIndex: 20,
  borderRadius: "0 0 16px 16px",
};

// Reset button (secondary)
export const resetBtn: React.CSSProperties = {
  flex: 1,
  padding: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
  color: "#b4bcd6",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
};

// Primary action button (emerald gradient)
export const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  flex: 2,
  padding: "12px",
  border: "none",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 800,
  color: "#04130d",
  background: "linear-gradient(135deg, #34d399, #10b981)",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  boxShadow: disabled ? "none" : "0 6px 16px rgba(16,185,129,0.3)",
  transition: "all 0.2s ease",
});

// Role colors (WK=cyan, BAT=green, AR=amber, BOWL=rose)
export const ROLE_COLORS = ["#06b6d4", "#34d399", "#f59e0b", "#f43f5e"];

// Loading state
export const loadingStyle: React.CSSProperties = {
  textAlign: "center",
  padding: 30,
  color: "#8a94b3",
  fontSize: 13,
};

// Empty/notice banner
export const banner = (color: string): React.CSSProperties => ({
  background: `${color}1A`,
  border: `1px solid ${color}55`,
  borderRadius: 12,
  padding: "10px 14px",
  marginBottom: 12,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 600,
  color,
});
