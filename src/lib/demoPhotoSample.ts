import type { DemoPhotoType } from "./demoSession";

// Explicitly labelled examples generated locally; the regular demo workflow
// consumes them without camera access or an upload to the API.
export const createDemoPhotoSample = (type: DemoPhotoType): Promise<File> => {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 500;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("Не удалось подготовить образец"));

  context.fillStyle = "#f1f5f9";
  context.fillRect(0, 0, 800, 500);
  context.fillStyle = "#334155";
  context.font = "bold 24px sans-serif";
  context.fillText("LogiShift / ДЕМОНСТРАЦИОННЫЙ ОБРАЗЕЦ", 40, 55);
  context.fillStyle = "#ffffff";
  context.fillRect(40, 90, 720, 310);
  context.fillStyle = "#0f172a";
  context.font = "bold 30px sans-serif";

  if (type === "invoice") {
    context.fillText("Накладная / Пример", 70, 145);
    context.font = "24px sans-serif";
    context.fillText("Объект: ЖК Северный", 70, 210);
    context.fillText("Материал: песок", 70, 260);
    context.fillText("Объём: 10 м3", 70, 310);
  } else {
    context.fillText(type === "start" ? "Одометр перед сменой" : "Одометр после смены", 70, 145);
    context.fillStyle = "#dcfce7";
    context.fillRect(70, 180, 660, 170);
    context.fillStyle = "#14532d";
    context.font = "bold 64px monospace";
    context.fillText(type === "start" ? "125 400 км" : "125 480 км", 100, 285);
  }

  context.fillStyle = "#475569";
  context.font = "22px sans-serif";
  context.fillText("Тестовые данные, не документ реальной смены", 40, 455);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Не удалось подготовить образец"));
        return;
      }
      resolve(new File([blob], `demo-${type}.png`, { type: "image/png" }));
    }, "image/png");
  });
};
