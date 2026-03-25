/**
 * Chart.js global registration — import this once before using any chart.
 * All chart types and plugins registered here; individual components import
 * only what they need from react-chartjs-2.
 */
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

// Disable datalabels globally — enable per-dataset/chart where needed
Chart.defaults.plugins.datalabels = {
  display: false,
};

/** Plan §6 — default to slate structure; override per chart for semantic series */
Chart.defaults.color = "#64748b";
Chart.defaults.borderColor = "#e2e8f0";
Chart.defaults.font = {
  family: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
  size: 11,
};
Chart.defaults.plugins.legend = {
  ...Chart.defaults.plugins.legend,
  labels: {
    ...Chart.defaults.plugins.legend?.labels,
    color: "#475569",
    usePointStyle: true,
    padding: 12,
  },
};

export default Chart;
