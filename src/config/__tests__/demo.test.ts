import { redirectToLogin } from "../demo";

describe("redirectToLogin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses window.location.replace("/login") and does not use assign or pushState', () => {
    const replaceSpy = vi.fn();
    const assignSpy = vi.fn();
    const pushStateSpy = vi.fn();

    vi.stubGlobal("window", {
      location: {
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
