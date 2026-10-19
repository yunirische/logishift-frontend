import { prepareAttributionSession, readDemoRegistrationHandoff } from "./demoRegistrationHandoff";
import { getOrCreateDemoFunnelSession } from "./demoFunnelSession";
import { recordDemoFunnelEvent, recordPublicFunnelEvent } from "../services/api";

export const DEMO_FUNNEL_EVENT_TYPES = [
  "demo_session_started",
  "demo_overview_shown",
  "demo_cabinet_requested",
  "demo_tour_shown",
  "demo_tour_choice_shown",
  "demo_driver_scenario_requested",
  "demo_driver_view_shown",
  "demo_shift_selection_shown",
  "demo_shift_start_ready",
  "demo_shift_started",
  "demo_owner_result_shown",
  "demo_scenario_completed",
  "demo_registration_cta_clicked",
] as const;

export type DemoFunnelEventType =
  (typeof DEMO_FUNNEL_EVENT_TYPES)[number];

export const PUBLIC_FUNNEL_EVENT_TYPES = [
  "landing_viewed", "landing_demo_clicked", "landing_registration_clicked", "registration_viewed",
] as const;
export type PublicFunnelEventType = (typeof PUBLIC_FUNNEL_EVENT_TYPES)[number];

export const recordCurrentPublicFunnelEvent = async (eventType: PublicFunnelEventType): Promise<void> => {
  const session = prepareAttributionSession();
  if (!session) return;
  await recordPublicFunnelEvent(eventType, session.key, readDemoRegistrationHandoff()?.attribution || {},
    session.isInternal);
};

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
    session.isInternal ? { ...options, isInternal: true } : options
  );
};

export const recordDemoRegistrationCtaClick = (): void => {
  void recordCurrentDemoFunnelEvent(
    "demo_registration_cta_clicked",
    { keepalive: true }
  ).catch(() => undefined);
};
