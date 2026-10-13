import { DemoSessionState } from "./demoSession";

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
    if (shiftId?.startsWith("demo-shift:")) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ shiftId, view }));
    }
  } catch {
    // A blocked browser store must not prevent navigation.
  }
};

export const shouldResumeDemoCabinet = (session: DemoSessionState): boolean => {
  const id = session.activeShift?.id || session.finishedShifts[0]?.id;
  return Boolean(id && readDemoPresentation(id) === "cabinet");
};
