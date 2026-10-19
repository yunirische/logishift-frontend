// @vitest-environment-options {"url":"https://kontrolsmen.ru/"}
import { StrictMode, type ComponentType } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ANALYTICS_CONSENT_OPEN_EVENT, ANALYTICS_CONSENT_STORAGE_KEY } from "../../config/analytics";
import { reloadLocation } from "../../services/navigation";

vi.mock("../../services/navigation", () => ({ reloadLocation: vi.fn() }));
const src = "https://top-fwz1.mail.ru/js/code.js";
let Consent: ComponentType;

describe("shared analytics consent lifecycle", () => {
  beforeEach(async () => {
    cleanup(); vi.resetModules(); vi.clearAllMocks();
    document.head.innerHTML = "";
    localStorage.clear(); delete window._tmr; delete window.ym;
    window.history.replaceState({}, "", "/");
    Consent = (await import("../AnalyticsConsent")).default;
  });
  afterEach(() => { cleanup(); delete window._tmr; delete window.ym; });

  it("loads neither vendor before a choice, then loads each once after accept despite render/remount", () => {
    const view=render(<StrictMode><Consent /></StrictMode>);
    expect(document.querySelector(`script[src="${src}"]`)).toBeNull();
    expect(window._tmr).toBeUndefined(); expect(window.ym).toBeUndefined();
    fireEvent.click(screen.getByRole("button",{name:"Принять"}));
    view.rerender(<StrictMode><Consent /></StrictMode>);
    view.unmount(); render(<Consent />);
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1);
    expect(window._tmr).toHaveLength(1);
    expect(window.ym?.a).toHaveLength(1);
    expect(window.ym?.a?.[0][0]).toBe(110142109);
    expect(window.ym?.a?.[0][1]).toBe("init");
    expect(window.ym?.a?.[0][2]).toMatchObject({ssr:true,webvisor:true,clickmap:true,trackLinks:true,accurateTrackBounce:true});
    expect(document.querySelectorAll('script[src="https://mc.yandex.ru/metrika/tag.js?id=110142109"]')).toHaveLength(1);
  });

  it.each(["stored", "clicked"])("does not load either vendor for rejected consent (%s)", mode => {
    if(mode==="stored") localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY,"rejected");
    render(<Consent />);
    if(mode==="clicked") fireEvent.click(screen.getByRole("button",{name:"Отклонить"}));
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(0);
    expect(window._tmr).toBeUndefined(); expect(window.ym).toBeUndefined();
    expect(reloadLocation).not.toHaveBeenCalled();
  });

  it("reuses stored accepted consent and preserves the existing rejection cleanup/reload semantics", () => {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY,"accepted");
    render(<Consent />);
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1);
    const ym=vi.fn(); window.ym=ym;
    document.cookie="tmr_lvid=fixture; path=/";
    document.cookie="_ym_uid=fixture; path=/";
    vi.mocked(reloadLocation).mockImplementationOnce(()=>{
      expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe("rejected");
      expect(document.getElementById("tmr-code")).toBeNull();
      expect(window._tmr).toEqual([]);
      expect(document.cookie).not.toMatch(/tmr_lvid=|_ym_uid=/);
    });
    act(() => window.dispatchEvent(new Event(ANALYTICS_CONSENT_OPEN_EVENT)));
    fireEvent.click(screen.getByRole("button",{name:"Отклонить"}));
    expect(ym).toHaveBeenCalledExactlyOnceWith(110142109,"destruct");
    expect(reloadLocation).toHaveBeenCalledTimes(1);
  });

  it("does not initialize either vendor on registration/legal routes with stored accepted consent", () => {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY,"accepted");
    for(const pathname of ["/register","/privacy","/login","/payment/success"]){
      window.history.replaceState({},"",pathname);
      const view=render(<Consent />);view.unmount();
    }
    expect(window._tmr).toBeUndefined();expect(window.ym).toBeUndefined();
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(0);
  });
});
