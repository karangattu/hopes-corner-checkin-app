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
ChartJS.defaults.datasets.line.tension = 0.35; // smooth curves

export const defaultAnimations = {
  duration: 900,
  easing: "easeOutQuart",
};

export const hoverAnimation = {
  mode: "nearest",
  intersect: false,
};
