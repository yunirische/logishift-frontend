import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterView from "../RegisterView";

vi.mock("../../components/BrandLogo", () => ({
  default: () => <div>Brand</div>,
}));

vi.mock("../../components/LegalLinks", () => ({
  default: () => <div>LegalLinks</div>,
}));

vi.mock("../../services/api", () => ({
  default: {
    post: vi.fn(),
  },
  acceptInvite: vi.fn(),
}));

describe("RegisterView", () => {
  it("opens admin mode by default on /register", () => {
    window.history.replaceState({}, "", "/register");

    render(<RegisterView />);

    expect(screen.getByLabelText(/название компании/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/код приглашения/i)).not.toBeInTheDocument();
    expect(screen.getByText("LegalLinks")).toBeInTheDocument();
  });

  it("opens driver mode immediately when invite code is present", () => {
    window.history.replaceState({}, "", "/register?code=ABC123");

    render(<RegisterView />);

    expect(screen.getByLabelText(/код приглашения/i)).toHaveValue("ABC123");
    expect(screen.queryByLabelText(/название компании/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /вступить в компанию/i })).toBeInTheDocument();
  });

  it("keeps manual mode switching working after invite prefill", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/register?code=ABC123");

    render(<RegisterView />);
    await user.click(screen.getByRole("button", { name: /компания/i }));

    expect(screen.getByLabelText(/название компании/i)).toBeInTheDocument();
  });

  it("keeps consent links and the current legal version on registration", () => {
    window.history.replaceState({}, "", "/register");

    render(<RegisterView />);

    expect(
      screen.getByRole("link", { name: /оферту и пользовательское соглашение/i })
    ).toHaveAttribute("href", "/offer");
    expect(
      screen.getByRole("link", { name: /политикой обработки персональных данных/i })
    ).toHaveAttribute("href", "/privacy");
    expect(
      screen.getByRole("link", { name: /согласие на обработку персональных данных/i })
    ).toHaveAttribute("href", "/personal-data-consent");
  });
});
