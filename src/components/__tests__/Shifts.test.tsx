import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Shifts from "../Shifts";
import { API_ENDPOINTS } from "../../constants";

const {
  mockApiGet,
  mockGetUserInfo,
  mockGetAuthToken,
  mockOpenShiftFilePreview,
  mockUseDemoSession,
  mockGetDemoPhotoPreview,
} = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockGetUserInfo: vi.fn(),
  mockGetAuthToken: vi.fn(),
  mockOpenShiftFilePreview: vi.fn(),
  mockUseDemoSession: vi.fn(),
  mockGetDemoPhotoPreview: vi.fn(),
}));

vi.mock("../../config/demo", () => ({
  isDemoTenantId: vi.fn((tenantId?: number | null) => tenantId === 999),
}));

vi.mock("../../services/api", () => ({
  default: {
    get: mockApiGet,
    getUserInfo: mockGetUserInfo,
    getAuthToken: mockGetAuthToken,
  },
  openShiftFilePreview: mockOpenShiftFilePreview,
}));

vi.mock("../../context/DemoSessionContext", () => ({
  useDemoSession: () => mockUseDemoSession(),
}));

beforeEach(() => {
  mockUseDemoSession.mockReturnValue({
    activeShift: null,
    finishedShifts: [],
    getDemoPhotoPreview: mockGetDemoPhotoPreview,
  });
});

describe("Shifts demo ZIP export", () => {
  const originalFetch = global.fetch;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  let anchorClickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserInfo.mockReturnValue({
      id: 1,
      tenant_id: 999,
      role: "admin",
      full_name: "Демо Администратор",
    });
    mockGetAuthToken.mockReturnValue("demo-token");
    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint === API_ENDPOINTS.TENANT_SETTINGS) {
        return Promise.resolve({ timezone: "Europe/Moscow" });
      }
      if (endpoint === API_ENDPOINTS.DRIVERS) {
        return Promise.resolve([]);
      }
      if (endpoint === API_ENDPOINTS.TRUCKS) {
        return Promise.resolve([]);
      }
      if (endpoint === API_ENDPOINTS.SITES) {
        return Promise.resolve([]);
      }
      if (endpoint.startsWith(`${API_ENDPOINTS.SHIFTS}?`)) {
        return Promise.resolve({ data: [], total: 0 });
      }
      return Promise.resolve([]);
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn((header: string) =>
          header === "Content-Disposition"
            ? 'attachment; filename="shift_photos_demo.zip"'
            : "application/zip"
        ),
      },
      blob: vi.fn().mockResolvedValue(new Blob(["zip"])),
    } as any);
    URL.createObjectURL = vi.fn(() => "blob:test-url");
    URL.revokeObjectURL = vi.fn();
    anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    anchorClickSpy.mockRestore();
  });

  it("keeps the demo ZIP button enabled and uses the standard GET export endpoint", async () => {
    render(<Shifts />);

    const zipButton = await screen.findByRole("button", {
      name: "Выгрузить фото ZIP",
    });

    expect(zipButton).toBeEnabled();

    fireEvent.click(zipButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(API_ENDPOINTS.REPORTS_PHOTOS_ZIP),
        expect.objectContaining({
          headers: { Authorization: "Bearer demo-token" },
        })
      );
    });
  });
});

describe("Shifts cancelled visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserInfo.mockReturnValue({
      id: 1,
      tenant_id: 1,
      role: "admin",
      full_name: "Администратор",
    });
    mockGetAuthToken.mockReturnValue("admin-token");
    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint === API_ENDPOINTS.TENANT_SETTINGS) {
        return Promise.resolve({ timezone: "Europe/Moscow" });
      }
      if (endpoint === API_ENDPOINTS.DRIVERS) {
        return Promise.resolve([]);
      }
      if (endpoint === API_ENDPOINTS.TRUCKS) {
        return Promise.resolve([]);
      }
      if (endpoint === API_ENDPOINTS.SITES) {
        return Promise.resolve([]);
      }
      if (endpoint.startsWith(`${API_ENDPOINTS.SHIFTS}?`)) {
        const url = new URL(endpoint);
        const accounting = url.searchParams.get("accounting");
        if (accounting === "all") {
          return Promise.resolve({
            data: [
              {
                id: 42,
                driver_name: "Иван Петров",
                truck_name: "КамАЗ",
                site_name: "База",
                status: "cancelled",
                is_excluded: true,
                exclusion_reason: "Водитель ошибочно начал вторую смену",
                created_at: "2026-07-07T09:00:00.000Z",
              },
            ],
            total: 1,
          });
        }
        return Promise.resolve({ data: [], total: 0 });
      }
      return Promise.resolve([]);
    });
  });

  it("adds a quick toggle that switches the shifts query to accounting=all", async () => {
    render(<Shifts />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining(`${API_ENDPOINTS.SHIFTS}?`)
      );
    });

    expect(
      mockApiGet.mock.calls.some(
        ([endpoint]) =>
          typeof endpoint === "string" &&
          endpoint.startsWith(`${API_ENDPOINTS.SHIFTS}?`) &&
          endpoint.includes("accounting=included")
      )
    ).toBe(true);

    fireEvent.click(
      await screen.findByRole("button", { name: "Показать отмененные" })
    );

    await waitFor(() => {
      expect(
        mockApiGet.mock.calls.some(
          ([endpoint]) =>
            typeof endpoint === "string" &&
            endpoint.startsWith(`${API_ENDPOINTS.SHIFTS}?`) &&
            endpoint.includes("accounting=all")
        )
      ).toBe(true);
    });
  });

  it("shows cancelled rows with a visible reason when the quick toggle is enabled", async () => {
    render(<Shifts />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Показать отмененные" })
    );

    expect(await screen.findByText("ОТМЕНЕНА")).toBeInTheDocument();
    expect(
      screen.getByText("Причина: Водитель ошибочно начал вторую смену")
    ).toBeInTheDocument();
    expect(screen.getByText("НЕ УЧИТЫВАТЬ")).toBeInTheDocument();
  });
});

describe("Shifts demo session projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserInfo.mockReturnValue({
      id: 1,
      tenant_id: 999,
      role: "admin",
      full_name: "Демо Администратор",
    });
    mockGetAuthToken.mockReturnValue("demo-token");
    mockUseDemoSession.mockReturnValue({
      activeShift: {
        id: "demo-shift:active",
        driverId: 77,
        driverName: "Демо Водитель",
        truckId: 12,
        truckName: "КамАЗ",
        siteId: 31,
        siteName: "Склад",
        startedAt: "2026-07-26T10:00:00.000Z",
        finishedAt: null,
        status: "active",
        odometerRequired: false,
        invoiceRequired: false,
        comment: null,
        photos: {
          start: {
            type: "start",
            fileName: "active-meter.jpg",
            mimeType: "image/jpeg",
            size: 123,
            addedAt: "2026-07-26T10:01:00.000Z",
          },
        },
      },
      finishedShifts: [
        {
          id: "demo-shift:finished",
          driverId: 77,
          driverName: "Демо Водитель",
          truckId: 12,
          truckName: "КамАЗ",
          siteId: 31,
          siteName: "Склад",
          startedAt: "2026-07-26T08:00:00.000Z",
          finishedAt: "2026-07-26T09:00:00.000Z",
          status: "finished",
          odometerRequired: false,
          invoiceRequired: false,
          comment: null,
          photos: {
            invoice: {
              type: "invoice",
              fileName: "finished-invoice.jpg",
              mimeType: "image/jpeg",
              size: 456,
              addedAt: "2026-07-26T08:30:00.000Z",
            },
          },
        },
      ],
      getDemoPhotoPreview: mockGetDemoPhotoPreview,
    });
    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint === API_ENDPOINTS.TENANT_SETTINGS) {
        return Promise.resolve({ timezone: "Europe/Moscow" });
      }
      if (
        endpoint === API_ENDPOINTS.DRIVERS ||
        endpoint === API_ENDPOINTS.TRUCKS ||
        endpoint === API_ENDPOINTS.SITES
      ) {
        return Promise.resolve([]);
      }
      if (endpoint.startsWith(`${API_ENDPOINTS.SHIFTS}?`)) {
        return Promise.resolve({
          data: [
            {
              id: 42,
              driver_name: "Seeded Driver",
              truck_name: "MAN",
              site_name: "База",
              status: "finished",
              start_time: "2026-07-25T08:00:00.000Z",
              end_time: "2026-07-25T09:00:00.000Z",
            },
          ],
          total: 1,
        });
      }
      return Promise.resolve([]);
    });
  });

  it("shows active and finished synthetic rows alongside seeded server rows", async () => {
    render(<Shifts />);

    expect(
      await screen.findByText(
        "Все смены компании: активные, завершённые и созданные администратором."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Созданная в демо смена хранится только в браузере и не входит в экспорт."
      )
    ).toBeInTheDocument();
    expect(await screen.findByText("#demo-shift:active")).toBeInTheDocument();
    expect(screen.getByText("#demo-shift:finished")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getAllByText("Демонстрационная смена")).toHaveLength(2);
    expect(screen.getByText("АКТИВНА")).toBeInTheDocument();
    expect(screen.getAllByText("ЗАВЕРШЕНА")).toHaveLength(2);
  });

  it("labels synthetic demo photos by their metadata type", async () => {
    render(<Shifts />);

    expect(
      await screen.findByRole("button", {
        name: "Проверить демонстрационное фото: Одометр до смены — active-meter.jpg",
      })
    ).toHaveTextContent("Одометр до смены");
    expect(
      screen.getByRole("button", {
        name: "Проверить демонстрационное фото: Накладная — finished-invoice.jpg",
      })
    ).toHaveTextContent("Накладная");
  });

  it("does not expose edit/write actions for synthetic rows", async () => {
    render(<Shifts />);

    const syntheticRow = (await screen.findByText("#demo-shift:active")).closest(
      "tr"
    );
    expect(syntheticRow).not.toBeNull();
    expect(
      (syntheticRow as HTMLElement).querySelector('button[title="Редактировать"]')
    ).toBeNull();
    expect(
      within(syntheticRow as HTMLElement).getByText("Без действий")
    ).toBeInTheDocument();
  });

  it("opens only the memory-local synthetic preview and never the server preview", async () => {
    mockGetDemoPhotoPreview.mockImplementation(
      (shiftId: string, type: string) =>
        shiftId === "demo-shift:active" && type === "start"
          ? { url: "blob:active", fileName: "active-meter.jpg" }
          : null
    );
    render(<Shifts />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Проверить демонстрационное фото: Одометр до смены — active-meter.jpg",
      })
    );

    expect(
      screen.getByRole("dialog", { name: "Локальное демонстрационное фото" })
    ).toBeInTheDocument();
    expect(mockOpenShiftFilePreview).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Закрыть предпросмотр фотографии",
      })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a metadata-only placeholder after simulated reload", async () => {
    mockGetDemoPhotoPreview.mockReturnValue(null);
    render(<Shifts />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Проверить демонстрационное фото: Накладная — finished-invoice.jpg",
      })
    );

    expect(
      screen.getByText(
        "Демонстрационное фото добавлено, локальный предпросмотр завершён после перезагрузки."
      )
    ).toBeInTheDocument();
    expect(mockOpenShiftFilePreview).not.toHaveBeenCalled();
  });
});
