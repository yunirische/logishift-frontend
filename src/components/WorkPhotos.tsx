import { useActionDialog } from "./ActionDialog";
import { Camera, CheckCircle2, Image as ImageIcon, ImagePlus, Pencil, Trash2, X } from "lucide-react";
import React, { useEffect, useId, useRef, useState } from "react";
import { fetchWorkPhotoBlob } from "../services/api";
import { deleteWorkPhoto, listWorkPhotos, updateWorkPhotoCaption, uploadWorkPhoto, WorkPhoto } from "../services/workPhotos";
import { formatForDisplay } from "../utils/dateUtils";
import { newWorkPhotoUploadId, prepareWorkPhotoFile } from "../utils/workPhotoFile";
import { Button, Card } from "./ui";

const MAX_PHOTOS = 10;
const CAPTION_LENGTH = 200;
const primaryButton = "min-h-10 bg-[#0a192f] text-sm font-semibold text-white hover:bg-[#152238]";
const secondaryButton = "min-h-10 border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50";
const captionClass = "w-full min-w-0 resize-y rounded-lg border border-slate-200 px-3 py-2 text-base focus:border-slate-500 focus:outline-none";

type Draft = { original: File; file?: File; uploadId: string };

function WorkPhotoDraftPreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url ? <img src={url} alt="Предпросмотр выбранного фото" className="max-h-40 max-w-full rounded-lg object-contain" /> : null;
}
type Props = {
  shiftId: number;
  timezone: string;
  mode: "driver" | "admin" | "read";
  required?: boolean;
  onChange?: () => void;
  onCountChange?: (count: number) => void;
  onUploadPendingChange?: (pending: boolean) => void;
  refreshKey?: number;
};

function WorkPhotoImage({ shiftId, photo, timezone, busy, onDelete, onEdit, children }: {
  shiftId: number;
  photo: WorkPhoto;
  timezone: string;
  busy: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  children?: React.ReactNode;
}) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const previewId = useId();
  const thumbnailRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setFailed(false);
    fetchWorkPhotoBlob(shiftId, photo.id).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shiftId, photo.id, retry]);

  useEffect(() => {
    if (expanded) previewRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [expanded]);

  const timestamp = formatForDisplay(photo.created_at, timezone, "DD.MM.YYYY HH:mm");
  return (
    <li className="min-w-0 rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex min-w-0 items-start gap-3">
        {url ? (
          <button
            ref={thumbnailRef}
            type="button"
            aria-label="Открыть фото"
            aria-expanded={expanded}
            aria-controls={expanded ? previewId : undefined}
            className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-600"
            onClick={() => setExpanded(!expanded)}
          >
            <img alt="" src={url} className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400" aria-hidden="true">
            <ImageIcon size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <time dateTime={photo.created_at} className="block text-xs font-medium text-slate-500">{timestamp}</time>
          {photo.caption && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700">{photo.caption}</p>}
          {failed && (
            <button type="button" onClick={() => setRetry(retry + 1)} className="min-h-9 text-left text-xs font-medium text-red-700 underline">
              Фото недоступно. Повторить
            </button>
          )}
          {(onEdit || onDelete) && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {onEdit && (
                <button type="button" onClick={onEdit} disabled={busy} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50">
                  <Pencil size={13} aria-hidden="true" /> Подпись
                </button>
              )}
              {onDelete && (
                <button type="button" onClick={onDelete} disabled={busy} aria-label="Удалить фото" className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">
                  <Trash2 size={13} aria-hidden="true" /> Удалить
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {expanded && url && (
        <figure ref={previewRef} id={previewId} className="mt-3 scroll-mb-28 space-y-2 border-t border-slate-100 pt-2">
          <div className="flex justify-end">
            <button type="button" className="inline-flex min-h-10 items-center gap-1 text-sm text-slate-600" onClick={() => {
              setExpanded(false);
              thumbnailRef.current?.focus();
            }}>
              <X size={16} aria-hidden="true" /> Свернуть фото
            </button>
          </div>
          <img src={url} alt={photo.caption || "Фото работы"} className="max-h-[60vh] w-full rounded-md bg-slate-100 object-contain" />
        </figure>
      )}
      {children}
    </li>
  );
}

export function WorkPhotos({ shiftId, timezone, mode, required, onChange, onCountChange, onUploadPendingChange, refreshKey }: Props) {
  const headingId = useId();
  const { ask, dialog } = useActionDialog();
  const [photos, setPhotos] = useState<WorkPhoto[] | null>(null);
  const [listError, setListError] = useState(false);
  const [listRetry, setListRetry] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [edit, setEdit] = useState<{ photoId: number; caption: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [actionError, setActionError] = useState<{ photoId: number; message: string } | null>(null);
  const [actionNotice, setActionNotice] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const cameraButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    setListError(false);
    listWorkPhotos(shiftId).then((result) => {
      if (active) setPhotos(result);
    }).catch(() => {
      if (active) setListError(true);
    });
    return () => { active = false; };
  }, [shiftId, listRetry, refreshKey]);

  useEffect(() => {
    if (photos) onCountChange?.(photos.filter((photo) => !photo.deletion_requested_at).length);
  }, [photos, onCountChange]);

  const uploadInFlight = useRef(false);
  useEffect(() => () => onUploadPendingChange?.(false), [onUploadPendingChange]);

  useEffect(() => {
    if (formOpen) cameraButtonRef.current?.focus();
  }, [formOpen]);

  const canWrite = mode !== "read";
  const count = photos?.length ?? 0;
  const hasSavedPhoto = photos?.some((photo) => !photo.deletion_requested_at);
  const atLimit = count >= MAX_PHOTOS;
  const closeComposer = () => {
    setFormOpen(false);
    setDraft(null);
    setUploadError("");
    window.requestAnimationFrame(() => addButtonRef.current?.focus());
  };

  const save = async (selected: Draft) => {
    if (uploadInFlight.current || pending || atLimit) return;
    uploadInFlight.current = true;
    onUploadPendingChange?.(true);
    setPending(true);
    setDraft(selected);
    setUploadError("");
    setActionNotice("");
    setUploadStep(selected.file ? "Загружаем фото…" : "Подготавливаем фото…");
    try {
      const file = selected.file ?? await prepareWorkPhotoFile(selected.original);
      setDraft({ ...selected, file });
      setUploadStep("Загружаем фото…");
      const photo = await uploadWorkPhoto(shiftId, file, selected.uploadId, "");
      setPhotos((items) => [...(items ?? []).filter(({ id }) => id !== photo.id), photo].sort((a, b) => a.id - b.id));
      closeComposer();
      setActionNotice("Фото сохранено.");
      onChange?.();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось сохранить фото");
    } finally {
      uploadInFlight.current = false;
      onUploadPendingChange?.(false);
      setPending(false);
      setUploadStep("");
    }
  };

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void save({ original: file, uploadId: newWorkPhotoUploadId() });
  };

  const remove = async (photoId: number) => {
    if (pending || !(await ask("Удалить это фото работы?", "Удалить"))) return;
    setPending(true);
    setActionError(null);
    setActionNotice("");
    try {
      await deleteWorkPhoto(shiftId, photoId);
      setPhotos((items) => (items ?? []).filter(({ id }) => id !== photoId));
      if (edit?.photoId === photoId) setEdit(null);
      if (mode === "admin") setActionNotice("Фото удалено.");
      onChange?.();
    } catch (error) {
      setActionError({ photoId, message: error instanceof Error ? error.message : "Не удалось удалить фото" });
      setListRetry((value) => value + 1);
    } finally {
      setPending(false);
    }
  };

  const saveCaption = async () => {
    if (!edit || pending) return;
    setPending(true);
    setActionError(null);
    setActionNotice("");
    try {
      const photo = await updateWorkPhotoCaption(shiftId, edit.photoId, edit.caption);
      setPhotos((items) => (items ?? []).map((item) => item.id === photo.id ? photo : item));
      setEdit(null);
      setActionNotice("Подпись сохранена.");
      onChange?.();
    } catch (error) {
      setActionError({ photoId: edit.photoId, message: error instanceof Error ? error.message : "Не удалось сохранить подпись" });
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby={headingId} data-testid="work-photos">
      <Card className="min-w-0 space-y-3 p-4">
      {dialog}
        <div className="flex items-center justify-between gap-2">
          <h3 id={headingId} className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#0a192f]">
            <Camera size={17} className="shrink-0" aria-hidden="true" /> Фото работ
          </h3>
          {photos && <span role="status" className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{count} из {MAX_PHOTOS}</span>}
        </div>
        {required && (hasSavedPhoto ? (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={17} className="shrink-0" aria-hidden="true" /> Фотоотчёт выполнен
          </p>
        ) : (
          <p className="text-sm text-slate-600">На этом объекте нужен хотя бы один снимок работы или препятствия.</p>
        ))}
        {mode === "admin" && <p className="text-sm text-slate-600">Фото и подписи сохраняются сразу после каждого действия.</p>}
        {actionNotice && <p role="status" className="text-sm font-medium text-emerald-800">{actionNotice}</p>}
        {!photos && !listError && <p role="status" className="text-sm text-slate-500">Загружаем список фото…</p>}
        {listError && (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Не удалось загрузить список фото.{" "}
            <button type="button" className="min-h-9 font-semibold underline" onClick={() => setListRetry(listRetry + 1)}>Повторить</button>
          </div>
        )}
        {photos && !count && !formOpen && <p className="text-sm text-slate-500">Фото пока нет.</p>}
        {photos && count > 0 && (
          <ul className="space-y-2">
            {photos.map((photo) => photo.deletion_requested_at ? (
              <li key={photo.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p>Фото скрыто. Файл ещё не удалён и занимает место в лимите смены.</p>
                {actionError?.photoId === photo.id && <p role="alert">{actionError.message}</p>}
                {canWrite && <Button type="button" disabled={pending} onClick={() => void remove(photo.id)}>Повторить удаление</Button>}
              </li>
            ) : (
              <WorkPhotoImage
                key={photo.id}
                shiftId={shiftId}
                photo={photo}
                timezone={timezone}
                busy={pending}
                onDelete={canWrite ? () => void remove(photo.id) : undefined}
                onEdit={canWrite ? () => {
                  setActionError(null);
                  setEdit({ photoId: photo.id, caption: photo.caption ?? "" });
                } : undefined}
              >
                {actionError?.photoId === photo.id && <p role="alert" className="mt-2 break-words text-sm text-red-700">{actionError.message}</p>}
                {edit?.photoId === photo.id && (
                  <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Подпись к фото
                      <textarea autoFocus rows={2} maxLength={CAPTION_LENGTH} value={edit.caption} disabled={pending}
                        onChange={(event) => setEdit({ ...edit, caption: event.target.value })} className={`mt-1 ${captionClass}`} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" className={primaryButton} disabled={pending} onClick={saveCaption}>Сохранить подпись</Button>
                      <Button type="button" className={secondaryButton} disabled={pending} onClick={() => setEdit(null)}>Отмена</Button>
                    </div>
                  </div>
                )}
              </WorkPhotoImage>
            ))}
          </ul>
        )}
        {canWrite && photos && !atLimit && !formOpen && (
          <Button ref={addButtonRef} type="button" className={`inline-flex items-center gap-2 ${secondaryButton}`} disabled={pending}
            onClick={() => setFormOpen(true)}>
            <ImagePlus size={17} aria-hidden="true" /> Добавить фото
          </Button>
        )}
        {canWrite && atLimit && <p className="text-xs text-slate-500">Достигнут лимит фото за смену.</p>}
        {canWrite && formOpen && (
          <div className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={chooseFile} />
            <input ref={galleryRef} type="file" accept="image/*,.heic,.heif" hidden onChange={chooseFile} />
            <div className="flex flex-wrap gap-1.5">
              <Button ref={cameraButtonRef} type="button" className={`inline-flex items-center gap-1.5 whitespace-nowrap !px-2 ${secondaryButton}`} disabled={pending}
                onClick={() => cameraRef.current?.click()}><Camera size={16} aria-hidden="true" /> Камера</Button>
              <Button type="button" className={`inline-flex items-center gap-1.5 whitespace-nowrap !px-2 ${secondaryButton}`} disabled={pending}
                onClick={() => galleryRef.current?.click()}><ImageIcon size={16} aria-hidden="true" /> Галерея</Button>
            </div>
            {draft?.file && <WorkPhotoDraftPreview file={draft.file} />}
            {uploadStep && <p role="status" className="text-sm text-slate-600">{uploadStep}</p>}
            {uploadError && <p role="alert" className="break-words text-sm text-red-700">{uploadError}</p>}
            <div className="flex flex-wrap gap-2">
              {draft && uploadError && <Button type="button" className={primaryButton} disabled={pending} onClick={() => void save(draft)}>
                Повторить загрузку
              </Button>}
              <Button type="button" className={secondaryButton} disabled={pending} onClick={closeComposer}>Отмена</Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
