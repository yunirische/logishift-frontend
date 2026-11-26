export const demoExamples = {
  snow: {
    label: "Уборка снега", job: "Очистка территории", truck: "Фронтальный погрузчик",
    site: "Уборка снега", caption: "Подъезд к складу расчищен",
    mobile: true, defaults: { odometer: false, invoice: false },
    benefit: "Часы работы и фото очищенной территории для отчёта заказчику.",
  },
  facade: {
    label: "Автовышка", job: "Обслуживание фасада", truck: "Автовышка 22 м",
    site: "Выезды автовышки", caption: "Покрытие фасада восстановлено",
    mobile: true, defaults: { odometer: false, invoice: false },
    benefit: "Время работы автовышки и фото результата для расчёта с заказчиком.",
  },
  delivery: {
    label: "Грузоперевозки", job: "Доставка материалов", truck: "Бортовой грузовик",
    site: "Доставка материалов", caption: "Материалы доставлены и разгружены",
    mobile: true, defaults: { odometer: true, invoice: true },
    benefit: "Часы и фото разгрузки. Накладная и одометр — при необходимости.",
  },
  earth: {
    label: "Земляные работы", job: "Подготовка площадки", truck: "Бульдозер",
    site: "Строительная площадка", caption: "Площадка выровнена под основание",
    mobile: false, defaults: { odometer: false, invoice: false },
    benefit: "Отработанные машино-часы и состояние площадки после работы.",
  },
} as const;

export type DemoExampleId = keyof typeof demoExamples;
export const isDemoExample = (key: unknown): key is DemoExampleId =>
  typeof key === "string" && Object.prototype.hasOwnProperty.call(demoExamples, key);

export function exampleStart(today = new Date()) {
  const day = today.toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });
  return new Date(day + "T08:00:00+03:00");
}

export function exampleFinish(start: string) {
  return new Date(Date.parse(start) + 270 * 60_000);
}
