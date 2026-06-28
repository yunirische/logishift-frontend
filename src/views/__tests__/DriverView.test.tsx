import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    expect(screen.getByTestId("end-shift-button")).toBeInTheDocument();
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

    expect(await screen.findByTestId("driver-shift-message")).toHaveTextContent(
      /комментарий сохранен\./i
    );
    await screen.findByText(/\[27\.06 16:34 Driver\]: Новый комментарий/i);
  });

  it("shows the disabled start helper once and does not render the duplicate status block by default", async () => {
    mockGetCurrentShift.mockResolvedValueOnce(null);

    render(<DriverView />);

    expect(await screen.findByTestId("start-shift-button")).toBeDisabled();
    expect(
      screen.getAllByText(/Выберите машину и объект, чтобы начать смену\./i)
    ).toHaveLength(1);
    expect(screen.getByTestId("start-shift-disabled-reason")).toBeInTheDocument();
    expect(screen.queryByTestId("driver-shift-message")).not.toBeInTheDocument();
    expect(screen.getByTestId("driver-action-bar-shell")).toBeInTheDocument();
    expect(screen.getByTestId("driver-action-bar-column")).toBeInTheDocument();
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

    const ownCard = await screen.findByTestId("driver-history-card-113");
    const otherCard = screen.getByTestId("driver-history-card-114");

    expect(screen.queryByRole("button", { name: /все свернуть/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /раскрыть смену #114/i })).not.toBeInTheDocument();
    expect(within(ownCard).getByText(/^Смена$/i)).toBeInTheDocument();
    expect(within(otherCard).getByText(/^Смена$/i)).toBeInTheDocument();
    expect(within(ownCard).queryByText(/Смена #/i)).not.toBeInTheDocument();
    expect(within(otherCard).queryByText(/Смена #/i)).not.toBeInTheDocument();
    expect(within(ownCard).getByTestId("driver-history-header-113")).toBeInTheDocument();
    expect(within(ownCard).getByTestId("driver-history-summary-113")).toBeInTheDocument();
    expect(within(ownCard).getByTestId("driver-history-machine-113")).toBeInTheDocument();
    expect(within(ownCard).getByTestId("driver-history-object-113")).toBeInTheDocument();
    expect(within(ownCard).getByTestId("driver-history-action-113")).toBeInTheDocument();
    expect(within(ownCard).getByText(/КАМАЗ/i)).toBeInTheDocument();
    expect(within(ownCard).getByText(/Объект 1/i)).toBeInTheDocument();
    expect(
      within(ownCard).queryByText(/\[27\.06 16:33 Admin\]: Так решил админ/i)
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /подробнее/i })).toHaveLength(2);

    fireEvent.click(within(ownCard).getByRole("button", { name: /подробнее/i }));

    expect(await within(ownCard).findByText(/\[27\.06 16:33 Admin\]: Так решил админ/i)).toBeInTheDocument();
    expect(within(otherCard).queryByTestId("driver-history-details-114")).not.toBeInTheDocument();
    expect(within(ownCard).getByRole("button", { name: /добавить комментарий/i })).toBeInTheDocument();

    fireEvent.click(within(ownCard).getByRole("button", { name: /добавить комментарий/i }));
    const textarea = await within(ownCard).findByPlaceholderText(/добавьте пояснение к смене/i);
    const submitButton = within(ownCard).getByRole("button", {
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

    await within(ownCard).findByText(/\[27\.06 16:34 Driver\]: Добавляю пояснение/i);
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

    const card = await screen.findByTestId("driver-history-card-113");
    expect(within(card).getByText(/^Смена$/i)).toBeInTheDocument();
    expect(within(card).queryByText(/Смена #/i)).not.toBeInTheDocument();
    expect(within(card).getAllByText(/27 июня/i).length).toBeGreaterThan(0);
    expect(within(card).getAllByText(/Меньше 1 минуты/i).length).toBeGreaterThan(0);
    expect(within(card).queryByText(/Фотографии смены/i)).not.toBeInTheDocument();

    const detailsButton = within(card).getByRole("button", { name: /подробнее/i });
    expect(detailsButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(detailsButton);
    expect(detailsButton).toHaveAttribute("aria-expanded", "true");

    expect(await within(card).findByText(/Фотографии смены/i)).toBeInTheDocument();
    expect(within(card).getByText(/1 из 2 загружено/i)).toBeInTheDocument();
    expect(within(card).getByText(/Одометр перед началом/i)).toBeInTheDocument();
    expect(within(card).getByText(/Одометр после завершения/i)).toBeInTheDocument();
    expect(within(card).getByText(/Накладная/i)).toBeInTheDocument();
    expect(within(card).getByText(/Есть фото/i)).toBeInTheDocument();
    expect(within(card).getByText(/Фото отсутствует/i)).toBeInTheDocument();
    expect(within(card).getByText(/Не требовалась/i)).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /Заменить/i })).not.toBeInTheDocument();

    const addButton = within(card).getByRole("button", { name: /^Добавить$/i });
    expect(addButton).toHaveAttribute("aria-expanded", "false");
    expect(addButton).toHaveAttribute("aria-controls");
    fireEvent.click(addButton);

    const reasonTextarea = await within(card).findByPlaceholderText(
      /Почему фото добавляется после завершения смены/i
    );
    const uploadButton = within(card).getByRole("button", { name: /Загрузить/i });
    expect(addButton).toHaveAttribute("aria-expanded", "true");

    expect(uploadButton).toBeDisabled();

    const file = new File(["image"], "odo-end.jpg", { type: "image/jpeg" });
    fireEvent.change(reasonTextarea, { target: { value: " Дозагружаю обязательное фото " } });
    fireEvent.change(within(card).getByLabelText(/Выбрать фото/i), {
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
      expect(within(card).queryByPlaceholderText(/Почему фото добавляется после завершения смены/i)).not.toBeInTheDocument();
    });
    expect(within(card).getAllByText(/Есть фото/i).length).toBeGreaterThan(0);
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
    const card = await screen.findByTestId("driver-history-card-113");
    fireEvent.click(within(card).getByRole("button", { name: /подробнее/i }));
    await within(card).findByText(/Одометр перед началом/i);

    fireEvent.click(within(card).getByRole("button", { name: /Открыть/i }));

    await waitFor(() => {
      expect(mockOpenShiftFilePreview).toHaveBeenCalledWith(113, "start");
    });

    const addButtons = within(card).getAllByRole("button", { name: /^Добавить$/i });
    fireEvent.click(addButtons[0]);
    expect(
      await within(card).findByPlaceholderText(/Почему фото добавляется после завершения смены/i)
    ).toBeInTheDocument();

    fireEvent.click(addButtons[1]);
    expect(within(card).getAllByPlaceholderText(/Почему фото добавляется после завершения смены/i)).toHaveLength(1);

    const invalidFile = new File(["pdf"], "invoice.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(within(card).getByLabelText(/Выбрать фото/i), {
      target: { files: [invalidFile] },
    });

    await waitFor(() => {
      expect(within(card).getByRole("button", { name: /Загрузить/i })).toBeDisabled();
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
    const card = await screen.findByTestId("driver-history-card-113");
    fireEvent.click(within(card).getByRole("button", { name: /подробнее/i }));
    await within(card).findByText(/Одометр после завершения/i);

    fireEvent.click(within(card).getByRole("button", { name: /^Добавить$/i }));
    const reasonField = await within(card).findByPlaceholderText(
      /Почему фото добавляется после завершения смены/i
    );
    fireEvent.change(reasonField, { target: { value: "Дозагрузка" } });
    fireEvent.click(within(card).getByRole("button", { name: /Отмена/i }));

    await waitFor(() => {
      expect(
        within(card).queryByPlaceholderText(/Почему фото добавляется после завершения смены/i)
      ).not.toBeInTheDocument();
    });

    fireEvent.click(within(card).getByRole("button", { name: /^Добавить$/i }));
    expect(
      await within(card).findByPlaceholderText(/Почему фото добавляется после завершения смены/i)
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
    const card = await screen.findByTestId("driver-history-card-113");
    fireEvent.click(within(card).getByRole("button", { name: /подробнее/i }));
    await within(card).findByText(/Одометр после завершения/i);

    fireEvent.click(within(card).getByRole("button", { name: /^Добавить$/i }));
    fireEvent.change(
      await within(card).findByPlaceholderText(
        /Почему фото добавляется после завершения смены/i
      ),
      { target: { value: "Дозагружаю обязательное фото" } }
    );
    const file = new File(["image"], "odo-end.jpg", { type: "image/jpeg" });
    fireEvent.change(within(card).getByLabelText(/Выбрать фото/i), {
      target: { files: [file] },
    });
    fireEvent.click(within(card).getByRole("button", { name: /Загрузить/i }));

    await waitFor(() => {
      expect(mockApiPostFormData).toHaveBeenCalledTimes(1);
    });
    expect(
      within(card).getByPlaceholderText(/Почему фото добавляется после завершения смены/i)
    ).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /Заменить/i })).not.toBeInTheDocument();
  });

  it("uses normalized object copy in the driver selection UI", async () => {
    mockGetCurrentShift.mockResolvedValueOnce(null);

    render(<DriverView />);

    expect(await screen.findByText(/Выберите объект/i)).toBeInTheDocument();
    expect(screen.queryByText(/Объект \/ площадка/i)).not.toBeInTheDocument();
  });
});
