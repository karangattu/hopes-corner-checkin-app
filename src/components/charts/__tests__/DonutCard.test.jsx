import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DonutCard from "../DonutCard";

// Mock Chart.js
vi.mock("chart.js", () => ({
  Chart: {
    register: vi.fn(),
    defaults: {
      responsive: true,
      maintainAspectRatio: false,
      font: {
        family: "ui-sans-serif",
        size: 12,
      },
      datasets: {
        line: {},
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
    },
  },
  ArcElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  PointElement: vi.fn(),
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  TimeScale: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}));

// Mock react-chartjs-2
vi.mock("react-chartjs-2", () => ({
  Doughnut: ({ data }) => {
    // Simple mock that renders the total
    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
    return <div data-testid="doughnut-chart">Total: {total}</div>;
  },
}));

describe("DonutCard", () => {
  it("renders title, subtitle, and total correctly", () => {
    const dataMap = { "Category A": 10, "Category B": 20, "Category C": 30 };
    render(
      <DonutCard
        title="Test Title"
        subtitle="Test Subtitle"
        dataMap={dataMap}
      />,
    );

    expect(screen.getByText("Test Subtitle")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument(); // Total
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("displays zero when dataMap is empty", () => {
    render(<DonutCard title="Empty" subtitle="No Data" dataMap={{}} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("handles null dataMap gracefully", () => {
    render(<DonutCard title="Null" subtitle="Null Data" dataMap={null} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders doughnut chart with data", () => {
    const dataMap = { "Item 1": 5, "Item 2": 15 };
    render(<DonutCard title="Chart" subtitle="Data" dataMap={dataMap} />);

    expect(screen.getByTestId("doughnut-chart")).toHaveTextContent("Total: 20");
  });
});
