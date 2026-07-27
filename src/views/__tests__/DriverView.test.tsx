import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DriverView } from "../DriverView";
import { API_ENDPOINTS } from "../../constants";
import { UserRole } from "../../types";

const {
  mockUseAuth,
  mockApiGet,
  mockApiPost,
  mockApiPostFormData,
  mockGetCurrentShift,
  mockOpenShiftFilePreview,
  mockUseDemoSession,
  mockStartDemoShift,
  mockFinishDemoShift,
  mockAddDemoShiftComment,
  mockAddDemoShiftPhoto,
  mockGetDemoPhotoPreview,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockApiPostFormData: vi.fn(),
  mockGetCurrentShift: vi.fn(),
  mockOpenShiftFilePreview: vi.fn(),
  mockUseDemoSession: vi.fn(),
  mockStartDemoShift: vi.fn(),
  mockFinishDemoShift: vi.fn(),
  mockAddDemoShiftComment: vi.fn(),
  mockAddDemoShiftPhoto: vi.fn(),
  mockGetDemoPhotoPreview: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../context/DemoSessionContext", () => ({
  useDemoSession: () => mockUseDemoSession(),
}));

vi.mock("../../services/api", () => ({
  default: {
    get: mockApiGet,
    post: mockApiPost,
    postFormData: mockApiPostFormData,
    getAuthToken: vi.fn(() => "test-token"),
  },
  getCurrentShift: mockGetCurrentShift,
  openShiftFilePreview: mockOpenShiftFilePreview,
}));

describe("DriverView comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
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
    mockUseDemoSession.mockReturnValue({
      activeShift: null,
      finishedShifts: [],
      startDemoShift: mockStartDemoShift,
      requestDemoShiftFinish: mockFinishDemoShift,
      finishDemoShift: mockFinishDemoShift,
      addDemoShiftComment: mockAddDemoShiftComment,
      addDemoShiftPhoto: mockAddDemoShiftPhoto,
      getDemoPhotoPreview: mockGetDemoPhotoPreview,
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

  it("keeps the existing start API flow for a real tenant", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 16,
        full_name: "Тестовый водитель",
        role: UserRole.DRIVER,
        current_state: "idle",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockGetCurrentShift.mockResolvedValue(null);
    mockApiPost.mockResolvedValue({ success: true });
    mockApiGet.mockImplementation((url: string) => {
      if (url === API_ENDPOINTS.TENANT_SETTINGS) {
        return Promise.resolve({ timezone: "Europe/Moscow" });
      }
      if (url === "/trucks") {
        return Promise.resolve([{ id: 12, name: "КамАЗ" }]);
      }
      if (url === "/sites") {
        return Promise.resolve([{ id: 31, name: "Склад" }]);
      }
      return Promise.resolve([]);
    });

    render(<DriverView />);

    fireEvent.click(await screen.findByRole("button", { name: /КамАЗ/i }));
    fireEvent.click(screen.getByRole("button", { name: "Склад" }));
    fireEvent.click(screen.getByTestId("start-shift-button"));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/shifts/start", {
        truck_id: "12",
        site_id: "31",
      });
    });
    expect(mockStartDemoShift).not.toHaveBeenCalled();
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

  it("renders demo photo warning state and never opens preview blobs in demo mode", async () => {
    const windowOpenSpy = vi.spyOn(window, "open");

    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Демо водитель",
        role: "driver",
        current_state: "active",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
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
              photos: { start: true, end: true, invoice: false },
              photo_start_url: "/uploads/999/demo/included-finished-start.png",
              photo_end_url: "/uploads/999/demo/included-finished-end.png",
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

    expect(await within(card).findByText(/Фотографии смены/i)).toBeInTheDocument();
    const demoButtons = within(card).getAllByRole("button", { name: /фото недоступно в демо/i });
    expect(demoButtons).toHaveLength(2);
    expect(within(card).queryByRole("button", { name: /открыть фото:/i })).not.toBeInTheDocument();

    fireEvent.click(demoButtons[0]);

    expect(mockOpenShiftFilePreview).not.toHaveBeenCalled();
    expect(windowOpenSpy).not.toHaveBeenCalled();
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

  it("uses the unified logout flow from the driver header", async () => {
    const logout = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Тестовый водитель",
        role: UserRole.DRIVER,
        current_state: "active",
      },
      logout,
      refreshUser: vi.fn(),
    });
    mockGetCurrentShift.mockResolvedValueOnce(null);

    render(<DriverView />);

    fireEvent.click(await screen.findByRole("button", { name: /выйти/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(logout).toHaveBeenCalledWith({
      redirectToLogin: true,
      markExplicitDemoLogout: true,
    });
  });

  it("starts and finishes a demo shift through the shared store and projects finished history", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const activeShift = {
      id: "demo-shift:driver-test",
      driverId: 33,
      driverName: "Демо водитель",
      truckId: 12,
      truckName: "КамАЗ",
      truckPlate: "А123БВ",
      siteId: 31,
      siteName: "Склад",
      siteAddress: "Промышленная, 1",
      startedAt: "2026-07-26T10:00:00.000Z",
      finishedAt: null,
      status: "active",
      odometerRequired: false,
      invoiceRequired: false,
      comment: null,
      photos: {},
    };
    const finishedShift = {
      ...activeShift,
      status: "finished",
      finishedAt: "2026-07-26T11:00:00.000Z",
    };

    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Демо водитель",
        role: UserRole.DRIVER,
        current_state: "idle",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockStartDemoShift.mockReturnValue(activeShift);
    mockFinishDemoShift.mockReturnValue(finishedShift);
    mockApiGet.mockImplementation((url: string) => {
      if (url === API_ENDPOINTS.TENANT_SETTINGS) {
        return Promise.resolve({ timezone: "Europe/Moscow" });
      }
      if (url === "/trucks") {
        return Promise.resolve([
          { id: 12, name: "КамАЗ", plate: "А123БВ" },
        ]);
      }
      if (url === "/sites") {
        return Promise.resolve([
          { id: 31, name: "Склад", address: "Промышленная, 1" },
        ]);
      }
      return Promise.resolve([]);
    });

    const view = render(<DriverView />);

    fireEvent.click(await screen.findByRole("button", { name: /КамАЗ/i }));
    fireEvent.click(screen.getByRole("button", { name: "Склад" }));
    fireEvent.click(screen.getByTestId("start-shift-button"));

    expect(mockStartDemoShift).toHaveBeenCalledWith({
      driverId: 33,
      driverName: "Демо водитель",
      truckId: 12,
      truckName: "КамАЗ",
      truckPlate: "А123БВ",
      siteId: 31,
      siteName: "Склад",
      siteAddress: "Промышленная, 1",
      odometerRequired: false,
      invoiceRequired: false,
    });
    expect(await screen.findByTestId("end-shift-button")).toBeInTheDocument();
    expect(mockApiPost).not.toHaveBeenCalledWith("/shifts/start", expect.anything());

    fireEvent.click(screen.getByTestId("end-shift-button"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockFinishDemoShift).toHaveBeenCalledTimes(1);

    mockUseDemoSession.mockReturnValue({
      activeShift: null,
      finishedShifts: [finishedShift],
      startDemoShift: mockStartDemoShift,
      requestDemoShiftFinish: mockFinishDemoShift,
      finishDemoShift: mockFinishDemoShift,
      addDemoShiftComment: mockAddDemoShiftComment,
      addDemoShiftPhoto: mockAddDemoShiftPhoto,
      getDemoPhotoPreview: mockGetDemoPhotoPreview,
    });
    view.rerender(<DriverView focusHistory />);

    expect(
      await screen.findByTestId("driver-history-card-demo-shift:driver-test")
    ).toBeInTheDocument();
    expect(mockApiPost).not.toHaveBeenCalledWith("/shifts/end", {});
  });

  it("restores the shared active shift across an ordinary rerender", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Демо водитель",
        role: UserRole.DRIVER,
        current_state: "idle",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockUseDemoSession.mockReturnValue({
      activeShift: {
        id: "demo-shift:reload",
        driverId: 33,
        driverName: "Демо водитель",
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
        photos: {},
      },
      finishedShifts: [],
      startDemoShift: mockStartDemoShift,
      requestDemoShiftFinish: mockFinishDemoShift,
      finishDemoShift: mockFinishDemoShift,
      addDemoShiftComment: mockAddDemoShiftComment,
      addDemoShiftPhoto: mockAddDemoShiftPhoto,
      getDemoPhotoPreview: mockGetDemoPhotoPreview,
    });
    mockApiGet.mockResolvedValue([]);

    const view = render(<DriverView />);
    expect(await screen.findByTestId("end-shift-button")).toBeInTheDocument();

    view.rerender(<DriverView />);
    expect(screen.getByTestId("end-shift-button")).toBeInTheDocument();
  });

  it("stores an active synthetic comment locally without calling the comment API", async () => {
    const activeShift = {
      id: "demo-shift:comment",
      driverId: 33,
      driverName: "Демо водитель",
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
      photos: {},
    };
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Демо водитель",
        role: UserRole.DRIVER,
        current_state: "active",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockAddDemoShiftComment.mockReturnValue({
      ...activeShift,
      comment: "Локальный комментарий",
    });
    mockUseDemoSession.mockReturnValue({
      activeShift,
      finishedShifts: [],
      startDemoShift: mockStartDemoShift,
      requestDemoShiftFinish: mockFinishDemoShift,
      finishDemoShift: mockFinishDemoShift,
      addDemoShiftComment: mockAddDemoShiftComment,
      addDemoShiftPhoto: mockAddDemoShiftPhoto,
      getDemoPhotoPreview: mockGetDemoPhotoPreview,
    });
    mockApiGet.mockResolvedValue([]);

    render(<DriverView />);
    const textarea = await screen.findByPlaceholderText(
      "Добавьте комментарий к текущей смене"
    );
    fireEvent.change(textarea, {
      target: { value: " Локальный комментарий " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Добавить комментарий" })
    );

    expect(mockAddDemoShiftComment).toHaveBeenCalledWith(
      "demo-shift:comment",
      "Локальный комментарий"
    );
    expect(mockApiPost).not.toHaveBeenCalledWith(
      API_ENDPOINTS.ADD_SHIFT_COMMENT("demo-shift:comment"),
      expect.anything()
    );
    expect(
      await screen.findByText("Локальный комментарий")
    ).toBeInTheDocument();
  });

  it("stores a finished synthetic comment locally without a numeric API path", async () => {
    const finishedShift = {
      id: "demo-shift:finished-comment",
      driverId: 33,
      driverName: "Демо водитель",
      truckId: 12,
      truckName: "КамАЗ",
      siteId: 31,
      siteName: "Склад",
      startedAt: "2026-07-26T10:00:00.000Z",
      finishedAt: "2026-07-26T11:00:00.000Z",
      status: "finished",
      odometerRequired: false,
      invoiceRequired: false,
      comment: null,
      photos: {},
    };
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Демо водитель",
        role: UserRole.DRIVER,
        current_state: "idle",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockAddDemoShiftComment.mockReturnValue({
      ...finishedShift,
      comment: "Комментарий после смены",
    });
    mockUseDemoSession.mockReturnValue({
      activeShift: null,
      finishedShifts: [finishedShift],
      startDemoShift: mockStartDemoShift,
      requestDemoShiftFinish: mockFinishDemoShift,
      finishDemoShift: mockFinishDemoShift,
      addDemoShiftComment: mockAddDemoShiftComment,
      addDemoShiftPhoto: mockAddDemoShiftPhoto,
      getDemoPhotoPreview: mockGetDemoPhotoPreview,
    });
    mockApiGet.mockResolvedValue([]);

    render(<DriverView focusHistory />);
    const card = await screen.findByTestId(
      "driver-history-card-demo-shift:finished-comment"
    );
    fireEvent.click(within(card).getByRole("button", { name: "Подробнее" }));
    fireEvent.click(
      within(card).getByRole("button", { name: "Добавить комментарий" })
    );
    fireEvent.change(
      within(card).getByPlaceholderText("Добавьте пояснение к смене"),
      { target: { value: "Комментарий после смены" } }
    );
    fireEvent.click(
      within(card).getByRole("button", { name: "Добавить комментарий" })
    );

    expect(mockAddDemoShiftComment).toHaveBeenCalledWith(
      "demo-shift:finished-comment",
      "Комментарий после смены"
    );
    expect(await screen.findByTestId("driver-history-message")).toHaveTextContent(
      "Демонстрационный комментарий сохранен локально. Данные не отправлялись на сервер."
    );
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("opens and closes a current-page synthetic history preview without a server request", async () => {
    const finishedShift = {
      id: "demo-shift:history-preview",
      driverId: 33,
      driverName: "Демо водитель",
      truckId: 12,
      truckName: "КамАЗ",
      siteId: 31,
      siteName: "Склад",
      startedAt: "2026-07-26T10:00:00.000Z",
      finishedAt: "2026-07-26T11:00:00.000Z",
      status: "finished",
      odometerRequired: true,
      invoiceRequired: false,
      comment: "Комментарий истории",
      photos: {
        start: {
          type: "start",
          fileName: "history-current.jpg",
          mimeType: "image/jpeg",
          size: 12,
          addedAt: "2026-07-26T11:00:00.000Z",
        },
      },
    };
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Демо водитель",
        role: UserRole.DRIVER,
        current_state: "idle",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockUseDemoSession.mockReturnValue({
      activeShift: null,
      finishedShifts: [finishedShift],
      startDemoShift: mockStartDemoShift,
      requestDemoShiftFinish: mockFinishDemoShift,
      finishDemoShift: mockFinishDemoShift,
      addDemoShiftComment: mockAddDemoShiftComment,
      addDemoShiftPhoto: mockAddDemoShiftPhoto,
      getDemoPhotoPreview: mockGetDemoPhotoPreview.mockReturnValue({
        url: "blob:history-current-preview",
        fileName: "history-current.jpg",
      }),
    });
    mockApiGet.mockResolvedValue([]);

    render(<DriverView focusHistory />);
    const card = await screen.findByTestId(
      "driver-history-card-demo-shift:history-preview"
    );
    fireEvent.click(within(card).getByRole("button", { name: "Подробнее" }));
    fireEvent.click(
      within(card).getByRole("button", {
        name: "Открыть локальное демонстрационное фото: Одометр перед началом",
      })
    );

    expect(
      await screen.findByRole("dialog", { name: "Локальное демонстрационное фото" })
    ).toBeInTheDocument();
    expect(screen.getByText("history-current.jpg")).toBeInTheDocument();
    expect(
      screen.getByText(/Файл используется только для предпросмотра/i)
    ).toBeInTheDocument();
    expect(mockOpenShiftFilePreview).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Закрыть предпросмотр фотографии" })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(
      within(card).getByRole("button", {
        name: "Открыть локальное демонстрационное фото: Одометр перед началом",
      })
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows metadata-only history feedback after reload without a dialog or API call", async () => {
    const finishedShift = {
      id: "demo-shift:history-metadata",
      driverId: 33,
      driverName: "Демо водитель",
      truckId: 12,
      truckName: "КамАЗ",
      siteId: 31,
      siteName: "Склад",
      startedAt: "2026-07-26T10:00:00.000Z",
      finishedAt: "2026-07-26T11:00:00.000Z",
      status: "finished",
      odometerRequired: true,
      invoiceRequired: false,
      comment: "Комментарий истории",
      photos: {
        start: {
          type: "start",
          fileName: "history-metadata.jpg",
          mimeType: "image/jpeg",
          size: 12,
          addedAt: "2026-07-26T11:00:00.000Z",
        },
      },
    };
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Демо водитель",
        role: UserRole.DRIVER,
        current_state: "idle",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockUseDemoSession.mockReturnValue({
      activeShift: null,
      finishedShifts: [finishedShift],
      startDemoShift: mockStartDemoShift,
      requestDemoShiftFinish: mockFinishDemoShift,
      finishDemoShift: mockFinishDemoShift,
      addDemoShiftComment: mockAddDemoShiftComment,
      addDemoShiftPhoto: mockAddDemoShiftPhoto,
      getDemoPhotoPreview: mockGetDemoPhotoPreview.mockReturnValue(null),
    });
    mockApiGet.mockResolvedValue([]);

    render(<DriverView focusHistory />);
    const card = await screen.findByTestId(
      "driver-history-card-demo-shift:history-metadata"
    );
    fireEvent.click(within(card).getByRole("button", { name: "Подробнее" }));
    fireEvent.click(
      within(card).getByRole("button", {
        name: "Открыть локальное демонстрационное фото: Одометр перед началом",
      })
    );

    const message = await screen.findByTestId("driver-history-message");
    expect(message).toHaveTextContent(
      "Демонстрационное фото добавлено, локальный предпросмотр завершён после перезагрузки."
    );
    expect(message).toHaveAttribute("role", "status");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(card.querySelector("img")).toBeNull();
    expect(mockOpenShiftFilePreview).not.toHaveBeenCalled();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("simulates finished synthetic photo backfill without FormData or an endpoint call", async () => {
    const finishedShift = {
      id: "demo-shift:backfill",
      driverId: 33,
      driverName: "Демо водитель",
      truckId: 12,
      truckName: "КамАЗ",
      siteId: 31,
      siteName: "Склад",
      startedAt: "2026-07-26T10:00:00.000Z",
      finishedAt: "2026-07-26T11:00:00.000Z",
      status: "finished",
      odometerRequired: true,
      invoiceRequired: false,
      comment: null,
      photos: {},
    };
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Демо водитель",
        role: UserRole.DRIVER,
        current_state: "idle",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockAddDemoShiftPhoto.mockReturnValue({
      ...finishedShift,
      photos: {
        start: {
          type: "start",
          fileName: "backfill.jpg",
          mimeType: "image/jpeg",
          size: 5,
          addedAt: "2026-07-26T11:05:00.000Z",
        },
      },
    });
    mockUseDemoSession.mockReturnValue({
      activeShift: null,
      finishedShifts: [finishedShift],
      startDemoShift: mockStartDemoShift,
      requestDemoShiftFinish: mockFinishDemoShift,
      finishDemoShift: mockFinishDemoShift,
      addDemoShiftComment: mockAddDemoShiftComment,
      addDemoShiftPhoto: mockAddDemoShiftPhoto,
      getDemoPhotoPreview: mockGetDemoPhotoPreview,
    });
    mockApiGet.mockResolvedValue([]);

    render(<DriverView focusHistory />);
    const card = await screen.findByTestId(
      "driver-history-card-demo-shift:backfill"
    );
    fireEvent.click(within(card).getByRole("button", { name: "Подробнее" }));
    fireEvent.click(within(card).getAllByRole("button", { name: "Добавить" })[0]);
    fireEvent.change(
      document.getElementById(
        "finished-shift-photo-reason-demo-shift:backfill:start"
      ) as HTMLTextAreaElement,
      { target: { value: "Локальная проверка" } }
    );
    fireEvent.change(
      document.getElementById(
        "finished-shift-photo-file-demo-shift:backfill:start"
      ) as HTMLInputElement,
      {
        target: {
          files: [
            new File(["photo"], "backfill.jpg", { type: "image/jpeg" }),
          ],
        },
      }
    );
    fireEvent.click(within(card).getByRole("button", { name: "Загрузить" }));

    await waitFor(() =>
      expect(mockAddDemoShiftPhoto).toHaveBeenCalledWith(
        "demo-shift:backfill",
        "start",
        expect.any(File)
      )
    );
    expect(mockApiPostFormData).not.toHaveBeenCalled();
    expect(mockOpenShiftFilePreview).not.toHaveBeenCalled();
  });

  it("validates and stores a synthetic workflow photo before any network construction", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const activeShift = {
      id: "demo-shift:photo",
      driverId: 33,
      driverName: "Демо водитель",
      truckId: 12,
      truckName: "КамАЗ",
      siteId: 31,
      siteName: "Склад",
      startedAt: "2026-07-26T10:00:00.000Z",
      finishedAt: null,
      status: "awaiting_odo_start",
      odometerRequired: true,
      invoiceRequired: true,
      comment: null,
      photos: {},
    };
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Демо водитель",
        role: UserRole.DRIVER,
        current_state: "awaiting_odo_start",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockAddDemoShiftPhoto.mockReturnValue({
      ...activeShift,
      status: "active",
      photos: {
        start: {
          type: "start",
          fileName: "meter.jpg",
          mimeType: "image/jpeg",
          size: 5,
          addedAt: "2026-07-26T10:01:00.000Z",
        },
      },
    });
    mockUseDemoSession.mockReturnValue({
      activeShift,
      finishedShifts: [],
      startDemoShift: mockStartDemoShift,
      requestDemoShiftFinish: mockFinishDemoShift,
      finishDemoShift: mockFinishDemoShift,
      addDemoShiftComment: mockAddDemoShiftComment,
      addDemoShiftPhoto: mockAddDemoShiftPhoto,
      getDemoPhotoPreview: mockGetDemoPhotoPreview,
    });
    mockApiGet.mockResolvedValue([]);

    const { container } = render(<DriverView />);
    await waitFor(() =>
      expect(
        container.querySelector('input[type="file"][capture="environment"]')
      ).not.toBeNull()
    );
    const input = container.querySelector(
      'input[type="file"][capture="environment"]'
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["photo"], "meter.jpg", { type: "image/jpeg" })],
      },
    });

    await waitFor(() =>
      expect(mockAddDemoShiftPhoto).toHaveBeenCalledWith(
        "demo-shift:photo",
        "start",
        expect.any(File)
      )
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockApiPostFormData).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "Демонстрационное фото добавлено. Файл не отправлялся на сервер."
      )
    ).toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it("preserves the real-tenant photo upload endpoint", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn(),
    } as unknown as Response);
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 16,
        full_name: "Тестовый водитель",
        role: UserRole.DRIVER,
        current_state: "awaiting_odo_start",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockGetCurrentShift.mockResolvedValue({
      id: 113,
      status: "awaiting_odo_start",
      start_time: "2026-07-26T10:00:00.000Z",
      truck: { name: "КамАЗ" },
      site: {
        name: "Склад",
        odometer_required: true,
        invoice_required: false,
      },
    });

    const { container } = render(<DriverView />);
    await waitFor(() =>
      expect(
        container.querySelector('input[type="file"][capture="environment"]')
      ).not.toBeNull()
    );
    const input = container.querySelector(
      'input[type="file"][capture="environment"]'
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["photo"], "meter.jpg", { type: "image/jpeg" })],
      },
    });

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        API_ENDPOINTS.UPLOAD_PHOTO,
        expect.objectContaining({ method: "POST" })
      )
    );
    expect(mockAddDemoShiftPhoto).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("moves a required synthetic finish into the photo workflow without an end API call", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const activeShift = {
      id: "demo-shift:end-workflow",
      driverId: 33,
      driverName: "Демо водитель",
      truckId: 12,
      truckName: "КамАЗ",
      siteId: 31,
      siteName: "Склад",
      startedAt: "2026-07-26T10:00:00.000Z",
      finishedAt: null,
      status: "active",
      odometerRequired: true,
      invoiceRequired: true,
      comment: null,
      photos: {},
    };
    mockUseAuth.mockReturnValue({
      user: {
        id: 33,
        tenant_id: 999,
        full_name: "Демо водитель",
        role: UserRole.DRIVER,
        current_state: "active",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockFinishDemoShift.mockReturnValue({
      ...activeShift,
      status: "awaiting_odo_end",
    });
    mockUseDemoSession.mockReturnValue({
      activeShift,
      finishedShifts: [],
      startDemoShift: mockStartDemoShift,
      requestDemoShiftFinish: mockFinishDemoShift,
      finishDemoShift: mockFinishDemoShift,
      addDemoShiftComment: mockAddDemoShiftComment,
      addDemoShiftPhoto: mockAddDemoShiftPhoto,
      getDemoPhotoPreview: mockGetDemoPhotoPreview,
    });
    mockApiGet.mockResolvedValue([]);

    render(<DriverView />);
    fireEvent.click(await screen.findByTestId("end-shift-button"));

    expect(mockFinishDemoShift).toHaveBeenCalledTimes(1);
    expect(mockApiPost).not.toHaveBeenCalledWith("/shifts/end", {});
    expect(
      await screen.findByText(/Сфотографируйте одометр ПОСЛЕ работы/)
    ).toBeInTheDocument();
  });
});
