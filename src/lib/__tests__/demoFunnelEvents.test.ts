import {
  recordCurrentDemoFunnelEvent,
  recordDemoRegistrationCtaClick,
} from "../demoFunnelEvents";
import { recordDemoFunnelEvent } from "../../services/api";
import { captureDemoRegistrationHandoff } from "../demoRegistrationHandoff";
import { getOrCreateDemoFunnelSession } from "../demoFunnelSession";

vi.mock("../../services/api", () => ({
  recordDemoFunnelEvent: vi.fn(),
}));

describe("demo funnel event producer", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("reuses one browser session and sends only allowlisted attribution", async () => {
    const session = getOrCreateDemoFunnelSession({
      explicitEntry: true,
      storage: localStorage,
    });
    captureDemoRegistrationHandoff({
      explicitEntry: true,
      search: "?utm_source=yandex&email=private@example.test",
      storage: localStorage,
    });
    vi.mocked(recordDemoFunnelEvent).mockResolvedValue(undefined);

    await recordCurrentDemoFunnelEvent("demo_scenario_completed");
    await recordCurrentDemoFunnelEvent("demo_scenario_completed");

    expect(recordDemoFunnelEvent).toHaveBeenCalledTimes(2);
    expect(recordDemoFunnelEvent).toHaveBeenNthCalledWith(
      1,
      "demo_scenario_completed",
      session?.key,
      { utm_source: "yandex" },
      {}
    );
    expect(recordDemoFunnelEvent).toHaveBeenNthCalledWith(
      2,
      "demo_scenario_completed",
      session?.key,
      { utm_source: "yandex" },
      {}
    );
  });

  it("keeps CTA navigation non-blocking when analytics fails", async () => {
    getOrCreateDemoFunnelSession({
      explicitEntry: true,
      storage: localStorage,
    });
    vi.mocked(recordDemoFunnelEvent).mockRejectedValue(
      new Error("network unavailable")
    );

    expect(() => recordDemoRegistrationCtaClick()).not.toThrow();
    await Promise.resolve();
    expect(recordDemoFunnelEvent).toHaveBeenCalledWith(
      "demo_registration_cta_clicked",
      expect.any(String),
      {},
      { keepalive: true }
    );
  });
});
