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
