import { fireEvent, render, screen } from "@testing-library/react";
import DemoBanner from "../DemoBanner";
import { captureDemoRegistrationHandoff } from "../../lib/demoRegistrationHandoff";

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

  it("distinguishes an employee's own shift from an admin-created shift", () => {
    render(<DemoBanner demoPersona="admin" setDemoPersona={vi.fn()} />);

    expect(
      screen.getByText(
        /В разделе «Мой рабочий день» сотрудник ведёт собственную смену\./
      )
    ).toHaveTextContent(
      "В реестре администратор может создать смену за другого водителя."
    );
  });

  it("uses compact spacing before the small-screen breakpoint", () => {
    render(<DemoBanner demoPersona="admin" setDemoPersona={vi.fn()} />);

    expect(
      screen.getByText("Демо-организация").closest("[class*='mb-4']")
    ).toHaveClass("px-3", "py-2.5", "sm:px-4", "sm:py-3");
  });
});
