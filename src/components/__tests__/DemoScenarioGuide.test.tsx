import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DemoScenarioGuide, {
  selectLatestSyntheticFinishedShift,
} from "../DemoScenarioGuide";
import { DemoScenarioShift, DemoSessionState } from "../../lib/demoSession";
import { captureDemoRegistrationHandoff } from "../../lib/demoRegistrationHandoff";

const { mockUseDemoSession, mockRecordCurrentDemoFunnelEvent } = vi.hoisted(() => ({
  mockUseDemoSession: vi.fn(),
  mockRecordCurrentDemoFunnelEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../context/DemoSessionContext", () => ({
  useDemoSession: () => mockUseDemoSession(),
}));

vi.mock("../../lib/demoFunnelEvents", () => ({
  recordCurrentDemoFunnelEvent: mockRecordCurrentDemoFunnelEvent,
  recordDemoRegistrationCtaClick: vi.fn(),
}));

const createShift = (
  overrides: Partial<DemoScenarioShift> = {}
): DemoScenarioShift => ({
  id: "demo-shift:guide",
  driverId: 7,
  driverName: "Алексей Смирнов",
  truckId: 11,
  truckName: "КамАЗ 65115",
  truckPlate: "А123АА",
  siteId: 22,
  siteName: "ЖК Северный",
  siteAddress: "Северная улица",
  startedAt: "2026-07-27T10:00:00.000Z",
  finishedAt: null,
  status: "active",
  odometerRequired: true,
  invoiceRequired: true,
  comment: null,
  photos: {},
  ...overrides,
});

const setSession = ({
  activeShift = null,
  finishedShifts = [],
}: Partial<DemoSessionState> = {}) => {
  mockUseDemoSession.mockReturnValue({
    activeShift,
    finishedShifts,
  });
};

const renderGuide = ({
  persona = "admin",
  activeTab = persona === "driver" ? "my-shifts" : "dashboard",
  setDemoPersona = vi.fn(),
  setActiveTab = vi.fn(),
  showDemoShiftInRegistry = vi.fn(),
}: {
  persona?: "admin" | "driver";
  activeTab?: string;
  setDemoPersona?: ReturnType<typeof vi.fn>;
  setActiveTab?: ReturnType<typeof vi.fn>;
  showDemoShiftInRegistry?: ReturnType<typeof vi.fn>;
} = {}) => ({
  setDemoPersona,
  setActiveTab,
  showDemoShiftInRegistry,
  ...render(
    <DemoScenarioGuide
      demoPersona={persona}
      activeTab={activeTab}
      setDemoPersona={setDemoPersona}
      setActiveTab={setActiveTab}
      showDemoShiftInRegistry={showDemoShiftInRegistry}
    />
  ),
});

describe("DemoScenarioGuide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setSession();
  });

  it("keeps the fallback step 1 driver transition without recording funnel progress", async () => {
    const user = userEvent.setup();
    const setDemoPersona = vi.fn();
    renderGuide({ setDemoPersona });

    expect(screen.getByTestId("demo-scenario-guide")).toBeInTheDocument();
    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 1 из 4"
    );
    expect(
      screen.getByText(
        "Переключитесь в режим водителя и начните тестовую смену."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("demo-guide-owner-preview")).not.toBeInTheDocument();
    expect(screen.getByTestId("demo-scenario-guide")).not.toHaveAttribute(
      "data-synthetic-shift-id"
    );

    await user.click(
      screen.getByRole("button", {
        name: "Посмотреть, как водитель отмечает смену",
      })
    );

    expect(setDemoPersona).toHaveBeenCalledTimes(1);
    expect(setDemoPersona).toHaveBeenCalledWith("driver");
    expect(mockRecordCurrentDemoFunnelEvent).not.toHaveBeenCalled();
  });

  it("shows confirmed seeded labels on step 2 without starting a shift", () => {
    const setDemoPersona = vi.fn();
    const setActiveTab = vi.fn();
    renderGuide({
      persona: "driver",
      setDemoPersona,
      setActiveTab,
    });

    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 1 из 4"
    );
    expect(
      screen.getByText(
        "Выберите КамАЗ 65115 и объект «ЖК Северный», затем начните смену."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Перейти к выбору" })
    ).toHaveAttribute("href", "#demo-driver-selection");
    expect(setDemoPersona).not.toHaveBeenCalled();
    expect(setActiveTab).not.toHaveBeenCalled();
    expect(mockRecordCurrentDemoFunnelEvent).not.toHaveBeenCalled();
  });

  it.each([
    {
      status: "awaiting_odo_start" as const,
      comment: null,
      step: "Шаг 2 из 4",
      text: "Добавьте фото одометра перед началом.",
      action: "Перейти к фотографии",
    },
    {
      status: "active" as const,
      comment: null,
      step: "Шаг 2 из 4",
      text: "Добавьте короткий комментарий к смене.",
      action: "Перейти к комментарию",
    },
    {
      status: "awaiting_odo_end" as const,
      comment: "Готово",
      step: "Шаг 4 из 4",
      text: "Добавьте фото одометра после работы.",
      action: "Перейти к фотографии",
    },
    {
      status: "awaiting_invoice" as const,
      comment: "Готово",
      step: "Шаг 4 из 4",
      text: "Добавьте фотографию накладной.",
      action: "Перейти к фотографии",
    },
  ])(
    "maps $status to the current workflow instruction",
    ({ status, comment, step, text, action }) => {
      setSession({ activeShift: createShift({ status, comment }) });
      renderGuide({ persona: "driver" });

      expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(step);
      expect(screen.getByText(text)).toBeInTheDocument();
      if (status !== "active") {
        expect(
          screen.getByText(
            "Требования к фото задаются в настройках объекта. Администратор может сделать обязательными, например, фото одометра до и после смены или накладную."
          )
        ).toBeInTheDocument();
      }
      expect(screen.getByRole("link", { name: action })).toBeInTheDocument();
    }
  );

  it("opens the admin Dashboard when an active shift has a comment", async () => {
    const user = userEvent.setup();
    const setDemoPersona = vi.fn();
    setSession({
      activeShift: createShift({ comment: "Комментарий водителя" }),
    });
    renderGuide({ persona: "driver", setDemoPersona });

    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 2 из 4"
    );
    await user.click(
      screen.getByRole("button", { name: "Посмотреть как администратор" })
    );

    expect(setDemoPersona).toHaveBeenCalledTimes(1);
    expect(setDemoPersona).toHaveBeenCalledWith("admin");
  });

  it("guides an admin to the exact registry row before returning to the driver", async () => {
    const user = userEvent.setup();
    const setDemoPersona = vi.fn();
    const showDemoShiftInRegistry = vi.fn();
    const shift = createShift({ comment: "Комментарий водителя" });
    setSession({ activeShift: shift });
    const { rerender } = renderGuide({
      persona: "admin",
      setDemoPersona,
      showDemoShiftInRegistry,
    });

    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 3 из 4"
    );
    const summary = screen.getByTestId("demo-guide-shift-summary");
    expect(summary).toHaveTextContent("Алексей Смирнов");
    expect(summary).toHaveTextContent("КамАЗ 65115");
    expect(summary).toHaveTextContent("ЖК Северный");
    expect(summary).toHaveTextContent("Активна");
    await waitFor(() =>
      expect(mockRecordCurrentDemoFunnelEvent).toHaveBeenCalledWith(
        "demo_owner_result_shown"
      )
    );

    expect(
      screen.getByText(
        "Администратор видит смену в реестре, может открыть её, проверить фотографии и комментарий, изменить данные, завершить или отменить смену."
      )
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Показать в реестре" })
    );
    expect(showDemoShiftInRegistry).toHaveBeenCalledWith(shift.id);
    expect(setDemoPersona).not.toHaveBeenCalled();

    rerender(
      <DemoScenarioGuide
        demoPersona="admin"
        activeTab="shifts"
        setDemoPersona={setDemoPersona}
        setActiveTab={vi.fn()}
        showDemoShiftInRegistry={showDemoShiftInRegistry}
      />
    );
    expect(
      screen.getByText(
        "Откройте «Подробнее» у демонстрационной смены, затем вернитесь к водителю для завершения."
      )
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Вернуться к водителю и завершить",
      })
    );
    expect(setDemoPersona).toHaveBeenCalledWith("driver");

    rerender(
      <DemoScenarioGuide
        demoPersona="driver"
        activeTab="my-shifts"
        setDemoPersona={setDemoPersona}
        setActiveTab={vi.fn()}
        showDemoShiftInRegistry={showDemoShiftInRegistry}
      />
    );
    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 4 из 4"
    );
    expect(
      screen.getByText(
        "Завершите смену и добавьте обязательные фотографии."
      )
    ).toBeInTheDocument();
  });

  it("records the result only for a visible expanded admin summary", async () => {
    const shift = createShift({ comment: "Комментарий водителя" });
    setSession({ activeShift: shift });
    const { rerender } = renderGuide({ persona: "driver" });

    expect(mockRecordCurrentDemoFunnelEvent).not.toHaveBeenCalled();

    rerender(
      <DemoScenarioGuide
        demoPersona="admin"
        activeTab="dashboard"
        setDemoPersona={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(mockRecordCurrentDemoFunnelEvent).toHaveBeenCalledWith(
        "demo_owner_result_shown"
      )
    );

    mockRecordCurrentDemoFunnelEvent.mockClear();
    await userEvent.setup().click(
      screen.getByRole("button", { name: "Свернуть" })
    );
    expect(screen.queryByTestId("demo-guide-shift-summary")).not.toBeInTheDocument();
    expect(mockRecordCurrentDemoFunnelEvent).not.toHaveBeenCalled();
  });

  it("does not record a role switch without a synthetic shift", () => {
    const { rerender } = renderGuide({ persona: "driver" });

    rerender(
      <DemoScenarioGuide
        demoPersona="admin"
        activeTab="dashboard"
        setDemoPersona={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );

    expect(mockRecordCurrentDemoFunnelEvent).not.toHaveBeenCalled();
  });

  it("waits for a collapsed summary to be expanded before recording it", async () => {
    const { rerender } = renderGuide({ persona: "admin" });
    await userEvent.setup().click(
      screen.getByRole("button", { name: "Свернуть" })
    );
    setSession({ activeShift: createShift({ comment: "Комментарий водителя" }) });

    rerender(
      <DemoScenarioGuide
        demoPersona="admin"
        activeTab="dashboard"
        setDemoPersona={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );
    expect(screen.queryByTestId("demo-guide-shift-summary")).not.toBeInTheDocument();
    expect(mockRecordCurrentDemoFunnelEvent).not.toHaveBeenCalled();

    await userEvent.setup().click(
      screen.getByRole("button", { name: "Развернуть" })
    );
    await waitFor(() =>
      expect(mockRecordCurrentDemoFunnelEvent).toHaveBeenCalledWith(
        "demo_owner_result_shown"
      )
    );
  });

  it("offers the admin result to a driver and completes only for synthetic history", async () => {
    const user = userEvent.setup();
    const setDemoPersona = vi.fn();
    const setActiveTab = vi.fn();
    captureDemoRegistrationHandoff({
      explicitEntry: true,
      search: "?utm_source=yandex&yclid=click",
    });
    const finished = createShift({
      status: "finished",
      finishedAt: "2026-07-27T11:00:00.000Z",
      comment: "Готово",
    });
    setSession({ finishedShifts: [finished] });
    const { rerender } = renderGuide({
      persona: "driver",
      setDemoPersona,
    });

    await user.click(
      screen.getByRole("button", {
        name: "Посмотреть результат у администратора",
      })
    );
    expect(setDemoPersona).toHaveBeenCalledWith("admin");

    rerender(
      <DemoScenarioGuide
        demoPersona="admin"
        activeTab="dashboard"
        setDemoPersona={setDemoPersona}
        setActiveTab={setActiveTab}
      />
    );
    expect(
      screen.getByRole("heading", { name: "Сценарий завершён" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 4 из 4"
    );
    expect(
      screen.getByText("Перейдите к работе со своими данными.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "На бесплатном тарифе доступны 2 машины, 2 объекта и 2 водителя."
      )
    ).toBeInTheDocument();
    const registrationLink = screen.getByRole("link", {
      name: "Создать свою компанию",
    });
    const registrationUrl = new URL(
      registrationLink.getAttribute("href") as string
    );
    expect(`${registrationUrl.origin}${registrationUrl.pathname}`).toBe(
      "https://app.kontrolsmen.ru/register"
    );
    expect(registrationUrl.searchParams.get("registration_source")).toBe(
      "demo"
    );
    expect(registrationUrl.searchParams.get("utm_source")).toBe("yandex");
    expect(registrationUrl.searchParams.get("yclid")).toBe("click");
    expect(registrationUrl.searchParams.has("demo_session")).toBe(false);
    expect(registrationUrl.hash).toMatch(
      /^#demo_session=[A-Za-z0-9_-]{43}$/
    );

    await user.click(
      screen.getByRole("button", { name: "Посмотреть завершённую смену" })
    );
    expect(setActiveTab).toHaveBeenCalledWith("shifts");

    setSession({
      finishedShifts: [finished, createShift({ id: "42", status: "finished" })],
    });
    rerender(
      <DemoScenarioGuide
        demoPersona="admin"
        activeTab="dashboard"
        setDemoPersona={setDemoPersona}
        setActiveTab={setActiveTab}
      />
    );
    expect(screen.getByTestId("demo-scenario-guide")).toHaveAttribute(
      "data-synthetic-shift-id",
      finished.id
    );
  });

  it("keeps the conversion action visible when a completed guide is collapsed", async () => {
    const user = userEvent.setup();
    setSession({
      finishedShifts: [
        createShift({
          status: "finished",
          finishedAt: "2026-07-27T12:00:00.000Z",
        }),
      ],
    });
    renderGuide();

    const collapse = screen.getByRole("button", { name: "Свернуть" });
    collapse.focus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByTestId("demo-guide-collapsed-registration-action")
    ).toHaveAccessibleName("Создать свою компанию");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Развернуть" })
    );
  });

  it("does not complete from a seeded finished row alone", () => {
    setSession({
      finishedShifts: [
        createShift({
          id: "91",
          status: "finished",
          finishedAt: "2026-07-27T12:00:00.000Z",
        }),
      ],
    });
    renderGuide();

    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 1 из 4"
    );
    expect(
      screen.queryByRole("heading", { name: "Сценарий завершён" })
    ).not.toBeInTheDocument();
  });

  it("derives reload and reset states without persisting a numeric step", () => {
    setSession({
      activeShift: createShift({
        status: "awaiting_invoice",
        comment: "Сохранено",
      }),
    });
    const { rerender } = renderGuide({ persona: "driver" });
    expect(screen.getByText("Добавьте фотографию накладной.")).toBeInTheDocument();

    setSession({
      finishedShifts: [
        createShift({
          status: "finished",
          finishedAt: "2026-07-27T12:00:00.000Z",
        }),
      ],
    });
    rerender(
      <DemoScenarioGuide
        demoPersona="admin"
        activeTab="dashboard"
        setDemoPersona={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );
    expect(
      screen.getByRole("heading", { name: "Сценарий завершён" })
    ).toBeInTheDocument();

    setSession();
    rerender(
      <DemoScenarioGuide
        demoPersona="admin"
        activeTab="dashboard"
        setDemoPersona={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );
    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 1 из 4"
    );
    expect(
      Object.keys(localStorage).some((key) => /guide.*step|step.*guide/i.test(key))
    ).toBe(false);
  });

  it("uses the latest valid synthetic finished shift", () => {
    const older = createShift({
      id: "demo-shift:older",
      status: "finished",
      finishedAt: "2026-07-27T11:00:00.000Z",
    });
    const newer = createShift({
      id: "demo-shift:newer",
      status: "finished",
      finishedAt: "2026-07-27T12:00:00.000Z",
    });

    expect(
      selectLatestSyntheticFinishedShift([
        older,
        createShift({ id: "77", status: "finished" }),
        newer,
      ])?.id
    ).toBe(newer.id);
  });

  it("exposes a polite live region and keyboard-operable collapse control", async () => {
    const user = userEvent.setup();
    renderGuide();

    expect(screen.getByTestId("demo-guide-current-step")).toHaveAttribute(
      "aria-live",
      "polite"
    );
    const collapse = screen.getByRole("button", { name: "Свернуть" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");

    collapse.focus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: "Развернуть" })
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("demo-guide-current-step")).not.toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(screen.getByTestId("demo-guide-current-step")).toBeInTheDocument();
  });

  it("uses compact spacing before the small-screen breakpoint", () => {
    renderGuide();

    expect(screen.getByTestId("demo-scenario-guide")).toHaveClass(
      "mb-4",
      "px-3",
      "py-2.5",
      "sm:mb-5",
      "sm:px-4",
      "sm:py-3"
    );
  });

  it("stays sticky below the app header without becoming modal", () => {
    renderGuide();

    const guide = screen.getByTestId("demo-scenario-guide");
    expect(guide).toHaveClass(
      "sticky",
      "top-[5.25rem]",
      "z-20",
      "max-h-[calc(100vh-5.75rem)]",
      "overflow-y-auto"
    );
    expect(guide).not.toHaveAttribute("aria-modal");
  });
});
