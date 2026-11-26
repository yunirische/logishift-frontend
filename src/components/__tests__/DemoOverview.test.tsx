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


vi.mock("../../lib/demoPhotoSample", () => ({
  createDemoPhotoSample: vi.fn(async (type: string) => new File(["sample"], "demo-" + type + ".png", { type: "image/png" })),
}));

it("allows optional object requirements and records all proofs with the same conditional time", async () => {
  localStorage.clear();
  vi.stubGlobal("URL", Object.assign(class extends URL {}, {
    createObjectURL: vi.fn(() => "blob:demo"),
    revokeObjectURL: vi.fn(),
  }));
  try {
    const props = { onExploreCabinet: vi.fn(), registrationHref: "/register", onRegistrationClick: vi.fn() };
    const { unmount } = render(<DemoSessionProvider><DemoOverview {...props}/></DemoSessionProvider>);
    const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Одометр" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Накладная" }));
    click("Начать смену");
    expect(readDemoSession(localStorage).activeShift?.status).toBe("awaiting_odo_start");
    expect(screen.getByRole("checkbox", { name: "Одометр" })).toBeDisabled();
    click("Добавить одометр до");
    await screen.findByRole("button", { name: "Добавить образец фото" });
    click("Добавить образец фото");
    click("Завершить смену");
    expect(readDemoSession(localStorage).activeShift?.status).toBe("awaiting_odo_end");
    click("Добавить одометр после");
    await screen.findByRole("button", { name: "Добавить накладную" });
    click("Добавить накладную");
    await screen.findByRole("button", { name: "Повторить демонстрацию" });
    const [shift] = readDemoSession(localStorage).finishedShifts;
    expect(shift.workSampleAdded).toBe(true);
    expect(Object.keys(shift.photos).sort()).toEqual(["end", "invoice", "start"]);
    expect(Date.parse(shift.finishedAt!) - Date.parse(shift.startedAt)).toBe(270 * 60_000);
    unmount();
  } finally {
    vi.unstubAllGlobals();
  }
});


it("shows mobile work as a named object and switches editable proof defaults by industry", () => {
  localStorage.clear();
  const props = { onExploreCabinet: vi.fn(), registrationHref: "/register", onRegistrationClick: vi.fn() };
  render(<DemoSessionProvider><DemoOverview {...props}/></DemoSessionProvider>);
  const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
  const odometer = screen.getByRole("checkbox", { name: "Одометр" });
  const invoice = screen.getByRole("checkbox", { name: "Накладная" });
  expect(screen.getByText(/Разные адреса\?/)).toBeVisible();
  expect(odometer).not.toBeChecked();
  expect(invoice).not.toBeChecked();
  click("Грузоперевозки");
  expect(odometer).toBeChecked();
  expect(invoice).toBeChecked();
  fireEvent.click(invoice);
  expect(invoice).not.toBeChecked();
  click("Земляные работы");
  expect(screen.getByText(/Постоянная площадка\?/)).toBeVisible();
  expect(odometer).not.toBeChecked();
  expect(invoice).not.toBeChecked();
  click("Автовышка");
  expect(screen.getByText("Выезды автовышки", { exact: false, selector: "span" })).toBeVisible();
  click("Начать смену");
  expect(readDemoSession(localStorage).activeShift?.siteName).toBe("Выезды автовышки");
  expect(readDemoSession(localStorage).activeShift?.odometerRequired).toBe(false);
  expect(odometer).toBeDisabled();
});
