import { getDemoEntryUrl, redirectToLogin } from "../demo";

describe("getDemoEntryUrl", () => {
  it('returns the demo root explicit entry URL and not "/login"', () => {
    expect(getDemoEntryUrl()).toBe("https://demo.kontrolsmen.ru/?enterDemo=1");
  });
});

describe("redirectToLogin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the production app login target when called from the demo host", () => {
    const replaceSpy = vi.fn();
    const assignSpy = vi.fn();
    const pushStateSpy = vi.fn();

    vi.stubGlobal("window", {
      location: {
        hostname: "demo.kontrolsmen.ru",
        replace: replaceSpy,
        assign: assignSpy,
      },
      history: {
        pushState: pushStateSpy,
      },
    });

    redirectToLogin();

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledWith(
      "https://app.kontrolsmen.ru/login"
    );
    expect(assignSpy).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('keeps "/login" for non-demo hosts and does not use assign or pushState', () => {
    const replaceSpy = vi.fn();
    const assignSpy = vi.fn();
    const pushStateSpy = vi.fn();

    vi.stubGlobal("window", {
      location: {
        hostname: "app.kontrolsmen.ru",
        replace: replaceSpy,
        assign: assignSpy,
      },
      history: {
        pushState: pushStateSpy,
      },
    });

    redirectToLogin();

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledWith("/login");
    expect(assignSpy).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
  });
});
