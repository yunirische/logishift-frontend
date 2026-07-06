import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "../Login";

const {
  mockLogin,
  mockLoginUser,
  mockGetDemoAppUrl,
  mockGetProductionAppUrl,
  mockIsDemoHostname,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockLoginUser: vi.fn(),
  mockGetDemoAppUrl: vi.fn(() => "https://demo.kontrolsmen.ru"),
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
  EXPLICIT_DEMO_LOGOUT_KEY: "explicit_demo_logout",
  getDemoAppUrl: mockGetDemoAppUrl,
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
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    mockIsDemoHostname.mockReturnValue(false);
  });

  it("renders the normal credential form and demo link on the app host without auto demo login", () => {
    window.history.replaceState({}, "", "/login");
    mockIsDemoHostname.mockReturnValue(false);

    render(<Login />);

    expect(mockLoginUser).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/логин/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /войти в систему/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /войти в демо/i })).toHaveAttribute(
      "href",
      "https://demo.kontrolsmen.ru"
    );
  });

  it("submits the normal login API on the app host", async () => {
    window.history.replaceState({}, "", "/login");
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

  it("auto-logins into demo on the demo root host", async () => {
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
    expect(screen.queryByLabelText(/логин/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/пароль/i)).not.toBeInTheDocument();
  });

  it("suppresses demo auto-login after explicit demo logout and keeps only the app login redirect state", () => {
    sessionStorage.setItem("explicit_demo_logout", "1");
    mockIsDemoHostname.mockReturnValue(true);

    render(<Login />);

    expect(mockLoginUser).not.toHaveBeenCalled();
    expect(screen.getByText(/перенаправляем на единый экран входа/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/логин/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/пароль/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /открыть рабочий вход/i })).toHaveAttribute(
      "href",
      "https://app.kontrolsmen.ru/login"
    );
  });

  it("does not render the credential form on demo host /login and redirects to app login", () => {
    window.history.replaceState({}, "", "/login");
    mockIsDemoHostname.mockReturnValue(true);

    render(<Login />);

    expect(mockLoginUser).not.toHaveBeenCalled();
    expect(screen.getByText(/перенаправляем на единый экран входа/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /войти в систему/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/логин/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/пароль/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /открыть рабочий вход/i })).toHaveAttribute(
      "href",
      "https://app.kontrolsmen.ru/login"
    );
  });
});
