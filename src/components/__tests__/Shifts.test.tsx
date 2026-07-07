import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Shifts from "../Shifts";
import { API_ENDPOINTS } from "../../constants";

const {
  mockApiGet,
  mockGetUserInfo,
  mockGetAuthToken,
  mockOpenShiftFilePreview,
} = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockGetUserInfo: vi.fn(),
  mockGetAuthToken: vi.fn(),
  mockOpenShiftFilePreview: vi.fn(),
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
