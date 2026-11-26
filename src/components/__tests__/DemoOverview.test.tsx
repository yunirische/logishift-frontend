import { fireEvent, render, screen } from "@testing-library/react";
import DemoOverview from "../DemoOverview";
import { DemoSessionProvider } from "../../context/DemoSessionContext";
import { readDemoSession } from "../../lib/demoSession";
import { recordCurrentDemoFunnelEvent } from "../../lib/demoFunnelEvents";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({user: {tenant_id: 999}}) }));
vi.mock("../../lib/demoFunnelEvents", () => ({recordCurrentDemoFunnelEvent: vi.fn().mockResolvedValue(undefined)}));

it("shows a sample without starting a shift, resumes the selected industry and retains the completed record on replay", () => {
  localStorage.clear();
  const props = { onExploreCabinet: vi.fn(), registrationHref: "/register", onRegistrationClick: vi.fn() };
  const mount = () => render(<DemoSessionProvider><DemoOverview {...props}/></DemoSessionProvider>);
  const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
  const first = mount();
  expect(screen.getByText("Пример готового отчёта")).toBeVisible();
  expect(readDemoSession(localStorage).activeShift).toBeNull();
  expect(recordCurrentDemoFunnelEvent).not.toHaveBeenCalledWith("demo_owner_result_shown");
  click("Автовышка");
  click("Начать смену");
  expect(screen.queryByRole("figure")).toBeNull();
  click("Добавить образец фото");
  first.unmount();
  mount();
  expect(screen.getByRole("img", {name:"Покрытие фасада восстановлено"})).toBeVisible();
  click("Завершить смену");
  const [shift] = readDemoSession(localStorage).finishedShifts;
  expect(shift.exampleId).toBe("facade");
  expect(Date.parse(shift.finishedAt!) - Date.parse(shift.startedAt)).toBe(270 * 60_000);
  expect(recordCurrentDemoFunnelEvent).toHaveBeenCalledWith("demo_scenario_completed");
  click("Повторить демонстрацию");
  expect(screen.getByText("Пример готового отчёта")).toBeVisible();
  expect(readDemoSession(localStorage).finishedShifts).toHaveLength(1);
  click("Изучить кабинет");
  expect(props.onExploreCabinet).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("link", {name:"Начать бесплатно"})).toHaveAttribute("href","/register");
});
