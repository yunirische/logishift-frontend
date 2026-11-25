import { AlertCircle } from "lucide-react";

export function WorkPhotoViolation({ reason }: { reason: string }) {
  return (
    <div className="mt-2 max-w-full rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
      <p className="flex items-start gap-1.5 font-semibold">
        <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Закрыто без обязательного фотоотчёта
      </p>
      <p className="mt-1 [overflow-wrap:anywhere]">{reason}</p>
    </div>
  );
}
