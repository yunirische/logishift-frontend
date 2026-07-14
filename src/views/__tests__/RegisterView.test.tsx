import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import api, { acceptInvite } from "../../services/api";
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const acceptRequiredConsents = async (user: ReturnType<typeof userEvent.setup>) => {
    const checkboxes = screen.getAllByRole("checkbox");
    for (const checkbox of checkboxes) {
      await user.click(checkbox);
    }
  };

  const fillAdminRegistrationForm = async (
    user: ReturnType<typeof userEvent.setup>,
    email = "Admin@Example.COM "
  ) => {
    await user.type(screen.getByLabelText(/название компании/i), "ООО Тест");
    await user.type(screen.getByLabelText(/полное имя/i), "Admin User");
    await user.type(screen.getByLabelText(/email/i), email);
    await user.type(screen.getByLabelText(/^пароль/i), "StrongPass1!");
    await user.type(screen.getByLabelText(/подтвердите пароль/i), "StrongPass1!");
    await acceptRequiredConsents(user);
  };

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

  it("renders the honeypot in the DOM but keeps it hidden and out of tab navigation", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/register");

    const { container } = render(<RegisterView />);
    const honeypot = container.querySelector<HTMLInputElement>('input[name="websiteUrl"]');

    expect(honeypot).toBeInTheDocument();
    expect(honeypot).toHaveValue("");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot?.closest("[aria-hidden='true']")).toBeTruthy();
    expect(honeypot?.closest(".hidden")).toBeTruthy();

    for (let index = 0; index < 12; index += 1) {
      await user.tab();
      expect(document.activeElement).not.toBe(honeypot);
    }
  });

  it("submits normal admin registration with normalized email and empty honeypot", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/register");
    vi.mocked(api.post).mockImplementationOnce(() => new Promise(() => undefined));

    render(<RegisterView />);
    await fillAdminRegistrationForm(user, " Admin@Example.COM ");
    await user.click(screen.getByRole("button", { name: /создать компанию/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith(
      expect.stringContaining("/auth/register-tenant"),
      expect.objectContaining({
        companyName: "ООО Тест",
        adminName: "Admin User",
        email: "admin@example.com",
        password: "StrongPass1!",
        websiteUrl: "",
      })
    );
    expect(screen.getByRole("button", { name: /регистрация/i })).toBeDisabled();
  });

  it("blocks repeated submit while registration is loading", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/register");
    vi.mocked(api.post).mockImplementationOnce(() => new Promise(() => undefined));

    render(<RegisterView />);
    await fillAdminRegistrationForm(user);
    const submit = screen.getByRole("button", { name: /создать компанию/i });

    await user.click(submit);
    await waitFor(() => expect(screen.getByRole("button", { name: /регистрация/i })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: /регистрация/i }));

    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it("keeps invite registration mode working without sending the admin honeypot payload", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/register?code=ABC123");
    vi.mocked(acceptInvite).mockResolvedValueOnce(undefined);

    render(<RegisterView />);
    await user.type(screen.getByLabelText(/полное имя/i), "Driver User");
    await user.type(screen.getByLabelText(/email/i), " Driver@Example.COM ");
    await user.type(screen.getByLabelText(/^пароль/i), "StrongPass1!");
    await user.type(screen.getByLabelText(/подтвердите пароль/i), "StrongPass1!");
    await acceptRequiredConsents(user);
    await user.click(screen.getByRole("button", { name: /вступить в компанию/i }));

    await waitFor(() => expect(acceptInvite).toHaveBeenCalledTimes(1));
    expect(acceptInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "ABC123",
        email: "driver@example.com",
      })
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});
