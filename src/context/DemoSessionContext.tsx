import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  DEMO_ENTRY_QUERY_PARAM,
  isDemoHostname,
  isDemoTenantId,
} from "../config/demo";
import { useAuth } from "./AuthContext";
import {
  DemoPhotoMetadata,
  DemoPhotoType,
  DemoScenarioShift,
  DemoSessionState,
  EMPTY_DEMO_SESSION,
  StartDemoShiftInput,
  addDemoPhotoMetadata,
  addDemoShiftComment as addCommentToShift,
  clearDemoSessionStorage,
  clearObsoleteDemoActiveShiftKeys,
  createDemoScenarioShift,
  readDemoSession,
  replaceDemoShift,
  requestDemoShiftFinish,
  writeDemoSession,
} from "../lib/demoSession";

type DemoSessionAction =
  | { type: "replace"; state: DemoSessionState }
  | { type: "reset" };

export interface DemoPhotoPreview {
  url: string;
  fileName: string;
}

interface DemoSessionContextValue extends DemoSessionState {
  startDemoShift: (input: StartDemoShiftInput) => DemoScenarioShift | null;
  requestDemoShiftFinish: () => DemoScenarioShift | null;
  finishDemoShift: () => DemoScenarioShift | null;
  addDemoShiftComment: (
    shiftId: string,
    text: string
  ) => DemoScenarioShift | null;
  addDemoShiftPhoto: (
    shiftId: string,
    type: DemoPhotoType,
    file: File
  ) => DemoScenarioShift | null;
  getDemoPhotoPreview: (
    shiftId: string,
    type: DemoPhotoType
  ) => DemoPhotoPreview | null;
  resetDemoSession: () => void;
}

const defaultValue: DemoSessionContextValue = {
  ...EMPTY_DEMO_SESSION,
  startDemoShift: () => null,
  requestDemoShiftFinish: () => null,
  finishDemoShift: () => null,
  addDemoShiftComment: () => null,
  addDemoShiftPhoto: () => null,
  getDemoPhotoPreview: () => null,
  resetDemoSession: () => undefined,
};

const DemoSessionContext = createContext<DemoSessionContextValue>(defaultValue);

const reducer = (
  state: DemoSessionState,
  action: DemoSessionAction
): DemoSessionState =>
  action.type === "replace" ? action.state : EMPTY_DEMO_SESSION;

const previewKey = (shiftId: string, type: DemoPhotoType) =>
  `${shiftId}:${type}`;

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
  const [previews, setPreviews] = useState<Record<string, DemoPhotoPreview>>({});
  const previewsRef = useRef(previews);
  const hasCompletedInitialPersistencePass = useRef(false);
  const wasDemoTenantRef = useRef(isDemoTenantId(user?.tenant_id));

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  const revokeAllPreviews = useCallback(() => {
    Object.values(previewsRef.current).forEach(({ url }) =>
      URL.revokeObjectURL(url)
    );
    previewsRef.current = {};
    setPreviews({});
  }, []);

  const resetDemoSession = useCallback(() => {
    revokeAllPreviews();
    clearDemoSessionStorage(localStorage);
    dispatch({ type: "reset" });
  }, [revokeAllPreviews]);

  useEffect(
    () => () => {
      Object.values(previewsRef.current).forEach(({ url }) =>
        URL.revokeObjectURL(url)
      );
      previewsRef.current = {};
    },
    []
  );

  useEffect(() => {
    const isDemoTenant = isDemoTenantId(user?.tenant_id);
    if (wasDemoTenantRef.current && !isDemoTenant) {
      resetDemoSession();
    }
    wasDemoTenantRef.current = isDemoTenant;
  }, [resetDemoSession, user?.tenant_id]);

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
      dispatch({
        type: "replace",
        state: { ...state, activeShift: shift },
      });
      return shift;
    },
    [enabled, state]
  );

  const mutateShift = useCallback(
    (
      shiftId: string,
      update: (shift: DemoScenarioShift) => DemoScenarioShift | null
    ) => {
      if (!enabled || !shiftId.startsWith("demo-shift:")) return null;
      const result = replaceDemoShift(state, shiftId, update);
      if (!result) return null;
      dispatch({ type: "replace", state: result.state });
      return result.shift;
    },
    [enabled, state]
  );

  const requestFinish = useCallback(() => {
    if (!state.activeShift) return null;
    return mutateShift(state.activeShift.id, (shift) =>
      requestDemoShiftFinish(shift)
    );
  }, [mutateShift, state.activeShift]);

  const addDemoShiftComment = useCallback(
    (shiftId: string, text: string) =>
      mutateShift(shiftId, (shift) => addCommentToShift(shift, text)),
    [mutateShift]
  );

  const addDemoShiftPhoto = useCallback(
    (shiftId: string, type: DemoPhotoType, file: File) => {
      const metadata: DemoPhotoMetadata = {
        type,
        fileName: file.name.slice(0, 255),
        mimeType: file.type.toLowerCase(),
        size: file.size,
        addedAt: new Date().toISOString(),
      };
      const shift = mutateShift(shiftId, (current) =>
        addDemoPhotoMetadata(current, metadata)
      );
      if (!shift) return null;

      const key = previewKey(shiftId, type);
      const previous = previewsRef.current[key];
      if (previous) URL.revokeObjectURL(previous.url);
      const url = URL.createObjectURL(file);
      setPreviews((current) => ({
        ...current,
        [key]: { url, fileName: metadata.fileName },
      }));
      return shift;
    },
    [mutateShift]
  );

  const getDemoPhotoPreview = useCallback(
    (shiftId: string, type: DemoPhotoType) =>
      previews[previewKey(shiftId, type)] || null,
    [previews]
  );

  const value = useMemo<DemoSessionContextValue>(
    () => ({
      ...state,
      startDemoShift,
      requestDemoShiftFinish: requestFinish,
      finishDemoShift: requestFinish,
      addDemoShiftComment,
      addDemoShiftPhoto,
      getDemoPhotoPreview,
      resetDemoSession,
    }),
    [
      addDemoShiftComment,
      addDemoShiftPhoto,
      getDemoPhotoPreview,
      requestFinish,
      resetDemoSession,
      startDemoShift,
      state,
    ]
  );

  return (
    <DemoSessionContext.Provider value={value}>
      {children}
    </DemoSessionContext.Provider>
  );
};

export const useDemoSession = (): DemoSessionContextValue =>
  useContext(DemoSessionContext);
