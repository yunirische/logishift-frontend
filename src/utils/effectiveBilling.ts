import {
  BillingEntitlementSource,
  BillingUsageMetric,
  EffectiveBillingPlanInfo,
  TenantBillingSummary,
} from "../types";

export const entitlementSourceLabel = (source: BillingEntitlementSource | null) => {
  switch (source) {
    case "free":
      return "Бесплатный";
    case "paid":
      return "Оплаченный";
    case "pilot":
      return "Пилотный";
    case "individual":
      return "Индивидуальный";
    case "internal_demo":
      return "Внутренний";
    default:
      return "Статус уточняется";
  }
};

export type EffectiveBillingDisplay = {
  plan: EffectiveBillingPlanInfo | null;
  source: BillingEntitlementSource | null;
  status: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  usage: {
    drivers: BillingUsageMetric;
    trucks: BillingUsageMetric;
    sites: BillingUsageMetric;
  } | null;
  isLegacy: boolean;
};

export const resolveEffectiveBillingDisplay = (
  billing: TenantBillingSummary | null | undefined
): EffectiveBillingDisplay => {
  const entitlement = billing?.entitlement || null;
  const hasEffectiveFields = Boolean(billing?.effective_plan || entitlement);

  return {
    plan: billing?.effective_plan || billing?.current_plan || null,
    source: entitlement?.source || null,
    status: entitlement?.status || null,
    startsAt: entitlement?.starts_at || null,
    expiresAt: entitlement ? entitlement.expires_at : (billing?.subscription_expires_at || null),
    usage: billing?.usage || null,
    isLegacy: !hasEffectiveFields,
  };
};
