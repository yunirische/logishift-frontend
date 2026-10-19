import { StrictMode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import LandingView from "../LandingView";
import RegisterView from "../RegisterView";
import { recordPublicFunnelEvent } from "../../services/api";
import { assignLocation } from "../../services/navigation";
import { readDemoFunnelSession } from "../../lib/demoFunnelSession";

vi.mock("../../services/api", () => ({ default: { post: vi.fn() }, acceptInvite: vi.fn(),
  recordPublicFunnelEvent: vi.fn().mockResolvedValue(undefined), recordDemoFunnelEvent: vi.fn() }));
vi.mock("../../services/navigation", () => ({ assignLocation: vi.fn(), replaceLocation: vi.fn() }));
const query = "utm_source=vk&utm_medium=cpc&utm_campaign=core_active_30d&utm_content=creative_01&yclid=test-click";

describe("public funnel producers", () => {
  beforeEach(() => {
    localStorage.clear(); vi.clearAllMocks();
    vi.mocked(recordPublicFunnelEvent).mockResolvedValue(undefined);
    window.history.replaceState({}, "", `/?${query}`);
  });

  it("observes an actual landing render and reuses one key across StrictMode and refresh", () => {
    const view = render(<StrictMode><LandingView /></StrictMode>);
    const calls = vi.mocked(recordPublicFunnelEvent).mock.calls;
    expect(calls.length).toBe(2);
    expect(calls.every(call => call[0] === "landing_viewed")).toBe(true);
    const key = calls[0][1];
    view.unmount();
    render(<LandingView />);
    expect(vi.mocked(recordPublicFunnelEvent).mock.calls.every(call => call[1] === key)).toBe(true);
    expect(calls[0][2]).toEqual({ utm_source: "vk", utm_medium: "cpc", utm_campaign: "core_active_30d",
      utm_content: "creative_01", yclid: "test-click" });
    expect(calls[0][3]).toBe(false);
  });

  it.each(["demo", "registration"] as const)("records %s click and navigates without waiting for analytics", async path => {
    window.history.replaceState({}, "", `/?${query}&email=discarded#measurement_internal=1`);
    render(<LandingView />);
    const session = readDemoFunnelSession();
    vi.mocked(recordPublicFunnelEvent).mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(path === "demo" ? screen.getByRole("button", { name: "Посмотреть демо" }) :
      screen.getAllByRole("button", { name: "Начать бесплатно" })[0]);
    expect(assignLocation).toHaveBeenCalledTimes(1);
    const url = new URL(vi.mocked(assignLocation).mock.calls[0][0]);
    expect(url.hostname).toBe(path === "demo" ? "demo.kontrolsmen.ru" : "app.kontrolsmen.ru");
    expect(url.pathname).toBe(path === "demo" ? "/" : "/register");
    expect(new URLSearchParams(url.hash.slice(1)).get("demo_session")).toBe(session?.key);
    expect(new URLSearchParams(url.hash.slice(1)).get("measurement_internal")).toBe("1");
    expect(url.searchParams.get("utm_content")).toBe("creative_01");
    expect(url.searchParams.get("yclid")).toBe("test-click");
    expect(url.searchParams.has("email")).toBe(false);
    expect(recordPublicFunnelEvent).toHaveBeenLastCalledWith(path === "demo" ? "landing_demo_clicked" :
      "landing_registration_clicked", session?.key, expect.objectContaining({ utm_source: "vk" }), true);
    await Promise.resolve();
  });

  it("strips an internal registration handoff, records the admin view and keeps its key after refresh", () => {
    const key = "r".repeat(43), expiresAt = Date.now() + 3600000;
    window.history.replaceState({}, "", `/register?${query}#offer&demo_session=${key}&demo_session_expires=${expiresAt}&measurement_internal=1`);
    const view = render(<StrictMode><RegisterView /></StrictMode>);
    expect(window.location.hash).toBe("#offer");
    expect(recordPublicFunnelEvent).toHaveBeenLastCalledWith("registration_viewed", key,
      expect.objectContaining({ utm_campaign: "core_active_30d" }), true);
    view.unmount(); render(<RegisterView />);
    expect(vi.mocked(recordPublicFunnelEvent).mock.calls.every(call => call[1] === key && call[3] === true)).toBe(true);
  });

  it("does not count an invitation/driver form as a company registration view", () => {
    window.history.replaceState({}, "", "/register?code=ABC123");
    render(<RegisterView />);
    expect(screen.getByLabelText(/код приглашения/i)).toHaveValue("ABC123");
    expect(recordPublicFunnelEvent).not.toHaveBeenCalled();
  });
});
