import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  DEMO_ENTRY_QUERY_PARAM,
  isDemoHostname,
  isDemoTenantId,
} from "../config/demo";
import { useAuth } from "./AuthContext";
import {
  DemoScenarioShift,
  DemoSessionState,
  EMPTY_DEMO_SESSION,
  StartDemoShiftInput,
  clearDemoSessionStorage,
  clearObsoleteDemoActiveShiftKeys,
  createDemoScenarioShift,
  finishDemoScenarioShift,
  readDemoSession,
  writeDemoSession,
} from "../lib/demoSession";

type DemoSessionAction =
  | { type: "start"; shift: DemoScenarioShift }
  | { type: "finish"; shift: DemoScenarioShift }
  | { type: "reset" };

interface DemoSessionContextValue extends DemoSessionState {
  startDemoShift: (input: StartDemoShiftInput) => DemoScenarioShift | null;
  finishDemoShift: () => DemoScenarioShift | null;
  resetDemoSession: () => void;
}

const defaultValue: DemoSessionContextValue = {
  ...EMPTY_DEMO_SESSION,
  startDemoShift: () => null,
  finishDemoShift: () => null,
  resetDemoSession: () => undefined,
};

const DemoSessionContext = createContext<DemoSessionContextValue>(defaultValue);

const reducer = (
  state: DemoSessionState,
  action: DemoSessionAction
): DemoSessionState => {
  switch (action.type) {
    case "start":
      return { ...state, activeShift: action.shift };
    case "finish":
      return {
        activeShift: null,
        finishedShifts: [action.shift, ...state.finishedShifts],
      };
    case "reset":
      return EMPTY_DEMO_SESSION;
  }
};

export const DemoSessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const isDemoHost =
    typeof window !== "undefined" && isDemoHostname(window.location.hostname);
  const enabled = isDemoHost || isDemoTenantId(user?.tenant_id);
  const isExplicitNewEntry =
    isDemoHost &&
    new URLSearchParams(window.location.search).get(DEMO_ENTRY_QUERY_PARAM) ===
      "1";

  const [state, dispatch] = useReducer(
    reducer,
    { enabled, isExplicitNewEntry },
    ({ enabled: initialEnabled, isExplicitNewEntry: initialEntry }) => {
      if (!initialEnabled) return EMPTY_DEMO_SESSION;

      clearObsoleteDemoActiveShiftKeys(localStorage);
      if (initialEntry) {
        clearDemoSessionStorage(localStorage);
        return EMPTY_DEMO_SESSION;
      }

      return readDemoSession(localStorage);
    }
  );
  const hasCompletedInitialPersistencePass = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!hasCompletedInitialPersistencePass.current) {
      hasCompletedInitialPersistencePass.current = true;
      return;
    }
    writeDemoSession(localStorage, state);
  }, [enabled, state]);

  const startDemoShift = useCallback(
    (input: StartDemoShiftInput) => {
      if (!enabled) return null;
      const shift = createDemoScenarioShift(input);
      dispatch({ type: "start", shift });
      return shift;
    },
    [enabled]
  );

  const finishDemoShift = useCallback(() => {
    if (!enabled || !state.activeShift) return null;
    const finishedShift = finishDemoScenarioShift(state.activeShift);
    dispatch({ type: "finish", shift: finishedShift });
    return finishedShift;
  }, [enabled, state.activeShift]);

  const resetDemoSession = useCallback(() => {
    clearDemoSessionStorage(localStorage);
    dispatch({ type: "reset" });
  }, []);

  const value = useMemo<DemoSessionContextValue>(
    () => ({
      ...state,
      startDemoShift,
      finishDemoShift,
      resetDemoSession,
    }),
    [finishDemoShift, resetDemoSession, startDemoShift, state]
  );

  return (
    <DemoSessionContext.Provider value={value}>
      {children}
    </DemoSessionContext.Provider>
  );
};

export const useDemoSession = (): DemoSessionContextValue =>
  useContext(DemoSessionContext);
