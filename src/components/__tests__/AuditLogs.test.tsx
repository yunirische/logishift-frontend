import { render, screen, waitFor } from "@testing-library/react";
import AuditLogs from "../AuditLogs";
import { API_ENDPOINTS } from "../../constants";

const { mockApiRequest } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
}));

vi.mock("../../services/api", () => ({
  apiRequest: mockApiRequest,
}));

describe("AuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders cancelled actions without substring truncation and shows compact details", async () => {
    mockApiRequest.mockResolvedValue([
      {
        id: 1,
        action_display: "Смена отменена",
        performed_by: "Администратор",
        timestamp: "2026-07-07T10:00:00.000Z",
        details: JSON.stringify({
          reason: "Ошибка в создании смены",
          before: { status: "active" },
          after: { status: "cancelled" },
          driver_id: 7,
        }),
      },
    ]);

    render(<AuditLogs />);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(API_ENDPOINTS.AUDIT);
    });

    expect(await screen.findByText("Смена отменена")).toBeInTheDocument();
    expect(screen.queryByText("ена отменена")).not.toBeInTheDocument();
    expect(screen.getByText("Причина: Ошибка в создании смены")).toBeInTheDocument();
    expect(screen.getByText("Статус: Активна -> Отменена")).toBeInTheDocument();
    expect(screen.getByText("Водитель #7")).toBeInTheDocument();
  });

  it("keeps unknown action labels as-is and hides the dead CSV export button", async () => {
    mockApiRequest.mockResolvedValue([
      {
        id: 2,
        action_display: "Нестандартное действие",
        performed_by: "Система",
        timestamp: "2026-07-07T11:00:00.000Z",
        details: "",
      },
    ]);

    render(<AuditLogs />);

    expect(await screen.findByText("Нестандартное действие")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Экспорт CSV" })).not.toBeInTheDocument();
  });
});
