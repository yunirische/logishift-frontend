import { readDemoRegistrationHandoff } from "./demoRegistrationHandoff";
import { getOrCreateDemoFunnelSession } from "./demoFunnelSession";
import { recordDemoFunnelEvent } from "../services/api";

export const DEMO_FUNNEL_EVENT_TYPES = [
  "demo_session_started",
  "demo_shift_started",
  "demo_owner_result_shown",
  "demo_scenario_completed",
  "demo_registration_cta_clicked",
] as const;

export type DemoFunnelEventType =
  (typeof DEMO_FUNNEL_EVENT_TYPES)[number];

export const recordCurrentDemoFunnelEvent = async (
  eventType: DemoFunnelEventType,
  options: { keepalive?: boolean } = {}
): Promise<void> => {
  const session = getOrCreateDemoFunnelSession({ explicitEntry: false });
  if (!session) return;
  const attribution =
    readDemoRegistrationHandoff()?.attribution || {};
  await recordDemoFunnelEvent(
    eventType,
    session.key,
    attribution,
    options
  );
};

export const recordDemoRegistrationCtaClick = (): void => {
  void recordCurrentDemoFunnelEvent(
    "demo_registration_cta_clicked",
    { keepalive: true }
  ).catch(() => undefined);
};
