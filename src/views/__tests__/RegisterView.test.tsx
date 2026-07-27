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

  it("shows concise company context only for a demo-source registration", () => {
    window.history.replaceState(
      {},
      "",
      "/register?registration_source=demo&utm_source=yandex"
    );

    render(<RegisterView />);

    expect(screen.getByTestId("demo-registration-context")).toHaveTextContent(
      "Продолжите со своими данными"
    );
    expect(screen.getByTestId("demo-registration-context")).toHaveTextContent(
      "На бесплатном тарифе доступны 2 машины, 2 объекта и 2 водителя."
    );
    expect(screen.getByLabelText(/название компании/i)).toBeInTheDocument();
  });

  it("does not show demo context on ordinary registration", () => {
    window.history.replaceState({}, "", "/register");

    render(<RegisterView />);

    expect(
      screen.queryByTestId("demo-registration-context")
    ).not.toBeInTheDocument();
  });

  it("opens driver mode immediately when invite code is present", () => {
    window.history.replaceState({}, "", "/register?code=ABC123");

    render(<RegisterView />);

    expect(screen.getByLabelText(/код приглашения/i)).toHaveValue("ABC123");
    expect(screen.queryByLabelText(/название компании/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /вступить в компанию/i })).toBeInTheDocument();
  });

  it("keeps an invite authoritative when an unrelated demo marker is present", () => {
    window.history.replaceState(
      {},
      "",
      "/register?registration_source=demo&code=ABC123&utm_source=yandex"
    );

    render(<RegisterView />);

    expect(screen.getByLabelText(/код приглашения/i)).toHaveValue("ABC123");
    expect(
      screen.queryByTestId("demo-registration-context")
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/название компании/i)).not.toBeInTheDocument();
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

  it("captures the initial allowlisted attribution and excludes demo context from the admin payload", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      {},
      "",
      "/register?registration_source=demo&yclid=click&utm_source=yandex&utm_medium=cpc&utm_campaign=demo&utm_content=guide&utm_term=shift&arbitrary=value&demo_shift=demo-shift%3A1"
    );
    vi.mocked(api.post).mockImplementationOnce(() => new Promise(() => undefined));

    render(<RegisterView />);
    window.history.replaceState(
      {},
      "",
      "/register?registration_source=changed&utm_source=changed"
    );
    await fillAdminRegistrationForm(user);
    await user.click(screen.getByRole("button", { name: /создать компанию/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(api.post).mock.calls[0][1] as Record<
      string,
      any
    >;
    expect(payload.attribution).toEqual({
      yclid: "click",
      utm_source: "yandex",
      utm_medium: "cpc",
      utm_campaign: "demo",
      utm_content: "guide",
      utm_term: "shift",
    });
    expect(payload.attribution).not.toHaveProperty("registration_source");
    expect(payload.attribution).not.toHaveProperty("arbitrary");
    expect(payload).not.toHaveProperty("demo_shift");
    expect(payload).not.toHaveProperty("demoPersona");
    expect(payload).not.toHaveProperty("truck");
    expect(payload).not.toHaveProperty("site");
    expect(payload).not.toHaveProperty("driver");
    expect(payload).not.toHaveProperty("token");
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
