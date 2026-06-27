import { Shift } from "../types";

export type FinishedShiftPhotoType = "start" | "end" | "invoice";

export type FinishedShiftPhotoFlags = Record<FinishedShiftPhotoType, boolean>;

export type FinishedShiftPhotoSlot = {
  type: FinishedShiftPhotoType;
  label: string;
  required: boolean;
  hasPhoto: boolean;
  canBackfill: boolean;
};

const PHOTO_LABELS: Record<FinishedShiftPhotoType, string> = {
  start: "Одометр перед началом",
  end: "Одометр после завершения",
  invoice: "Накладная",
};

const emptyFlags = (): FinishedShiftPhotoFlags => ({
  start: false,
  end: false,
  invoice: false,
});

export const getFinishedShiftProofRequirements = (
  shift: Shift
): FinishedShiftPhotoFlags => ({
  start:
    shift.proof_requirements?.start ??
    shift.requires_odo_start ??
    shift.site?.odometer_required ??
    false,
  end:
    shift.proof_requirements?.end ??
    shift.requires_odo_end ??
    shift.site?.odometer_required ??
    false,
  invoice:
    shift.proof_requirements?.invoice ??
    shift.requires_invoice ??
    shift.site?.invoice_required ??
    false,
});

export const getFinishedShiftPhotoPresence = (
  shift: Shift
): FinishedShiftPhotoFlags => ({
  start: shift.photos?.start ?? Boolean(shift.photo_start_url),
  end: shift.photos?.end ?? Boolean(shift.photo_end_url),
  invoice: shift.photos?.invoice ?? Boolean(shift.photo_invoice_url),
});

export const getFinishedShiftPhotoSlots = (
  shift: Shift
): FinishedShiftPhotoSlot[] => {
  const requirements = getFinishedShiftProofRequirements(shift);
  const photos = getFinishedShiftPhotoPresence(shift);

  return (Object.keys(PHOTO_LABELS) as FinishedShiftPhotoType[])
    .filter((type) => requirements[type])
    .map((type) => ({
      type,
      label: PHOTO_LABELS[type],
      required: requirements[type],
      hasPhoto: photos[type],
      canBackfill: requirements[type] && !photos[type],
    }));
};

export const getInitialFinishedShiftPhotoFlags = emptyFlags;
