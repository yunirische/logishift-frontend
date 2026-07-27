import { render, screen } from "@testing-library/react";
import { TrendsChart } from "../TrendsChart";
import { AnalyticsTrend } from "../../../types";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-bar-chart">{children}</div>
  ),
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

const trend = (
  date: string,
  shiftsCount: number = 1
): AnalyticsTrend => ({
  date,
  shifts_count: shiftsCount,
  hours_worked: shiftsCount * 8,
  salary_paid: shiftsCount * 1000,
});

describe("TrendsChart sparse demo data", () => {
  it("shows the compact low-data state instead of a large chart for one point", () => {
    render(
      <TrendsChart
        data={[trend("2026-07-27")]}
        days={30}
        showLowDataState
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "Недостаточно данных для динамики",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "В демо пока мало завершённых смен. Графики заполняются по мере накопления данных."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("analytics-trends-chart")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("recharts-bar-chart")).not.toBeInTheDocument();
  });

  it("keeps the existing chart when at least two distinct valid dates exist", () => {
    render(
      <TrendsChart
        data={[trend("2026-07-26"), trend("2026-07-27", 2)]}
        days={30}
        showLowDataState
      />
    );

    expect(screen.getByTestId("analytics-trends-chart")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-bar-chart")).toBeInTheDocument();
    expect(
      screen.queryByText("Недостаточно данных для динамики")
    ).not.toBeInTheDocument();
  });
});
