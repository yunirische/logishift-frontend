import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DriverView } from "../DriverView";
import { API_ENDPOINTS } from "../../constants";

const {
  mockUseAuth,
  mockApiGet,
  mockApiPost,
  mockApiPostFormData,
  mockGetCurrentShift,
  mockOpenShiftFilePreview,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockApiPostFormData: vi.fn(),
  mockGetCurrentShift: vi.fn(),
  mockOpenShiftFilePreview: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../services/api", () => ({
  default: {
    get: mockApiGet,
    post: mockApiPost,
    postFormData: mockApiPostFormData,
  },
  getCurrentShift: mockGetCurrentShift,
  openShiftFilePreview: mockOpenShiftFilePreview,
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
    mockApiPostFormData.mockResolvedValue({ message: "Фото добавлено" });
    mockOpenShiftFilePreview.mockResolvedValue(undefined);
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

  it("shows photo backfill controls only for missing required photos and submits multipart payload", async () => {
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
            proof_requirements: { start: true, end: true, invoice: false },
            photos: { start: true, end: false, invoice: false },
            photo_start_url: "/uploads/16/2026/06/start.jpg",
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
            proof_requirements: { start: true, end: true, invoice: false },
            photos: { start: true, end: true, invoice: false },
            photo_start_url: "/uploads/16/2026/06/start.jpg",
            photo_end_url: "/uploads/16/2026/06/end.jpg",
            comment: "",
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

    render(<DriverView focusHistory />);

    await screen.findByText(/Фотографии смены/i);
    expect(screen.getByText(/1 из 2 загружено/i)).toBeInTheDocument();
    expect(screen.getByText(/Одометр перед началом/i)).toBeInTheDocument();
    expect(screen.getByText(/Одометр после завершения/i)).toBeInTheDocument();
    expect(screen.getByText(/Накладная/i)).toBeInTheDocument();
    expect(screen.getByText(/Есть фото/i)).toBeInTheDocument();
    expect(screen.getByText(/Фото отсутствует/i)).toBeInTheDocument();
    expect(screen.getByText(/Не требовалась/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Заменить/i })).not.toBeInTheDocument();

    const addButton = screen.getByRole("button", { name: /^Добавить$/i });
    expect(addButton).toHaveAttribute("aria-expanded", "false");
    expect(addButton).toHaveAttribute("aria-controls");
    fireEvent.click(addButton);

    const reasonTextarea = await screen.findByPlaceholderText(
      /Почему фото добавляется после завершения смены/i
    );
    const uploadButton = screen.getByRole("button", { name: /Загрузить/i });
    expect(addButton).toHaveAttribute("aria-expanded", "true");

    expect(uploadButton).toBeDisabled();

    const file = new File(["image"], "odo-end.jpg", { type: "image/jpeg" });
    fireEvent.change(reasonTextarea, { target: { value: " Дозагружаю обязательное фото " } });
    fireEvent.change(screen.getByLabelText(/Выбрать фото/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(uploadButton).not.toBeDisabled();
    });

    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockApiPostFormData).toHaveBeenCalledTimes(1);
    });

    const [url, formData] = mockApiPostFormData.mock.calls[0];
    expect(url).toBe(API_ENDPOINTS.SHIFT_PHOTO_BACKFILL(113));
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("type")).toBe("end");
    expect(formData.get("reason")).toBe("Дозагружаю обязательное фото");
    expect(formData.get("photo")).toBe(file);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Почему фото добавляется после завершения смены/i)).not.toBeInTheDocument();
    });
    expect(screen.getAllByText(/Есть фото/i).length).toBeGreaterThan(0);
  });

  it("blocks invalid files, keeps one form open, and opens existing secure previews", async () => {
    mockGetCurrentShift.mockResolvedValue(null);
    mockApiGet.mockImplementation((url: string) => {
      if (url === API_ENDPOINTS.TENANT_SETTINGS) {
        return Promise.resolve({ timezone: "Europe/Moscow" });
      }

      if (url === "/trucks" || url === "/sites") {
        return Promise.resolve([]);
      }

      if (url === "/shifts?driver_id=33&status=finished&limit=20") {
        return Promise.resolve({
          data: [
            {
              id: 113,
              user_id: 33,
              status: "finished",
              truck_name: "КАМАЗ",
              site_name: "Объект 1",
              start_time: "2026-06-27T13:32:00.000Z",
              end_time: "2026-06-27T13:32:46.000Z",
              proof_requirements: { start: true, end: true, invoice: true },
              photos: { start: true, end: false, invoice: false },
              photo_start_url: "/uploads/16/2026/06/start.jpg",
              comment: "",
            },
          ],
        });
      }

      return Promise.resolve([]);
    });

    render(<DriverView focusHistory />);
    await screen.findByText(/Одометр перед началом/i);

    fireEvent.click(screen.getByRole("button", { name: /Открыть/i }));

    await waitFor(() => {
      expect(mockOpenShiftFilePreview).toHaveBeenCalledWith(113, "start");
    });

    const addButtons = screen.getAllByRole("button", { name: /^Добавить$/i });
    fireEvent.click(addButtons[0]);
    expect(
      await screen.findByPlaceholderText(/Почему фото добавляется после завершения смены/i)
    ).toBeInTheDocument();

    fireEvent.click(addButtons[1]);
    expect(screen.getAllByPlaceholderText(/Почему фото добавляется после завершения смены/i)).toHaveLength(1);

    const invalidFile = new File(["pdf"], "invoice.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText(/Выбрать фото/i), {
      target: { files: [invalidFile] },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Загрузить/i })).toBeDisabled();
    });
    expect(mockApiPostFormData).not.toHaveBeenCalled();
  });

  it("cancels and clears the inline form for missing photo", async () => {
    mockGetCurrentShift.mockResolvedValue(null);
    mockApiGet.mockImplementation((url: string) => {
      if (url === API_ENDPOINTS.TENANT_SETTINGS) {
        return Promise.resolve({ timezone: "Europe/Moscow" });
      }

      if (url === "/trucks" || url === "/sites") {
        return Promise.resolve([]);
      }

      if (url === "/shifts?driver_id=33&status=finished&limit=20") {
        return Promise.resolve({
          data: [
            {
              id: 113,
              user_id: 33,
              status: "finished",
              truck_name: "КАМАЗ",
              site_name: "Объект 1",
              start_time: "2026-06-27T13:32:00.000Z",
              end_time: "2026-06-27T13:32:46.000Z",
              proof_requirements: { start: true, end: true, invoice: false },
              photos: { start: true, end: false, invoice: false },
              comment: "",
            },
          ],
        });
      }

      return Promise.resolve([]);
    });

    render(<DriverView focusHistory />);
    await screen.findByText(/Одометр после завершения/i);

    fireEvent.click(screen.getByRole("button", { name: /^Добавить$/i }));
    const reasonField = await screen.findByPlaceholderText(
      /Почему фото добавляется после завершения смены/i
    );
    fireEvent.change(reasonField, { target: { value: "Дозагрузка" } });
    fireEvent.click(screen.getByRole("button", { name: /Отмена/i }));

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText(/Почему фото добавляется после завершения смены/i)
      ).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Добавить$/i }));
    expect(
      await screen.findByPlaceholderText(/Почему фото добавляется после завершения смены/i)
    ).toHaveValue("");
  });

  it("shows backend conflict errors for finished photo backfill", async () => {
    mockGetCurrentShift.mockResolvedValue(null);
    mockApiGet.mockImplementation((url: string) => {
      if (url === API_ENDPOINTS.TENANT_SETTINGS) {
        return Promise.resolve({ timezone: "Europe/Moscow" });
      }

      if (url === "/trucks" || url === "/sites") {
        return Promise.resolve([]);
      }

      if (url === "/shifts?driver_id=33&status=finished&limit=20") {
        return Promise.resolve({
          data: [
            {
              id: 113,
              user_id: 33,
              status: "finished",
              truck_name: "КАМАЗ",
              site_name: "Объект 1",
              start_time: "2026-06-27T13:32:00.000Z",
              end_time: "2026-06-27T13:32:46.000Z",
              proof_requirements: { start: true, end: true, invoice: false },
              photos: { start: true, end: false, invoice: false },
              comment: "",
            },
          ],
        });
      }

      return Promise.resolve([]);
    });
    mockApiPostFormData.mockRejectedValueOnce(new Error("Фото уже добавлено"));

    render(<DriverView focusHistory />);
    await screen.findByText(/Одометр после завершения/i);

    fireEvent.click(screen.getByRole("button", { name: /^Добавить$/i }));
    fireEvent.change(
      await screen.findByPlaceholderText(
        /Почему фото добавляется после завершения смены/i
      ),
      { target: { value: "Дозагружаю обязательное фото" } }
    );
    const file = new File(["image"], "odo-end.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/Выбрать фото/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Загрузить/i }));

    await waitFor(() => {
      expect(mockApiPostFormData).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.getByPlaceholderText(/Почему фото добавляется после завершения смены/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Заменить/i })).not.toBeInTheDocument();
  });
});
