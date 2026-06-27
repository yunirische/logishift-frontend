import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DriverView } from "../DriverView";
import { API_ENDPOINTS } from "../../constants";

const {
  mockUseAuth,
  mockApiGet,
  mockApiPost,
  mockGetCurrentShift,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockGetCurrentShift: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../services/api", () => ({
  default: {
    get: mockApiGet,
    post: mockApiPost,
  },
  getCurrentShift: mockGetCurrentShift,
}));

describe("DriverView comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 16,
        full_name: "Тестовый водитель",
        role: "driver",
        current_state: "active",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockApiGet.mockImplementation((url: string) => {
      if (url === API_ENDPOINTS.TENANT_SETTINGS) {
        return Promise.resolve({ timezone: "Europe/Moscow" });
      }

      if (url === "/trucks") {
        return Promise.resolve([]);
      }

      if (url === "/sites") {
        return Promise.resolve([]);
      }

      return Promise.resolve([]);
    });
  });

  it("submits a comment for the active shift and refreshes the current shift", async () => {
    mockGetCurrentShift
      .mockResolvedValueOnce({
        id: 113,
        status: "active",
        start_time: "2026-06-27T13:32:00.000Z",
        truck: { name: "КАМАЗ" },
        site: { name: "Объект 1" },
        comment: "",
      })
      .mockResolvedValueOnce({
        id: 113,
        status: "active",
        start_time: "2026-06-27T13:32:00.000Z",
        truck: { name: "КАМАЗ" },
        site: { name: "Объект 1" },
        comment: "[27.06 16:34 Driver]: Новый комментарий",
      });
    mockApiPost.mockResolvedValue({ success: true });

    render(<DriverView />);

    const textarea = await screen.findByPlaceholderText(
      /добавьте комментарий к текущей смене/i
    );
    const button = screen.getByRole("button", {
      name: /добавить комментарий/i,
    });

    expect(button).toBeDisabled();

    fireEvent.change(textarea, { target: { value: " Новый комментарий " } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        API_ENDPOINTS.ADD_SHIFT_COMMENT(113),
        { text: "Новый комментарий" }
      );
    });

    await screen.findByText(/\[27\.06 16:34 Driver\]: Новый комментарий/i);
  });

  it("shows existing finished comments, allows commenting own shift, and hides controls for unrelated shifts", async () => {
    mockGetCurrentShift.mockResolvedValue(null);

    const historyResponses = [
      {
        data: [
          {
            id: 113,
            user_id: 33,
            status: "finished",
            truck_name: "КАМАЗ",
            site_name: "Объект 1",
            start_time: "2026-06-27T13:32:00.000Z",
            end_time: "2026-06-27T13:32:46.000Z",
            comment: "[27.06 16:33 Admin]: Так решил админ",
          },
          {
            id: 114,
            user_id: 99,
            status: "finished",
            truck_name: "MAN",
            site_name: "Объект 2",
            start_time: "2026-06-27T14:00:00.000Z",
            end_time: "2026-06-27T14:01:18.000Z",
            comment: "",
          },
        ],
      },
      {
        data: [
          {
            id: 113,
            user_id: 33,
            status: "finished",
            truck_name: "КАМАЗ",
            site_name: "Объект 1",
            start_time: "2026-06-27T13:32:00.000Z",
            end_time: "2026-06-27T13:32:46.000Z",
            comment:
              "[27.06 16:33 Admin]: Так решил админ\n[27.06 16:34 Driver]: Добавляю пояснение",
          },
        ],
      },
    ];

    mockApiGet.mockImplementation((url: string) => {
      if (url === API_ENDPOINTS.TENANT_SETTINGS) {
        return Promise.resolve({ timezone: "Europe/Moscow" });
      }

      if (url === "/trucks" || url === "/sites") {
        return Promise.resolve([]);
      }

      if (url === "/shifts?driver_id=33&status=finished&limit=20") {
        return Promise.resolve(historyResponses.shift());
      }

      return Promise.resolve([]);
    });
    mockApiPost.mockResolvedValue({ success: true });

    render(<DriverView focusHistory />);

    await screen.findByText(/\[27\.06 16:33 Admin\]: Так решил админ/i);
    expect(screen.getAllByRole("button", { name: /добавить комментарий/i })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /добавить комментарий/i }));
    const textarea = await screen.findByPlaceholderText(/добавьте пояснение к смене/i);
    const submitButton = screen.getByRole("button", {
      name: /добавить комментарий/i,
    });

    expect(submitButton).toBeDisabled();

    fireEvent.change(textarea, { target: { value: "Добавляю пояснение" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        API_ENDPOINTS.ADD_SHIFT_COMMENT(113),
        { text: "Добавляю пояснение" }
      );
    });

    await screen.findByText(/\[27\.06 16:34 Driver\]: Добавляю пояснение/i);
  });
});
