import type { DemoSessionState } from "./demoSession";
import { readDemoFunnelSession } from "./demoFunnelSession";

const STORAGE_KEY = "logishift_demo_presentation_v1";
type Presentation = "driver" | "cabinet";

// View preference only; the synthetic shift remains the source of workflow state.
export const readDemoPresentation = (shiftId: string): Presentation | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved?.shiftId === shiftId && ["driver", "cabinet"].includes(saved.view)
      ? saved.view
      : null;
  } catch {
    return null;
  }
};

export const rememberDemoPresentation = (view: Presentation, shiftId?: string): void => {
  try {
    const sessionExpiresAt = readDemoFunnelSession()?.expiresAt;
    if (shiftId?.startsWith("demo-shift:") || sessionExpiresAt) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ shiftId, view, sessionExpiresAt }));
    }
  } catch {
    // A blocked browser store must not prevent navigation.
  }
};

export const clearDemoPresentation = (): void => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Navigation remains usable. */ }
};

export const getInitialDemoPresentation = (session: DemoSessionState): "overview" | "scenario" | "cabinet" => {
  if (session.activeShift || session.finishedShifts.length) {
    return shouldResumeDemoCabinet(session) ? "cabinet" : "scenario";
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const funnel = readDemoFunnelSession();
    if (funnel && saved?.sessionExpiresAt === funnel.expiresAt) {
      if (saved.view === "driver") return "scenario";
      if (saved.view === "cabinet") return "cabinet";
    }
  } catch { /* Missing or unavailable preference means a fresh overview. */ }
  return "overview";
};

export const shouldResumeDemoCabinet = (session: DemoSessionState): boolean => {
  const id = session.activeShift?.id || session.finishedShifts[0]?.id;
  return Boolean(id && readDemoPresentation(id) === "cabinet");
};
