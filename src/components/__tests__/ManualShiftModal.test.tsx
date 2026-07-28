import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManualShiftModal from "../ManualShiftModal";
import api from "../../services/api";
import { API_ENDPOINTS } from "../../constants";

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe("ManualShiftModal copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockImplementation((endpoint: string) => {
      if (endpoint === API_ENDPOINTS.DRIVERS) {
        return Promise.resolve([
          { id: 17, full_name: "Иван Петров", role: "driver", current_state: "idle" },
        ]);
      }
      if (endpoint === API_ENDPOINTS.TRUCKS) {
        return Promise.resolve([
          { id: 21, name: "КамАЗ", plate: "А123АА", is_busy: false, is_active: true },
        ]);
      }
      if (endpoint === API_ENDPOINTS.SITES) {
        return Promise.resolve([
          { id: 31, name: "Склад", is_active: true, odometer_required: false },
        ]);
      }
      return Promise.resolve([]);
    });
  });

  it("uses human-facing labels while keeping the existing numeric payload", async () => {
    mockApi.post.mockResolvedValue({ success: true });
    const onSave = vi.fn();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <ManualShiftModal
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        timezone="Europe/Moscow"
      />
    );

    expect(
      screen.getByRole("heading", { name: /Создать смену за водителя/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Назначьте свободному водителю машину и объект.")
    ).toBeInTheDocument();
    expect(screen.getByText("Свободный водитель")).toBeInTheDocument();

    await screen.findByRole("option", { name: "Иван Петров" });
    expect(screen.queryByText(/ID: 17/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Водитель \(idle\)/)).not.toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "17" } });
    fireEvent.change(selects[1], { target: { value: "21" } });
    fireEvent.change(selects[2], { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: /Создать смену$/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(API_ENDPOINTS.MANUAL_SHIFT, {
        driver_id: 17,
        truck_id: 21,
        site_id: 31,
      });
    });
    alertSpy.mockRestore();
  });
});
