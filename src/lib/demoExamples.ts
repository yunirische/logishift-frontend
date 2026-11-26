export const demoExamples = {
  snow: { label: "Уборка снега", job: "Очистка территории", truck: "Фронтальный погрузчик", site: "Складской двор", caption: "Подъезд к складу расчищен" },
  facade: { label: "Автовышка", job: "Обслуживание фасада", truck: "Автовышка 22 м", site: "Производственный корпус", caption: "Покрытие фасада восстановлено" },
  delivery: { label: "Грузоперевозки", job: "Доставка материалов", truck: "Бортовой грузовик", site: "Строительный склад", caption: "Материалы доставлены и разгружены" },
  earth: { label: "Земляные работы", job: "Подготовка площадки", truck: "Бульдозер", site: "Строительная площадка", caption: "Площадка выровнена под основание" },
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
