import { API_ENDPOINTS } from "../constants";
import { apiRequest } from "./api";

export interface WorkPhoto {
  id: number;
  caption: string | null;
  created_at: string;
  byte_size: number;
  deletion_requested_at?: string | null;
}

export async function listWorkPhotos(shiftId: number): Promise<WorkPhoto[]> {
  const response = await apiRequest(API_ENDPOINTS.WORK_PHOTOS(shiftId));
  if (!Array.isArray(response?.photos)) throw new Error("Не удалось получить список фотографий");
  return response.photos;
}

export async function uploadWorkPhoto(shiftId: number, file: File, uploadId: string, caption: string): Promise<WorkPhoto> {
  const form = new FormData();
  form.append("photo", file);
  form.append("upload_id", uploadId);
  if (caption.trim()) form.append("caption", caption.trim());
  const response = await apiRequest(API_ENDPOINTS.WORK_PHOTOS(shiftId), { method: "POST", body: form });
  if (!response?.photo) throw new Error("Сохранение снимка не подтверждено. Повторите загрузку.");
  return response.photo;
}

export async function updateWorkPhotoCaption(shiftId: number, photoId: number, caption: string): Promise<WorkPhoto> {
  const response = await apiRequest(API_ENDPOINTS.WORK_PHOTO(shiftId, photoId), {
    method: "PATCH",
    body: JSON.stringify({ caption: caption.trim() || null }),
  });
  if (!response?.photo) throw new Error("Изменение подписи не подтверждено");
  return response.photo;
}

export async function deleteWorkPhoto(shiftId: number, photoId: number): Promise<void> {
  await apiRequest(API_ENDPOINTS.WORK_PHOTO(shiftId, photoId), { method: "DELETE" });
}
