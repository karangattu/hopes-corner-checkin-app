import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export const palette = {
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#a855f7",
  amber: "#f59e0b",
  gray: "#94a3b8",
  slate: "#64748b",
  sky: "#38bdf8",
  rose: "#fb7185",
};

ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;
ChartJS.defaults.font.family =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
ChartJS.defaults.font.size = 12;
ChartJS.defaults.plugins.legend.position = "bottom";
ChartJS.defaults.plugins.tooltip.mode = "index";
ChartJS.defaults.plugins.tooltip.intersect = false;
// Only set line tension if line dataset defaults exist
if (ChartJS.defaults.datasets.line) {
  ChartJS.defaults.datasets.line.tension = 0.35; // smooth curves
}

export const defaultAnimations = {
  duration: 900,
  easing: "easeOutQuart",
};

export const hoverAnimation = {
  mode: "nearest",
  intersect: false,
};

const componentToHex = (value) => value.toString(16).padStart(2, "0");

const hslToRgb = (h, s, l) => {
  const hue = h / 360;
  const saturation = s / 100;
  const lightness = l / 100;

  if (saturation === 0) {
    const val = Math.round(lightness * 255);
    return [val, val, val];
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  const hueToRgb = (t) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  const r = Math.round(hueToRgb(hue + 1 / 3) * 255);
  const g = Math.round(hueToRgb(hue) * 255);
  const b = Math.round(hueToRgb(hue - 1 / 3) * 255);

  return [r, g, b];
};

export const hslToHex = (h, s, l) => {
  const [r, g, b] = hslToRgb(h, s, l);
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
};

export const generateColorPalette = (
  count,
  { saturation = 65, lightness = 55, offset = 0 } = {},
) => {
  const colors = [];
  const goldenAngle = 137.50776405003785;

  for (let i = 0; i < count; i += 1) {
    const hue = (offset + i * goldenAngle) % 360;
    colors.push(hslToHex(hue, saturation, lightness));
  }

  return colors;
};

export const applyAlpha = (hex, alpha = 0.7) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Recharts color palette for consistent styling across all charts
export const CHART_COLORS = [
  palette.blue,     // #3b82f6
  palette.green,    // #22c55e
  palette.purple,   // #a855f7
  palette.amber,    // #f59e0b
  palette.sky,      // #38bdf8
  palette.rose,     // #fb7185
  palette.slate,    // #64748b
  palette.gray,     // #94a3b8
];
