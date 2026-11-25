import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { listWorkPhotos, uploadWorkPhoto } from "../../services/workPhotos";
import { prepareWorkPhotoFile } from "../../utils/workPhotoFile";
import { WorkPhotos } from "../WorkPhotos";

vi.mock("../../services/workPhotos", () => ({
  listWorkPhotos: vi.fn(),
  uploadWorkPhoto: vi.fn(),
}));

vi.mock("../../utils/workPhotoFile", () => ({
  newWorkPhotoUploadId: () => "same-upload-id",
  prepareWorkPhotoFile: vi.fn(),
}));

describe("WorkPhotos", () => {
  it("previews the prepared image and retries with the original ID and caption", async () => {
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
      const caption = screen.getByRole("textbox", { name: "Подпись к фото (необязательно)" });
      fireEvent.change(caption, { target: { value: "Исходная подпись" } });
      fireEvent.click(screen.getByRole("button", { name: "Загрузить фото" }));
      expect(await screen.findByRole("button", { name: "Повторить загрузку" })).toBeEnabled();
      expect(caption).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку" }));
      await waitFor(() => expect(uploadWorkPhoto).toHaveBeenCalledTimes(2));
      for (const call of vi.mocked(uploadWorkPhoto).mock.calls) {
        expect(call).toEqual([7, image, "same-upload-id", "Исходная подпись"]);
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
});
