import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DemoProductTour from "../DemoProductTour";

const TourHarness = ({
  initialTab = "dashboard",
  onStartDriverScenario = vi.fn(),
}: {
  initialTab?: string;
  onStartDriverScenario?: () => void;
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <>
      <div data-testid="active-tab">{activeTab}</div>
      <button type="button" onClick={() => setActiveTab("fleet")}>
        Open outside tour
      </button>
      <DemoProductTour
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onStartDriverScenario={onStartDriverScenario}
      />
    </>
  );
};

describe("DemoProductTour", () => {
  it("shows a compact owner aha-moment and advances only on explicit action", async () => {
    const user = userEvent.setup();
    render(<TourHarness />);

    expect(screen.getByTestId("active-tab")).toHaveTextContent("dashboard");
    expect(screen.getByTestId("demo-product-tour-progress")).toHaveTextContent(
      "Обзор 1 из 4"
    );
    expect(screen.getByTestId("demo-product-tour-owner-preview")).toHaveTextContent(
      "Иван Петров · Scania R450 · Карьер Южный · Активна"
    );

    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByTestId("active-tab")).toHaveTextContent("shifts");
    expect(screen.getByTestId("demo-product-tour-progress")).toHaveTextContent(
      "Обзор 2 из 4"
    );
    expect(
      screen.getByText(
        "Здесь собраны статусы, время, фотографии и комментарии по всем сменам."
      )
    ).toBeInTheDocument();
  });

  it("walks through real sections and offers the optional driver scenario", async () => {
    const user = userEvent.setup();
    const onStartDriverScenario = vi.fn();
    render(
      <TourHarness onStartDriverScenario={onStartDriverScenario} />
    );

    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(screen.getByTestId("active-tab")).toHaveTextContent("objects");
    expect(screen.getByText("Из чего состоит смена")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(screen.getByTestId("active-tab")).toHaveTextContent("analytics");
    expect(screen.getByRole("button", { name: "Закончить обзор" })).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Закончить обзор" })
    );
    expect(screen.getByText("Обзор закончен")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Посмотреть, как водитель отмечает смену",
      })
    );
    expect(onStartDriverScenario).toHaveBeenCalledTimes(1);
  });

  it("keeps skip prominent and preserves a small scenario launcher", async () => {
    const user = userEvent.setup();
    render(<TourHarness />);

    const skip = screen.getByRole("button", { name: "Пропустить обзор" });
    expect(skip).toBeVisible();
    expect(skip).toHaveClass("border-blue-300", "bg-blue-50", "font-bold");

    await user.click(skip);
    await user.click(screen.getByRole("button", { name: "Остаться в кабинете" }));

    expect(screen.getByTestId("demo-product-tour-launcher")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Посмотреть сценарий водителя" })
    ).toBeVisible();
  });

  it("stops showing step copy after manual navigation outside the tour", async () => {
    const user = userEvent.setup();
    render(<TourHarness />);

    await user.click(screen.getByRole("button", { name: "Open outside tour" }));

    expect(screen.getByTestId("active-tab")).toHaveTextContent("fleet");
    expect(screen.queryByTestId("demo-product-tour")).not.toBeInTheDocument();
    expect(screen.getByTestId("demo-product-tour-launcher")).toBeInTheDocument();
  });

  it("is inline rather than sticky or modal", () => {
    render(<TourHarness />);

    expect(screen.getByTestId("demo-product-tour")).not.toHaveClass(
      "sticky",
      "fixed"
    );
  });
});
