import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StackedBarCard from "../StackedBarCard";

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
  Bar: ({ data }) => {
    // Simple mock that renders categories and datasets info
    const categories = data.labels?.length || 0;
    const datasets = data.datasets?.length || 0;
    return (
      <div data-testid="bar-chart">
        Categories: {categories}, Datasets: {datasets}
      </div>
    );
  },
}));

describe("StackedBarCard", () => {
  it("renders title and subtitle correctly", () => {
    const crossTabData = {
      "City A": { "Age 18-25": 10, "Age 26-35": 20 },
      "City B": { "Age 18-25": 15, "Age 26-35": 25 },
    };

    render(
      <StackedBarCard
        title="Age Group by City"
        subtitle="Distribution across cities"
        crossTabData={crossTabData}
      />,
    );

    expect(screen.getByText("Age Group by City")).toBeInTheDocument();
    expect(screen.getByText("Distribution across cities")).toBeInTheDocument();
  });

  it("renders bar chart with correct categories and datasets", () => {
    const crossTabData = {
      "Mountain View": { "Housed": 10, "Unhoused": 5 },
      "San Jose": { "Housed": 20, "Unhoused": 15 },
      "Palo Alto": { "Housed": 8, "Unhoused": 3 },
    };

    render(
      <StackedBarCard
        title="Housing by City"
        subtitle="Status distribution"
        crossTabData={crossTabData}
      />,
    );

    const chart = screen.getByTestId("bar-chart");
    expect(chart).toHaveTextContent("Categories: 3"); // 3 cities
    expect(chart).toHaveTextContent("Datasets: 2"); // 2 housing statuses
  });

  it("handles empty crossTabData gracefully", () => {
    render(
      <StackedBarCard
        title="Empty Chart"
        subtitle="No data"
        crossTabData={{}}
      />,
    );

    const chart = screen.getByTestId("bar-chart");
    expect(chart).toHaveTextContent("Categories: 0");
    expect(chart).toHaveTextContent("Datasets: 0");
  });

  it("handles null crossTabData gracefully", () => {
    render(
      <StackedBarCard
        title="Null Chart"
        subtitle="Null data"
        crossTabData={null}
      />,
    );

    const chart = screen.getByTestId("bar-chart");
    expect(chart).toHaveTextContent("Categories: 0");
  });

  it("extracts all unique subcategories across categories", () => {
    const crossTabData = {
      "City A": { "Type 1": 5, "Type 2": 10 },
      "City B": { "Type 2": 8, "Type 3": 12 },
      "City C": { "Type 1": 3, "Type 3": 7 },
    };

    render(
      <StackedBarCard
        title="Test"
        subtitle="Test"
        crossTabData={crossTabData}
      />,
    );

    const chart = screen.getByTestId("bar-chart");
    // Should have 3 unique subcategories: Type 1, Type 2, Type 3
    expect(chart).toHaveTextContent("Datasets: 3");
  });
});
