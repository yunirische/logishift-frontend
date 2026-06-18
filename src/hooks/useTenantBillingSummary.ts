import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { getTenantBilling } from "../services/api";
import { TenantBillingSummary } from "../types";

type UseTenantBillingSummaryOptions = {
  autoLoad?: boolean;
};

type UseTenantBillingSummaryResult = {
  billing: TenantBillingSummary | null;
  isLoading: boolean;
  error: string | null;
  refreshBilling: () => Promise<TenantBillingSummary | null>;
  setBilling: Dispatch<SetStateAction<TenantBillingSummary | null>>;
};

const DEFAULT_ERROR_MESSAGE = "Не удалось загрузить данные по тарифу.";

export const useTenantBillingSummary = (
  options: UseTenantBillingSummaryOptions = {}
): UseTenantBillingSummaryResult => {
  const { autoLoad = true } = options;
  const [billing, setBilling] = useState<TenantBillingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshBilling = useCallback(async () => {
    if (isMountedRef.current) {
      setError(null);
    }

    try {
      const billingData = await getTenantBilling();
      if (isMountedRef.current) {
        setBilling(billingData);
      }
      return billingData;
    } catch (error) {
      if (isMountedRef.current) {
        if (error instanceof Error && error.message) {
          setError(error.message);
        } else {
          setError(DEFAULT_ERROR_MESSAGE);
        }
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void refreshBilling();
  }, [autoLoad, refreshBilling]);

  return {
    billing,
    isLoading,
    error,
    refreshBilling,
    setBilling,
  };
};
