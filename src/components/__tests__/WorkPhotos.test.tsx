import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { listWorkPhotos, updateWorkPhotoCaption, uploadWorkPhoto } from "../../services/workPhotos";
import { prepareWorkPhotoFile } from "../../utils/workPhotoFile";
import { WorkPhotos } from "../WorkPhotos";

vi.mock("../../services/workPhotos", () => ({
  listWorkPhotos: vi.fn(),
  uploadWorkPhoto: vi.fn(),
  updateWorkPhotoCaption: vi.fn(),
}));

vi.mock("../../utils/workPhotoFile", () => ({
  newWorkPhotoUploadId: () => "same-upload-id",
  prepareWorkPhotoFile: vi.fn(),
}));

describe("WorkPhotos", () => {
  it("previews the prepared image and retries automatically with the original ID", async () => {
    const image = new File(["image"], "prepared.jpg", { type: "image/jpeg" });
    const selected = new File(["original"], "original.jpg", { type: "image/jpeg" });
    vi.mocked(listWorkPhotos).mockResolvedValue([]);
    vi.mocked(prepareWorkPhotoFile).mockResolvedValue(image);
    vi.mocked(uploadWorkPhoto).mockRejectedValue(new Error("Соединение потеряно"));
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    const pending = vi.fn();
    try {
      const { container } = render(<WorkPhotos shiftId={7} timezone="Europe/Moscow" mode="driver"
        onUploadPendingChange={pending} />);
      fireEvent.click(await screen.findByRole("button", { name: "Добавить фото" }));
      const input = container.querySelector<HTMLInputElement>("input[capture]")!;
      fireEvent.change(input, { target: { files: [selected] } });
      expect(await screen.findByAltText("Предпросмотр выбранного фото")).toHaveAttribute("src", "blob:preview");
      expect(URL.createObjectURL).toHaveBeenCalledWith(image);
      expect(await screen.findByRole("button", { name: "Повторить загрузку" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Загрузить фото" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку" }));
      await waitFor(() => expect(uploadWorkPhoto).toHaveBeenCalledTimes(2));
      for (const call of vi.mocked(uploadWorkPhoto).mock.calls) {
        expect(call).toEqual([7, image, "same-upload-id", ""]);
      }
      expect(pending).toHaveBeenCalledWith(true);
      expect(pending).toHaveBeenLastCalledWith(false);
      fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it("shows pending deletion to the writer without marking the required report complete", async () => {
    vi.mocked(listWorkPhotos).mockResolvedValue([{
      id: 1, byte_size: 100, caption: "Pending", created_at: "2026-01-01T00:00:00Z",
      deletion_requested_at: "2026-01-01T00:01:00Z",
    }]);
    const onCountChange = vi.fn();
    render(<WorkPhotos shiftId={7} timezone="Europe/Moscow" mode="driver" required onCountChange={onCountChange} />);
    expect(await screen.findByRole("button", { name: "Повторить удаление" })).toBeVisible();
    expect(screen.queryByText("Фотоотчёт выполнен")).not.toBeInTheDocument();
    expect(onCountChange).toHaveBeenCalledWith(0);
  });

  it("lets the worker add a caption to a saved photo", async () => {
    const photo = { id: 4, byte_size: 100, caption: null, created_at: "2026-01-01T00:00:00Z" };
    vi.mocked(listWorkPhotos).mockResolvedValue([photo]);
    vi.mocked(updateWorkPhotoCaption).mockResolvedValue({ ...photo, caption: "Работа завершена" });
    render(<WorkPhotos shiftId={7} timezone="Europe/Moscow" mode="driver" />);
    fireEvent.click(await screen.findByRole("button", { name: "Подпись" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Подпись к фото" }), { target: { value: "Работа завершена" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить подпись" }));
    await screen.findByText("Подпись сохранена.");
    expect(screen.getByText("Работа завершена")).toBeVisible();
    expect(updateWorkPhotoCaption).toHaveBeenCalledWith(7, 4, "Работа завершена");
  });
});
