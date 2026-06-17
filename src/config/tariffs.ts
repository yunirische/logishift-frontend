export interface PublicTariffDefinition {
  code: string;
  name: string;
  priceMonthly: number;
  priceLabel: string;
  meta: string;
  details: string[];
  featured?: boolean;
  checkoutEnabled: boolean;
}

export const PUBLIC_TARIFFS: PublicTariffDefinition[] = [
  {
    code: "free",
    name: "Бесплатный",
    priceMonthly: 0,
    priceLabel: "0 ₽",
    meta: "без ограничения по времени",
    details: [
      "до 2 машин",
      "до 2 объектов",
      "до 2 водителей",
      "чтобы попробовать сервис на реальных сменах",
    ],
    featured: true,
    checkoutEnabled: false,
  },
  {
    code: "start",
    name: "Старт",
    priceMonthly: 2900,
    priceLabel: "2 900 ₽/мес",
    meta: "5 / 10 / 5",
    details: [
      "до 5 машин",
      "до 10 водителей",
      "до 5 объектов",
      "онлайн-оплата после включения биллинга",
    ],
    checkoutEnabled: true,
  },
  {
    code: "business",
    name: "Бизнес",
    priceMonthly: 4900,
    priceLabel: "4 900 ₽/мес",
    meta: "10 / 25 / 15",
    details: [
      "до 10 машин",
      "до 25 водителей",
      "до 15 объектов",
      "для регулярной работы с парком и сменами",
    ],
    checkoutEnabled: true,
  },
  {
    code: "company",
    name: "Компания",
    priceMonthly: 8900,
    priceLabel: "8 900 ₽/мес",
    meta: "20 / 50 / 30",
    details: [
      "до 20 машин",
      "до 50 водителей",
      "до 30 объектов",
      "для нескольких объектов и большего объема смен",
    ],
    checkoutEnabled: true,
  },
  {
    code: "individual",
    name: "Индивидуальный",
    priceMonthly: 0,
    priceLabel: "По запросу",
    meta: "без ограничений",
    details: [
      "без лимита по машинам",
      "без лимита по водителям",
      "без лимита по объектам",
      "условия запуска согласуются отдельно",
    ],
    checkoutEnabled: false,
  },
];

export const BILLING_CHECKOUT_PLAN_CODES = PUBLIC_TARIFFS.filter(
  (plan) => plan.checkoutEnabled
).map((plan) => plan.code);
