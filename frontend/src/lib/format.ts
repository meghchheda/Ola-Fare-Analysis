export const inr = (n: number, digits = 0) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const compact = (n: number) =>
  n >= 1e7 ? `${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(2)} L` : n.toLocaleString("en-IN");
export const int = (n: number) => Math.round(n).toLocaleString("en-IN");
export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
export const fix = (n: number | null | undefined, d = 3) => (n == null ? "—" : n.toFixed(d));

export const COLORS = {
  lime: "#C7F464",
  coral: "#FF795E",
  sky: "#71C7D8",
  gold: "#FFC857",
  ivory: "#F5F2E9",
  sage: "#A8BDB3",
  line: "#34564B",
  danger: "#FF6B6B",
  teal: "#173C35",
  deep: "#0F332C",
};
export const SERIES = [COLORS.lime, COLORS.coral, COLORS.sky, COLORS.gold, "#B79CED", "#7EE0B5", "#F29CC3", "#E3A857"];
export const STATUS_COLORS: Record<string, string> = {
  Success: COLORS.lime,
  "Canceled by Driver": COLORS.coral,
  "Canceled by Customer": COLORS.gold,
  "Driver Not Found": COLORS.sky,
};
