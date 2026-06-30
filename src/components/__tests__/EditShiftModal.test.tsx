import { render, screen, waitFor } from "@testing-library/react";
import EditShiftModal from "../EditShiftModal";

const { mockApiGet, mockApiPatch, mockApiPost, mockGetUserInfo } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPatch: vi.fn(),
  mockApiPost: vi.fn(),
  mockGetUserInfo: vi.fn(),
}));

vi.mock("../../config/demo", () => ({
  isDemoTenantId: vi.fn(() => true),
}));

vi.mock("../../services/api", () => ({
  default: {
    get: mockApiGet,
    patch: mockApiPatch,
    post: mockApiPost,
  },
  getUserInfo: mockGetUserInfo,
  openShiftFilePreview: vi.fn(),
}));

const baseShift = {
  id: 101,
  status: "finished",
  driver_name: "Иван Петров",
  truck_name: "КамАЗ 65115",
  site_name: "ЖК Северный",
  start_time: "2026-06-28T05:00:00.000Z",
  end_time: "2026-06-28T13:30:00.000Z",
  hours_worked: 8.5,
  salary: 5525,
  is_excluded: false,
  comment: "",
};

describe("EditShiftModal demo mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ timezone: "Europe/Moscow", invoice_required: true });
    mockGetUserInfo.mockReturnValue({
      id: 999,
      tenant_id: 999,
      role: "admin",
      current_state: "idle",
      full_name: "Демо Администратор",
    });
  });

  it("disables visible admin mutation actions in demo mode with explanatory text", async () => {
    render(
      <EditShiftModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        shift={{ ...baseShift, status: "active", end_time: undefined } as any}
        timezone="Europe/Moscow"
        timezoneLoaded
      />
    );

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
    const actionButtons = screen.getAllByTitle("В демо-режиме изменение данных недоступно");
    expect(actionButtons.length).toBeGreaterThan(0);
    actionButtons.forEach((button) => expect(button).toBeDisabled());
    expect(screen.getByText("В демо-режиме изменение данных недоступно")).toBeInTheDocument();
  });
});
