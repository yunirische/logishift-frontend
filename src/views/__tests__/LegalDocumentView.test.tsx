import { cleanup, render, screen, within } from "@testing-library/react";
import LegalDocumentView from "../LegalDocumentView";
import {
  LEGAL_DOCUMENT_VERSION,
  LEGAL_REVISION_LABEL,
  REQUIRED_CONSENT_VERSIONS,
  type LegalDocumentKey,
} from "../../config/legal";

afterEach(cleanup);

describe("privacy disclosure consistency", () => {
  it("lists VK alongside Yandex as a consented analytics/advertising service", () => {
    render(<LegalDocumentView documentKey="privacy" />);
    const services = screen.getByRole("heading", { name: "7. Передача третьим лицам и привлеченным сервисам" }).closest("section")!;
    expect(within(services).getByText(/VK Ads Pixel \/ Top.Mail.Ru counter для анализа посещаемости публичного сайта и оценки эффективности рекламы только после согласия посетителя/)).toBeInTheDocument();
    expect(within(services).getByText(/Яндекс Метрика, ООО «ЯНДЕКС»/)).toBeInTheDocument();
  });

  it("documents the actual VK ID, accepted-only apex scope and rejection/revocation behavior", () => {
    render(<LegalDocumentView documentKey="privacy" />);
    const analytics = screen.getByRole("heading", { name: "8. Cookies, Яндекс Метрика и VK Pixel" }).closest("section")!;
    const text = analytics.textContent!;
    expect(text).toContain("VK Pixel ID 3805967");
    expect(text).toContain("только после явного согласия посетителя на аналитику (accepted)");
    expect(text).toContain("До выбора посетителя и после отказа счетчики не загружаются");
    expect(text).toContain("только на главной публичной странице https://kontrolsmen.ru/");
    expect(text).toContain("На demo.kontrolsmen.ru, app.kontrolsmen.ru, других hostname и остальных страницах сайта VK Pixel не используется");
    expect(text).toContain("После перезагрузки Яндекс Метрика и VK Pixel не загружаются");
    expect(text).toContain("Уже начавшиеся запросы к провайдерам могут завершиться");
    expect(text).toContain("Настройки cookies");
  });

  it("distinguishes our integration payload from metadata exposed by normal vendor requests", () => {
    render(<LegalDocumentView documentKey="privacy" />);
    expect(screen.getByText("Код интеграции LogiShift не передает в VK email, ФИО, телефон, userId, tenantId, содержимое форм и авторизационные токены.")).toBeInTheDocument();
    expect(screen.getByText(/провайдеры могут получать IP-адрес, cookies, сведения об устройстве, браузере и сетевом соединении/)).toBeInTheDocument();
    expect(screen.queryByText(/advanced matching/i)).not.toBeInTheDocument();
  });
});

describe("document revision and registration version compatibility", () => {
  it.each<LegalDocumentKey>(["offer", "privacy", "payment-and-refund", "contacts", "personal-data-consent"])("shows the correct revision for %s without redating unrelated documents", key => {
    render(<LegalDocumentView documentKey={key} />);
    const expected = key === "privacy" ? "Редакция от 19.10.2026" : "Редакция от 25.06.2026";
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText(key === "privacy" ? "Редакция от 25.06.2026" : "Редакция от 19.10.2026")).not.toBeInTheDocument();
  });

  it("preserves the existing backend-validated registration consent tokens", () => {
    expect(LEGAL_REVISION_LABEL).toBe("Редакция от 25.06.2026");
    expect(LEGAL_DOCUMENT_VERSION).toBe("2026-06-25");
    expect(REQUIRED_CONSENT_VERSIONS).toEqual({ offer: "2026-06-25", privacy_policy: "2026-06-25", personal_data: "2026-06-25" });
  });
});
