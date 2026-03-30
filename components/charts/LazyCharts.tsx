"use client";

import dynamic from "next/dynamic";

function ChartFallback({ className = "h-64" }: { className?: string }) {
  return (
    <div
      className={`w-full animate-pulse rounded-xl bg-slate-100 ${className}`}
      aria-hidden
    />
  );
}

async function loadBar() {
  await import("@/components/charts/registry");
  const { Bar } = await import("react-chartjs-2");
  return Bar;
}

async function loadLine() {
  await import("@/components/charts/registry");
  const { Line } = await import("react-chartjs-2");
  return Line;
}

async function loadDoughnut() {
  await import("@/components/charts/registry");
  const { Doughnut } = await import("react-chartjs-2");
  return Doughnut;
}

/** ENG-109: code-split Chart.js widgets (no SSR). */
export const LazyBar = dynamic(loadBar, {
  ssr: false,
  loading: () => <ChartFallback />,
});

export const LazyLine = dynamic(loadLine, {
  ssr: false,
  loading: () => <ChartFallback />,
});

export const LazyDoughnut = dynamic(loadDoughnut, {
  ssr: false,
  loading: () => <ChartFallback className="h-52" />,
});
