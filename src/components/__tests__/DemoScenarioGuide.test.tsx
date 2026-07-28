import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DemoScenarioGuide, {
  selectLatestSyntheticFinishedShift,
} from "../DemoScenarioGuide";
import { DemoScenarioShift, DemoSessionState } from "../../lib/demoSession";
import { captureDemoRegistrationHandoff } from "../../lib/demoRegistrationHandoff";

const { mockUseDemoSession } = vi.hoisted(() => ({
  mockUseDemoSession: vi.fn(),
}));

vi.mock("../../context/DemoSessionContext", () => ({
  useDemoSession: () => mockUseDemoSession(),
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
}: {
  persona?: "admin" | "driver";
  activeTab?: string;
  setDemoPersona?: ReturnType<typeof vi.fn>;
  setActiveTab?: ReturnType<typeof vi.fn>;
} = {}) => ({
  setDemoPersona,
  setActiveTab,
  ...render(
    <DemoScenarioGuide
      demoPersona={persona}
      activeTab={activeTab}
      setDemoPersona={setDemoPersona}
      setActiveTab={setActiveTab}
    />
  ),
});

describe("DemoScenarioGuide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setSession();
  });

  it("starts on step 1 for an admin and opens the existing driver transition", async () => {
    const user = userEvent.setup();
    const setDemoPersona = vi.fn();
    renderGuide({ setDemoPersona });

    expect(screen.getByTestId("demo-scenario-guide")).toBeInTheDocument();
    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 1 из 5"
    );
    expect(
      screen.getByText(
        "Переключитесь в режим водителя и начните тестовую смену."
      )
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Открыть режим водителя" })
    );

    expect(setDemoPersona).toHaveBeenCalledTimes(1);
    expect(setDemoPersona).toHaveBeenCalledWith("driver");
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
      "Шаг 2 из 5"
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
  });

  it.each([
    {
      status: "awaiting_odo_start" as const,
      comment: null,
      step: "Шаг 3 из 5",
      text: "Добавьте фото одометра перед началом.",
      action: "Перейти к фотографии",
    },
    {
      status: "active" as const,
      comment: null,
      step: "Шаг 3 из 5",
      text: "Добавьте короткий комментарий к смене.",
      action: "Перейти к комментарию",
    },
    {
      status: "awaiting_odo_end" as const,
      comment: "Готово",
      step: "Шаг 5 из 5",
      text: "Добавьте фото одометра после работы.",
      action: "Перейти к фотографии",
    },
    {
      status: "awaiting_invoice" as const,
      comment: "Готово",
      step: "Шаг 5 из 5",
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
      "Шаг 3 из 5"
    );
    await user.click(
      screen.getByRole("button", { name: "Посмотреть как администратор" })
    );

    expect(setDemoPersona).toHaveBeenCalledTimes(1);
    expect(setDemoPersona).toHaveBeenCalledWith("admin");
  });

  it("shows an active shift summary to admin and continues to driver step 5", async () => {
    const user = userEvent.setup();
    const setDemoPersona = vi.fn();
    const shift = createShift({ comment: "Комментарий водителя" });
    setSession({ activeShift: shift });
    const { rerender } = renderGuide({
      persona: "admin",
      setDemoPersona,
    });

    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 4 из 5"
    );
    const summary = screen.getByTestId("demo-guide-shift-summary");
    expect(summary).toHaveTextContent("Алексей Смирнов");
    expect(summary).toHaveTextContent("КамАЗ 65115");
    expect(summary).toHaveTextContent("ЖК Северный");
    expect(summary).toHaveTextContent("Активна");

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
      />
    );
    expect(screen.getByTestId("demo-guide-progress")).toHaveTextContent(
      "Шаг 5 из 5"
    );
    expect(
      screen.getByText(
        "Завершите смену и добавьте обязательные фотографии."
      )
    ).toBeInTheDocument();
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
      "Шаг 5 из 5"
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
      "Шаг 1 из 5"
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
      "Шаг 1 из 5"
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
});
