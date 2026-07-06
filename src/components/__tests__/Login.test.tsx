import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "../Login";

const {
  mockHistoryReplaceState,
  mockLogin,
  mockLoginUser,
  mockGetDemoAppUrl,
  mockGetDemoEntryUrl,
  mockGetProductionAppUrl,
  mockIsDemoHostname,
} = vi.hoisted(() => ({
  mockHistoryReplaceState: vi.fn(),
  mockLogin: vi.fn(),
  mockLoginUser: vi.fn(),
  mockGetDemoAppUrl: vi.fn(() => "https://demo.kontrolsmen.ru"),
  mockGetDemoEntryUrl: vi.fn(() => "https://demo.kontrolsmen.ru/?enterDemo=1"),
  mockGetProductionAppUrl: vi.fn(
    (pathname = "/") => `https://app.kontrolsmen.ru${pathname}`
  ),
  mockIsDemoHostname: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock("../../services/api", () => ({
  loginUser: mockLoginUser,
}));

vi.mock("../../config/demo", () => ({
  DEMO_ENTRY_QUERY_PARAM: "enterDemo",
  EXPLICIT_DEMO_LOGOUT_KEY: "explicit_demo_logout",
  getDemoAppUrl: mockGetDemoAppUrl,
  getDemoEntryUrl: mockGetDemoEntryUrl,
  getProductionAppUrl: mockGetProductionAppUrl,
  isDemoHostname: mockIsDemoHostname,
}));

vi.mock("../BrandLogo", () => ({
  default: () => <div>Brand Logo</div>,
}));

vi.mock("../LegalLinks", () => ({
  default: () => <div>Legal links</div>,
}));

describe("Login single-window demo contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    const originalReplaceState = window.history.replaceState.bind(window.history);
    vi.spyOn(window.history, "replaceState").mockImplementation(
      ((...args: Parameters<History["replaceState"]>) => {
        mockHistoryReplaceState(...args);
        return originalReplaceState(...args);
      }) as History["replaceState"]
    );
    mockIsDemoHostname.mockReturnValue(false);
  });

  it("renders the normal credential form and demo link on the app host without auto demo login", () => {
    window.history.pushState({}, "", "/login");
    mockIsDemoHostname.mockReturnValue(false);

    render(<Login />);

    expect(mockLoginUser).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/логин/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /войти в систему/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /войти в демо/i })).toHaveAttribute(
      "href",
      "https://demo.kontrolsmen.ru/?enterDemo=1"
    );
  });

  it("submits the normal login API on the app host", async () => {
    window.history.pushState({}, "", "/login");
    mockIsDemoHostname.mockReturnValue(false);
    mockLoginUser.mockResolvedValue({
      token: "prod.token.value",
      user: { id: 5, full_name: "Prod User" },
    });

    render(<Login />);

    fireEvent.change(screen.getByLabelText(/логин/i), {
      target: { value: "worker@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/пароль/i), {
      target: { value: "secret" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /войти в систему/i }).closest("form")!
    );

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith("worker@example.com", "secret");
    });
    expect(mockLogin).toHaveBeenCalledWith("prod.token.value", {
      id: 5,
      full_name: "Prod User",
    });
  });

  it("auto-logins into demo on the demo root host without rendering visible transition UI", async () => {
    mockIsDemoHostname.mockReturnValue(true);
    mockLoginUser.mockResolvedValue({
      token: "demo.token.value",
      user: { id: 999, full_name: "Demo User" },
    });

    render(<Login />);

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith("demo@logishift.ru", "demo123");
    });
    expect(mockLogin).toHaveBeenCalledWith("demo.token.value", {
      id: 999,
      full_name: "Demo User",
    });
    expect(screen.queryByText(/перенаправляем на единый экран входа/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/загрузка демо/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/открываем рабочий вход/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /открыть рабочий вход/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/логин/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/пароль/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("demo-host-handoff-shell")).toBeInTheDocument();
  });

  it("demo root with explicit entry clears the suppression marker, strips the query, and starts demo flow without rendering visible transition UI", async () => {
    window.history.pushState({}, "", "/?enterDemo=1");
    sessionStorage.setItem("explicit_demo_logout", "1");
    mockIsDemoHostname.mockReturnValue(true);
    mockLoginUser.mockResolvedValue({
      token: "demo.token.value",
      user: { id: 999, full_name: "Demo User" },
    });

    render(<Login />);

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith("demo@logishift.ru", "demo123");
    });
    expect(sessionStorage.getItem("explicit_demo_logout")).toBeNull();
    expect(mockHistoryReplaceState).toHaveBeenLastCalledWith({}, "", "/");
    expect(screen.queryByText(/перенаправляем на единый экран входа/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/загрузка демо/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/открываем рабочий вход/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /открыть рабочий вход/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/логин/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/пароль/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("demo-host-handoff-shell")).toBeInTheDocument();
  });

  it("renders demo recovery UI when demo auto-login fails and retries safely", async () => {
    mockIsDemoHostname.mockReturnValue(true);
    mockLoginUser
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({
        token: "demo.token.value",
        user: { id: 999, full_name: "Demo User" },
      });

    render(<Login />);

    expect(await screen.findByText(/демо не открылось/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /не удалось автоматически запустить демо\. проверьте соединение и попробуйте ещё раз\./i
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/логин/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /попробовать снова/i }));

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledTimes(2);
    });
    expect(mockLogin).toHaveBeenCalledWith("demo.token.value", {
      id: 999,
      full_name: "Demo User",
    });
  });

  it("renders demo recovery UI after the timeout delay", async () => {
    vi.useFakeTimers();
    mockIsDemoHostname.mockReturnValue(true);
    mockLoginUser.mockImplementation(
      () => new Promise(() => undefined)
    );

    render(<Login />);

    expect(screen.queryByText(/демо не открылось/i)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByText(/демо не открылось/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /попробовать снова/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /вернуться ко входу/i })).toHaveAttribute(
      "href",
      "https://app.kontrolsmen.ru/login"
    );
  });

  it("suppresses demo auto-login after explicit demo logout without rendering visible transition UI", () => {
    sessionStorage.setItem("explicit_demo_logout", "1");
    mockIsDemoHostname.mockReturnValue(true);

    render(<Login />);

    expect(mockLoginUser).not.toHaveBeenCalled();
    expect(screen.queryByText(/перенаправляем на единый экран входа/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/загрузка демо/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/открываем рабочий вход/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/логин/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/пароль/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /открыть рабочий вход/i })).not.toBeInTheDocument();
    expect(mockLoginUser).not.toHaveBeenCalledWith("demo@logishift.ru", "demo123");
    expect(screen.getByTestId("demo-host-handoff-shell")).toBeInTheDocument();
  });

  it("does not render the credential form on demo host /login and does not render visible transition UI", () => {
    window.history.pushState({}, "", "/login");
    mockIsDemoHostname.mockReturnValue(true);

    render(<Login />);

    expect(mockLoginUser).not.toHaveBeenCalled();
    expect(screen.queryByText(/перенаправляем на единый экран входа/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/загрузка демо/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/открываем рабочий вход/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /войти в систему/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/логин/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/пароль/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /открыть рабочий вход/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /вернуться ко входу/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("demo-host-handoff-shell")).toBeInTheDocument();
  });
});
