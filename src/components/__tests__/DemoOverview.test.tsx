import { fireEvent, render, screen, within } from "@testing-library/react";
import DemoOverview from "../DemoOverview";
import { recordCurrentDemoFunnelEvent } from "../../lib/demoFunnelEvents";

vi.mock("../../lib/demoFunnelEvents", () => ({
  recordCurrentDemoFunnelEvent: vi.fn().mockResolvedValue(undefined),
}));

it("shows one prepared story without starting a workflow or firing callbacks on mount/rerender", () => {
  const props = { onTryScenario: vi.fn(), onExploreCabinet: vi.fn(), registrationHref: "/register", onRegistrationClick: vi.fn() };
  const { rerender } = render(<DemoOverview {...props} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Одна смена — две стороны");
  expect(screen.getByText("Демо LogiShift · Пример")).toBeVisible();
  const scenes = within(screen.getByRole("list", { name: "Как действие водителя становится записью смены" })).getAllByRole("listitem").filter(item => item.parentElement?.tagName === "OL");
  expect(scenes).toHaveLength(3);
  for (const value of ["Алексей Смирнов", "КамАЗ 65115", "ЖК Северный"]) {
    expect(scenes[0]).toHaveTextContent(value);
    expect(scenes[2]).toHaveTextContent(value);
  }
  expect(screen.getByTestId("demo-overview-result")).toHaveTextContent("09:00");
  expect(screen.getByTestId("demo-overview-result")).toHaveTextContent("На смене");
  expect(screen.getByText("Фото начала приложено")).toBeVisible();
  expect(screen.getByText("Фото и документы можно запрашивать по настройкам объекта.")).toBeVisible();
  expect(screen.queryByText(/Ожидается фото/)).not.toBeInTheDocument();
  const illustration = screen.getByTestId("demo-overview-start-illustration");
  expect(illustration.tagName).toBe("DIV");
  expect(illustration).not.toHaveAttribute("tabindex");
  expect(screen.queryByRole("button", { name: "Начать смену" })).not.toBeInTheDocument();
  fireEvent.click(illustration);
  rerender(<DemoOverview {...props} />);
  expect(recordCurrentDemoFunnelEvent).toHaveBeenCalledExactlyOnceWith("demo_overview_shown");
  for (const callback of [props.onTryScenario, props.onExploreCabinet, props.onRegistrationClick]) expect(callback).not.toHaveBeenCalled();
  expect(screen.queryByTestId("demo-scenario-entry")).not.toBeInTheDocument();
  expect(screen.queryByTestId("demo-scenario-guide")).not.toBeInTheDocument();
  expect(screen.queryByTestId("demo-product-tour")).not.toBeInTheDocument();
  expect(document.querySelector("[data-synthetic-shift-id]")).toBeNull();
});

it("offers three explicit paths and invokes only the selected callback", () => {
  const props = { onTryScenario: vi.fn(), onExploreCabinet: vi.fn(), registrationHref: "https://app.kontrolsmen.ru/register?registration_source=demo", onRegistrationClick: vi.fn() };
  render(<DemoOverview {...props} />);
  const paths = screen.getByRole("navigation", { name: "Что посмотреть дальше" });
  expect(within(paths).getAllByRole("button")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Попробовать самому" }));
  expect(props.onTryScenario).toHaveBeenCalledTimes(1);
  expect(props.onExploreCabinet).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Посмотреть настоящий кабинет" }));
  expect(props.onExploreCabinet).toHaveBeenCalledTimes(1);
  const registration = screen.getByRole("link", { name: "Создать свою компанию" });
  expect(registration).toHaveAttribute("href", props.registrationHref);
  registration.addEventListener("click", event => event.preventDefault(), { once: true });
  fireEvent.click(registration);
  expect(props.onRegistrationClick).toHaveBeenCalledTimes(1);
});
