import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import LandingView from "../LandingView";
import LegalDocumentView from "../LegalDocumentView";
import Login from "../../components/Login";
import { SUPPORT_TELEGRAM_URL } from "../../config/legal";

const LANDING_DESCRIPTION =
  "LogiShift — учёт и контроль смен транспорта и спецтехники: техника, водители, объекты, фото, комментарии, история и журнал действий.";

vi.mock("../../config/demo", async () => {
  const actual = await vi.importActual<typeof import("../../config/demo")>(
    "../../config/demo"
  );

  return {
    ...actual,
    getDemoEntryUrl: () => "https://demo.kontrolsmen.ru/?enterDemo=1",
    getProductionAppUrl: (pathname: string = "/") =>
      `https://app.kontrolsmen.ru${pathname}`,
    isDemoHostname: () => false,
    isProductionAppHostname: () => true,
  };
});

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

vi.mock("../../services/api", async () => {
  const actual = await vi.importActual<typeof import("../../services/api")>(
    "../../services/api"
  );

  return {
    ...actual,
    loginUser: vi.fn(),
  };
});

const getMetaContent = (selector: string): string | null => {
  const node = document.head.querySelector(selector);
  return node?.getAttribute("content") ?? node?.getAttribute("href") ?? null;
};

describe("Landing SEO metadata", () => {
  afterEach(() => {
    cleanup();
    document.title = "";
  });

  it("sets title, description, canonical, Open Graph and JSON-LD on landing", () => {
    render(<LandingView />);

    expect(document.title).toBe(
      "LogiShift — учёт и контроль смен транспорта и спецтехники"
    );
    expect(getMetaContent('meta[name="description"]')).toBe(LANDING_DESCRIPTION);
    expect(getMetaContent('link[rel="canonical"]')).toBe(
      "https://kontrolsmen.ru/"
    );
    expect(getMetaContent('meta[property="og:type"]')).toBe("website");
    expect(getMetaContent('meta[property="og:title"]')).toBe(
      "LogiShift — учёт и контроль смен транспорта и спецтехники"
    );
    expect(getMetaContent('meta[property="og:description"]')).toBe(
      LANDING_DESCRIPTION
    );
    expect(getMetaContent('meta[property="og:url"]')).toBe(
      "https://kontrolsmen.ru/"
    );
    expect(getMetaContent('meta[name="twitter:card"]')).toBe("summary");
    expect(document.title).not.toMatch(/пилот/i);
    expect(getMetaContent('meta[name="description"]')).not.toMatch(/пилот/i);

    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]')
    );
    expect(scripts).toHaveLength(2);

    const parsed = scripts.map((node) => JSON.parse(node.textContent ?? ""));
    expect(parsed[0]["@graph"]).toHaveLength(2);
    expect(parsed[1]["@type"]).toBe("FAQPage");
  });

  it("renders landing logos from bundled responsive assets, not legacy /brand paths", () => {
    render(<LandingView />);

    const logos = screen.getAllByAltText("LogiShift Контроль смен");
    expect(logos.length).toBeGreaterThanOrEqual(2);

    logos.forEach((logo) => {
      const image = logo as HTMLImageElement;
      const sourceSets = Array.from(
        image.closest("picture")?.querySelectorAll("source") ?? []
      ).map((source) => source.getAttribute("srcset") ?? "");
      const references = [
        image.getAttribute("src") ?? "",
        image.getAttribute("srcset") ?? "",
        ...sourceSets,
      ];

      references.forEach((reference) => {
        expect(reference).not.toMatch(/(^|https:\/\/kontrolsmen\.ru)\/brand\//);
      });
    });
  });

  it("removes landing canonical, Open Graph and JSON-LD after unmount", () => {
    const { unmount } = render(<LandingView />);

    expect(getMetaContent('link[rel="canonical"]')).toBe(
      "https://kontrolsmen.ru/"
    );
    expect(
      document.querySelectorAll('script[type="application/ld+json"]')
    ).toHaveLength(2);

    unmount();

    expect(getMetaContent('link[rel="canonical"]')).toBeNull();
    expect(getMetaContent('meta[property="og:title"]')).toBeNull();
    expect(getMetaContent('meta[property="og:description"]')).toBeNull();
    expect(getMetaContent('meta[property="og:url"]')).toBeNull();
    expect(
      document.querySelectorAll('script[type="application/ld+json"]')
    ).toHaveLength(0);
  });

  it("does not leave landing metadata on login and does not duplicate tags on remount", () => {
    const first = render(<LandingView />);
    first.unmount();

    render(<Login />);

    expect(getMetaContent('link[rel="canonical"]')).toBeNull();
    expect(getMetaContent('meta[property="og:title"]')).toBeNull();
    expect(getMetaContent('meta[property="og:description"]')).toBeNull();
    expect(getMetaContent('meta[property="og:url"]')).toBeNull();
    expect(
      document.querySelectorAll('script[type="application/ld+json"]')
    ).toHaveLength(0);

    cleanup();

    render(<LandingView />);

    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[property="og:type"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[property="og:description"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[property="og:url"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[name="twitter:card"]')).toHaveLength(1);
    expect(
      document.querySelectorAll('script[type="application/ld+json"]')
    ).toHaveLength(2);
  });
});

describe("Public legal SEO metadata", () => {
  afterEach(() => {
    cleanup();
    document.title = "";
  });

  it("sets description and root-domain canonical for public legal pages", () => {
    render(<LegalDocumentView documentKey="privacy" />);

    expect(document.title).toBe(
      "LogiShift | Политика обработки персональных данных"
    );
    expect(getMetaContent('meta[name="description"]')).toBe(
      "Политика обработки персональных данных LogiShift для публичного сайта и сервиса контроля смен."
    );
    expect(getMetaContent('meta[name="robots"]')).toBe("noindex,follow");
    expect(getMetaContent('link[rel="canonical"]')).toBe(
      "https://kontrolsmen.ru/privacy"
    );
  });
});

describe("Public sitemap", () => {
  it("contains only the landing page and excludes legal, app, demo, and internal routes", () => {
    const sitemap = readFileSync(
      resolve(process.cwd(), "public", "sitemap.xml"),
      "utf8"
    );

    expect(sitemap).toContain("<loc>https://kontrolsmen.ru/</loc>");
    expect(sitemap).not.toContain("https://kontrolsmen.ru/offer");
    expect(sitemap).not.toContain("https://kontrolsmen.ru/privacy");
    expect(sitemap).not.toContain("https://kontrolsmen.ru/personal-data-consent");
    expect(sitemap).not.toContain("https://kontrolsmen.ru/payment-and-refund");
    expect(sitemap).not.toContain("https://kontrolsmen.ru/contacts");
    expect(sitemap).not.toContain("https://app.kontrolsmen.ru/");
    expect(sitemap).not.toContain("https://app.kontrolsmen.ru/login");
    expect(sitemap).not.toContain("https://app.kontrolsmen.ru/register");
    expect(sitemap).not.toContain("https://demo.kontrolsmen.ru/");
    expect(sitemap).not.toContain("https://api.kontrolsmen.ru/");
    expect(sitemap).not.toContain("/owner");
    expect(sitemap).not.toContain("/internal");
  });
});

describe("Landing FAQ", () => {
  afterEach(() => {
    cleanup();
    document.title = "";
  });

  it("keeps exactly one h1 and renders FAQ before the final CTA with dl/dt/dd", () => {
    const { container } = render(<LandingView />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    const faqHeading = screen.getByRole("heading", {
      level: 2,
      name: "Что важно знать перед запуском",
    });
    const finalCtaHeading = screen.getByRole("heading", {
      level: 2,
      name: "Попробуйте LogiShift в работе",
    });

    const faqSection = faqHeading.closest("section");
    const finalCtaSection = finalCtaHeading.closest("section");
    expect(faqSection).not.toBeNull();
    expect(finalCtaSection).not.toBeNull();
    expect(
      faqSection!.compareDocumentPosition(finalCtaSection!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const dl = faqSection!.querySelector("dl");
    expect(dl).not.toBeNull();
    expect(dl!.querySelectorAll("dt")).toHaveLength(4);
    expect(dl!.querySelectorAll("dd")).toHaveLength(4);

    const faqJsonLd = Array.from(
      container.ownerDocument.querySelectorAll('script[type="application/ld+json"]')
    )
      .map((node) => JSON.parse(node.textContent ?? ""))
      .find((entry) => entry["@type"] === "FAQPage");

    expect(faqJsonLd).toBeTruthy();

    const questions = within(faqSection!).getAllByRole("term").map((node) => node.textContent);
    const answers = faqSection!.querySelectorAll("dd");
    faqJsonLd.mainEntity.forEach(
      (
        entity: { name: string; acceptedAnswer: { text: string } },
        index: number
      ) => {
        expect(questions[index]).toBe(entity.name);
        expect(answers[index].textContent).toBe(entity.acceptedAnswer.text);
      }
    );
  });
});

describe("Landing product copy", () => {
  afterEach(() => {
    cleanup();
    document.title = "";
  });

  it("lists shipped features and keeps permanent CTAs separate from the temporary offer", () => {
    const { container } = render(<LandingView />);

    [
      "учёт текущих и завершённых смен",
      "техника, водители и объекты",
      "фото к сменам",
      "комментарии к сменам",
      "история и журнал действий",
      "роли пользователей и приглашения водителей",
      "ручное создание, завершение и отмена смен",
      "тарифы и лимиты для техники, водителей и объектов",
    ].forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: "Начать бесплатно" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Открыть демо" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Бесплатный тариф включает до 2 машин, 2 водителей и 2 объектов. Для растущего парка доступны тарифы с большими лимитами.")).toBeInTheDocument();

    expect(screen.getAllByRole("region")).toHaveLength(1);
    const offerBanner = screen.getByRole("region", { name: "Специальные условия на старте" });
    expect(within(offerBanner).getByText("Специальные условия на старте")).toBeInTheDocument();
    expect(within(offerBanner).getByText("Начните с поддержкой команды LogiShift")).toBeInTheDocument();
    expect(within(offerBanner).getByText("Поможем настроить технику, водителей и объекты, а также предоставим расширенный доступ на период знакомства с сервисом.")).toBeInTheDocument();
    const supportLink = within(offerBanner).getByRole("link", { name: "Обсудить условия" });
    expect(supportLink).toHaveAttribute("href", SUPPORT_TELEGRAM_URL);
    expect(supportLink).toHaveAttribute("target", "_blank");
    expect(supportLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(offerBanner).queryByRole("button", { name: "Узнать условия" })).not.toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: "Начать бесплатно" })).toHaveLength(2);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Смены транспорта и спецтехники — без Excel и чатов"
    );
    expect(container.textContent).toContain(
      "LogiShift — учёт смен: водитель отмечает смену с телефона, а руководитель видит водителя, технику, объект, время, фото и комментарии."
    );
    const painHeading = screen.getByRole("heading", {
      level: 2,
      name: "В конце недели снова разбираетесь, кто где работал?",
    });
    const painSection = painHeading.closest("section");
    expect(painSection).not.toBeNull();
    expect(
      painSection!.compareDocumentPosition(offerBanner) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(container.textContent).toContain(
      "LogiShift фиксирует это во время самой смены."
    );
    [
      "Смены остаются в таблицах и сообщениях.",
      "Фото и накладные лежат отдельно.",
      "Неясно, кто был на какой машине и объекте.",
      "Информацию собирают, когда уже пора считать работу.",
    ].forEach((painPoint) => {
      expect(container.textContent).toContain(painPoint);
    });

    const heroHeading = screen.getByRole("heading", { level: 1 });
    const heroSection = heroHeading.closest("section");
    expect(heroSection).not.toBeNull();
    const heroDemoCta = within(heroSection!).getByRole("button", {
      name: "Посмотреть демо",
    });
    const heroRegisterCta = within(heroSection!).getByRole("button", {
      name: "Начать бесплатно",
    });
    expect(
      heroDemoCta.compareDocumentPosition(heroRegisterCta) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    expect(container.textContent).toContain(
      "Откройте демо или зарегистрируйте компанию бесплатно, чтобы начать вести реальные смены."
    );
    expect(container.textContent).toContain(
      "Да. Откройте демо, чтобы посмотреть основные сценарии работы, или зарегистрируйте компанию бесплатно."
    );
    expect(container.textContent).not.toMatch(/пилот|ищем первые компании|стать пилотом/i);
  });

  it("does not promise unsupported public capabilities", () => {
    const { container } = render(<LandingView />);
    const publicCopy = `${LANDING_DESCRIPTION} ${container.textContent ?? ""}`.toLowerCase();

    [
      "gps",
      "глонасс",
      "бухгалтер",
      "путевые листы",
      "интеграции",
      "автоматическое диспетчерское управление",
    ].forEach((unsupportedClaim) => {
      expect(publicCopy).not.toContain(unsupportedClaim);
    });
  });
});
