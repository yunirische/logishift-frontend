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

    render(<DemoBanner demoPersona="admin" setDemoPersona={vi.fn()} />);

    const link = screen.getByRole("link", {
      name: "создайте свою компанию",
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

    fireEvent.click(link);
    expect(mockRecordDemoRegistrationCtaClick).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing persona controls independent from registration", () => {
    const setDemoPersona = vi.fn();
    render(
      <DemoBanner demoPersona="admin" setDemoPersona={setDemoPersona} />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Водитель (мобильный)" })
    );

    expect(setDemoPersona).toHaveBeenCalledWith("driver");
  });

  it("distinguishes the demo admin's own shift from a shift created for another driver", () => {
    render(<DemoBanner demoPersona="admin" setDemoPersona={vi.fn()} />);

    expect(
      screen.getByText(
        /В разделе «Мой рабочий день» администратор ведёт собственную смену\./
      )
    ).toHaveTextContent(
      "В реестре он может создать смену за другого водителя."
    );
  });

  it("uses compact spacing before the small-screen breakpoint", () => {
    render(<DemoBanner demoPersona="admin" setDemoPersona={vi.fn()} />);

    expect(
      screen.getByText("Демо-организация").closest("[class*='mb-4']")
    ).toHaveClass("px-3", "py-2.5", "sm:px-4", "sm:py-3");
  });
});
