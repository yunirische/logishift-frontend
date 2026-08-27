import { fireEvent, render, screen } from "@testing-library/react";
import DemoBanner from "../DemoBanner";
import { captureDemoRegistrationHandoff } from "../../lib/demoRegistrationHandoff";

const { mockRecordDemoRegistrationCtaClick } = vi.hoisted(() => ({
  mockRecordDemoRegistrationCtaClick: vi.fn(),
}));
vi.mock("../../lib/demoFunnelEvents", () => ({
  recordDemoRegistrationCtaClick: mockRecordDemoRegistrationCtaClick,
}));

describe("DemoBanner registration handoff", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses the shared absolute app registration URL with retained attribution", () => {
    captureDemoRegistrationHandoff({
      explicitEntry: true,
      search: "?yclid=click&utm_source=yandex",
      now: Date.now(),
    });

    render(<DemoBanner />);

    const link = screen.getByRole("link", {
      name: "Создать компанию",
    });
    const url = new URL(link.getAttribute("href") as string);
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://app.kontrolsmen.ru/register"
    );
    expect(url.searchParams.get("registration_source")).toBe("demo");
    expect(url.searchParams.get("yclid")).toBe("click");
    expect(url.searchParams.get("utm_source")).toBe("yandex");
    expect(url.searchParams.has("demo_session")).toBe(false);
    expect(url.hash).toMatch(/^#demo_session=[A-Za-z0-9_-]{43}$/);

    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(mockRecordDemoRegistrationCtaClick).toHaveBeenCalledTimes(1);
  });

  it("keeps only the compact demo notice and registration action", () => {
    render(<DemoBanner />);

    expect(
      screen.getByText("Демо · Тестовые данные, изменения не сохраняются.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Демо-переключатель роли")
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Мой рабочий день/)).not.toBeInTheDocument();
  });

  it("uses compact spacing before the small-screen breakpoint", () => {
    render(<DemoBanner />);

    expect(
      screen
        .getByText("Демо · Тестовые данные, изменения не сохраняются.")
        .closest("[class*='mb-3']")
    ).toHaveClass("px-3", "py-2", "sm:px-4");
  });
});
