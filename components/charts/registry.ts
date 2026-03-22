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

export default Chart;
