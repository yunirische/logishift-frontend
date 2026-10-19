import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import api, { acceptInvite } from "../../services/api";
import RegisterView, { getRegistrationPasswordChecks } from "../RegisterView";
import { PUBLIC_TARIFFS } from "../../config/tariffs";
import { REQUIRED_CONSENT_VERSIONS } from "../../config/legal";

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
  recordPublicFunnelEvent: vi.fn(),
}));

describe("registration password backend contract", () => {
  it.each([" ", "\t", "\n", "Я", "я", "🙂", "`", "~", "—"])(
    "does not accept a non-contract character as punctuation: %j",
    (character) => expect(getRegistrationPasswordChecks(character).special).toBe(false)
  );

  it.each(Array.from("!@#$%^&*()_+-=[]{};':\"\\|,.<>/?"))(
    "accepts backend punctuation %j",
    (character) => expect(getRegistrationPasswordChecks(character).special).toBe(true)
  );

  it("preserves length, Latin uppercase and numeric boundaries", () => {
    expect(getRegistrationPasswordChecks("Aa1!aaa").length).toBe(false);
    expect(getRegistrationPasswordChecks("Aa1!aaaa")).toEqual({ length: true, upper: true, number: true, special: true });
    expect(getRegistrationPasswordChecks("Яя1!aaaa").upper).toBe(false);
    expect(getRegistrationPasswordChecks("Aa!aaaaa").number).toBe(false);
    // Other characters are permitted in a password; they just do not satisfy punctuation.
    expect(getRegistrationPasswordChecks("Я🙂 Aa1!aaaa").special).toBe(true);
  });
});

describe("RegisterView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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

  it("continues the landing Free offer using the existing tariff configuration", () => {
    window.history.replaceState({}, "", "/register");
    render(<RegisterView />);
    const free = PUBLIC_TARIFFS.find((plan) => plan.code === "free")!;
    const context = screen.getByTestId("free-registration-context");
    expect(screen.getByRole("heading", { name: "Создайте компанию бесплатно" })).toBeInTheDocument();
    expect(context).toHaveTextContent(free.priceLabel);
    expect(context).toHaveTextContent(free.meta);
    free.details.slice(0, 3).forEach((detail) => expect(context).toHaveTextContent(detail));
    expect(context).not.toHaveTextContent(/Excel|ZIP/);
    expect(screen.getByLabelText(/название компании/i)).toHaveAttribute("autocomplete", "organization");
    expect(screen.getByLabelText(/email администратора/i)).toHaveAttribute("placeholder", "name@example.com");
  });

  it("does not claim Free company creation in driver mode", async () => {
    window.history.replaceState({}, "", "/register");
    const user = userEvent.setup({ delay: null });
    render(<RegisterView />);
    await user.click(screen.getByRole("button", { name: "Водитель" }));
    expect(screen.queryByTestId("free-registration-context")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/код приглашения/i)).toBeRequired();
    await user.click(screen.getByRole("button", { name: "Компания" }));
    expect(screen.getByTestId("free-registration-context")).toBeInTheDocument();
  });

  it("keeps exactly three required consents unchecked and gates submit until all are accepted", async () => {
    window.history.replaceState({}, "", "/register");
    const user = userEvent.setup({ delay: null });
    render(<RegisterView />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeRequired();
      expect(checkbox).not.toBeChecked();
    });
    const submit = screen.getByRole("button", { name: /создать компанию/i });
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    expect(submit).toBeDisabled();
    await user.click(checkboxes[2]);
    expect(submit).toBeEnabled();
    await user.click(checkboxes[0]);
    expect(submit).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("validates empty fields without native submit UI and focuses the first invalid field", async () => {
    window.history.replaceState({}, "", "/register");
    const user = userEvent.setup({ delay: null });
    render(<RegisterView />);
    await acceptRequiredConsents(user);
    await user.click(screen.getByRole("button", { name: /создать компанию/i }));
    const company = screen.getByLabelText(/название компании/i);
    expect(company).toHaveFocus();
    expect(company).toHaveAttribute("aria-invalid", "true");
    expect(company).toHaveAccessibleDescription(/Введите название компании/);
    expect(screen.getByText("Введите название компании").parentElement).toContainElement(company);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("shows a malformed email error on blur and clears it after correction", async () => {
    window.history.replaceState({}, "", "/register");
    const user = userEvent.setup({ delay: null });
    render(<RegisterView />);
    const email = screen.getByLabelText(/email администратора/i);
    await user.type(email, "not-an-email");
    await user.tab();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Введите корректный email");
    await user.clear(email);
    await user.type(email, "admin@example.com");
    await user.tab();
    expect(email).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText("Введите корректный email")).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("binds password mismatch to confirmation and focuses it after failed submit", async () => {
    window.history.replaceState({}, "", "/register");
    const user = userEvent.setup({ delay: null });
    render(<RegisterView />);
    await fillAdminRegistrationForm(user);
    const confirmation = screen.getByLabelText(/подтвердите пароль/i);
    await user.clear(confirmation);
    await user.type(confirmation, "DifferentPass1!");
    await user.click(screen.getByRole("button", { name: /создать компанию/i }));
    expect(confirmation).toHaveFocus();
    expect(confirmation).toHaveAttribute("aria-invalid", "true");
    expect(confirmation).toHaveAccessibleDescription("Пароли не совпадают");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("uses the same punctuation predicate for live checklist and submit validation", async () => {
    window.history.replaceState({}, "", "/register");
    const user = userEvent.setup({ delay: null });
    render(<RegisterView />);
    await fillAdminRegistrationForm(user);
    const password = screen.getByLabelText(/^пароль/i);
    const confirmation = screen.getByLabelText(/подтвердите пароль/i);
    await user.clear(password);
    await user.type(password, "StrongPass1 ");
    await user.clear(confirmation);
    await user.type(confirmation, "StrongPass1 ");
    const specialCheck = screen.getByText("Спецсимвол ! @ #");
    expect(specialCheck.querySelector("svg")).toBeNull();
    await user.click(screen.getByRole("button", { name: /создать компанию/i }));
    expect(password).toHaveFocus();
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(api.post).not.toHaveBeenCalled();
    await user.type(password, "!");
    expect(specialCheck.querySelector("svg")).not.toBeNull();
  });

  it("places unchanged server errors by submit and focuses the alert", async () => {
    window.history.replaceState({}, "", "/register");
    const user = userEvent.setup({ delay: null });
    vi.mocked(api.post).mockRejectedValueOnce(new Error("Сервис временно недоступен"));
    render(<RegisterView />);
    await fillAdminRegistrationForm(user);
    await user.click(screen.getByRole("button", { name: /создать компанию/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Сервис временно недоступен");
    await waitFor(() => expect(alert).toHaveFocus());
    const submit = screen.getByRole("button", { name: /создать компанию/i });
    expect(alert.nextElementSibling).toBe(submit);
    expect(within(alert).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("toggles both password fields independently without submitting or changing their values", async () => {
    window.history.replaceState({}, "", "/register");
    const user = userEvent.setup({ delay: null });
    render(<RegisterView />);
    const password = screen.getByLabelText(/^пароль/i);
    const confirmation = screen.getByLabelText(/подтвердите пароль/i);
    await user.type(password, "StrongPass1!");
    await user.click(screen.getByRole("button", { name: "Показать пароль" }));
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("StrongPass1!");
    expect(confirmation).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Показать повтор пароля" }));
    expect(confirmation).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Скрыть пароль" }));
    expect(password).toHaveAttribute("type", "password");
    expect(api.post).not.toHaveBeenCalled();
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
    expect(screen.getByTestId("free-registration-context")).toBeInTheDocument();
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
    window.history.replaceState(
      {},
      "",
      `/register?code=ABC123#demo_session=${"i".repeat(43)}`
    );

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
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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
        consents: { accepted: true, versions: REQUIRED_CONSENT_VERSIONS },
      })
    );
    expect(screen.getByRole("button", { name: /регистрация/i })).toBeDisabled();
  });

  it("captures the initial allowlisted attribution and excludes demo context from the admin payload", async () => {
    const user = userEvent.setup({ delay: null });
    window.history.replaceState(
      {},
      "",
      `/register?registration_source=demo&yclid=click&utm_source=yandex&utm_medium=cpc&utm_campaign=demo&utm_content=guide&utm_term=shift&arbitrary=value&demo_shift=demo-shift%3A1#demo_session=${"h".repeat(43)}&demo_session_expires=${Date.now() + 3600000}&measurement_internal=0`
    );
    vi.mocked(api.post).mockImplementationOnce(() => new Promise(() => undefined));

    render(<RegisterView />);
    expect(window.location.hash).toBe("");
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
    expect(payload.demoSessionKey).toBe("h".repeat(43));
    expect(payload).not.toHaveProperty("demo_shift");
    expect(payload).not.toHaveProperty("demoPersona");
    expect(payload).not.toHaveProperty("truck");
    expect(payload).not.toHaveProperty("site");
    expect(payload).not.toHaveProperty("driver");
    expect(payload).not.toHaveProperty("token");
  });

  it("blocks repeated submit while registration is loading", async () => {
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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
        consents: { accepted: true, versions: REQUIRED_CONSENT_VERSIONS },
      })
    );
    expect(vi.mocked(acceptInvite).mock.calls[0][0]).not.toHaveProperty(
      "demoSessionKey"
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});
