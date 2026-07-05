import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "../Login";

const { mockLogin, mockLoginUser } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockLoginUser: vi.fn(),
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
  getDemoAppUrl: vi.fn(() => "https://demo.kontrolsmen.ru"),
  isDemoHostname: vi.fn(() => true),
  isProductionAppHostname: vi.fn(() => false),
}));

vi.mock("../BrandLogo", () => ({
  default: () => <div>Brand</div>,
}));

vi.mock("../LegalLinks", () => ({
  default: () => <div>Legal</div>,
}));

describe("Login demo flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/login");
  });

  it("suppresses auto demo login after explicit demo logout", async () => {
    sessionStorage.setItem("explicit_demo_logout", "1");

    render(<Login />);

    await waitFor(() => {
      expect(mockLoginUser).not.toHaveBeenCalled();
    });
    expect(
      screen.getByRole("button", { name: /войти в демо-организацию/i })
    ).toBeInTheDocument();
  });

  it("allows explicit demo login again and clears the logout marker", async () => {
    sessionStorage.setItem("explicit_demo_logout", "1");
    mockLoginUser.mockResolvedValue({
      token: "header.payload.signature",
      user: { id: 999, full_name: "Demo User" },
    });

    render(<Login />);

    fireEvent.click(screen.getByRole("button", { name: /войти в демо-организацию/i }));

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith("demo@logishift.ru", "demo123");
    });
    expect(sessionStorage.getItem("explicit_demo_logout")).toBeNull();
    expect(mockLogin).toHaveBeenCalledWith("header.payload.signature", {
      id: 999,
      full_name: "Demo User",
    });
  });
});
