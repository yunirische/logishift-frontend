import { render, screen, within, fireEvent, waitFor, act } from "@testing-library/react";
import BillingView from "../BillingView";
import { UserRole } from "../../types";
import { createBillingCheckout, getBillingPayments } from "../../services/api";

const mockRefreshBilling = vi.fn();
const mockState = vi.hoisted(() => ({ billing: null as any, role: "admin" }));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, full_name: "Admin", role: mockState.role, tenant_id: 1 } }),
}));
vi.mock("../../hooks/useTenantBillingSummary", () => ({
  useTenantBillingSummary: () => ({ billing: mockState.billing, isLoading: false, error: null, refreshBilling: mockRefreshBilling }),
}));
vi.mock("../../services/api", async () => ({
  ...await vi.importActual<typeof import("../../services/api")>("../../services/api"),
  getBillingPayments: vi.fn().mockResolvedValue([]),
  createBillingCheckout: vi.fn(),
}));

const allowed = (action = "activate") => ({ allowed: true, action, denial_code: null, available_after: null });
const blocked = () => ({ allowed: false, action: "blocked", denial_code: "PAID_PLAN_CHANGE_NOT_ALLOWED", available_after: "2026-11-14T00:00:00Z" });
const renderBilling = async () => { await act(async () => { render(<BillingView />); }); };
const card = (name: string) => within(screen.getByRole("group", { name: "Тариф " + name }));

beforeEach(() => {
  vi.clearAllMocks(); mockState.role = UserRole.ADMIN;
  mockState.billing = {
    current_plan: { code: "free", name: "Бесплатный" },
    effective_plan: { code: "free", name: "Бесплатный", limit_machines: 2, limit_drivers: 2, limit_sites: 2 },
    entitlement: { source: "free", status: "active", starts_at: null, expires_at: null },
    usage: { drivers: { current: 3, limit: 2, over_limit: true }, trucks: { current: 1, limit: 2, over_limit: false }, sites: { current: 1, limit: 2, over_limit: false } },
    checkout_plans: { start: allowed(), business: allowed(), company: allowed() },
  };
  mockRefreshBilling.mockImplementation(async () => mockState.billing);
  vi.mocked(getBillingPayments).mockResolvedValue([]);
  vi.mocked(createBillingCheckout).mockResolvedValue({ payment_id: 100, status: "pending", confirmation_url: null });
});

it("uses user-facing billing status and effective Free copy", async () => {
  await renderBilling();
  expect(await screen.findByRole("button", { name: /Проверить статус/ })).toBeInTheDocument();
  expect(screen.getByText(/После оплаты статус тарифа обновится автоматически/)).toBeInTheDocument();
  expect(screen.queryByText(/Фронтенд не подтверждает оплату сам/)).not.toBeInTheDocument();
  expect(screen.queryByText(/backend/)).not.toBeInTheDocument();
  expect(screen.getByText(/Источник:/)).toBeInTheDocument();
  expect(screen.getAllByText("Бесплатный")).toHaveLength(2);
  expect(screen.getByText("Без срока")).toBeInTheDocument();
  expect(screen.getByText("Превышен лимит")).toBeInTheDocument();
});

it("blocks early same-plan renewal and other plans, showing server expiry", async () => {
  mockState.billing.effective_plan = { ...mockState.billing.effective_plan, code: "start", name: "Старт" };
  mockState.billing.entitlement = { source: "paid", status: "active", expires_at: "2026-11-14T00:00:00Z" };
  mockState.billing.checkout_plans = { start: { ...blocked(), denial_code: "PAID_RENEWAL_NOT_AVAILABLE" }, business: blocked(), company: blocked() };
  await renderBilling();
  const renew = card("Старт").getByRole("button", { name: "После окончания периода" });
  expect(renew).toBeDisabled();
  expect(card("Бизнес").getByRole("button")).toBeDisabled();
  expect(card("Бизнес").getByText(/Оплата доступна после окончания/)).toBeInTheDocument();
  expect(card("Старт").getByText(/14.11.2026/)).toBeInTheDocument();
  expect(card("Старт").getByText(/Досрочная оплата недоступна/)).toBeInTheDocument();
  fireEvent.click(card("Бизнес").getByRole("button")); expect(createBillingCheckout).not.toHaveBeenCalled();
  fireEvent.click(renew);
  expect(createBillingCheckout).not.toHaveBeenCalled();
});

it("allows current Pilot plan to be purchased as paid", async () => {
  mockState.billing.effective_plan.code = "start"; mockState.billing.effective_plan.name = "Старт";
  mockState.billing.entitlement.source = "pilot";
  await renderBilling();
  const buy = card("Старт").getByRole("button", { name: "Перейти к оплате" });
  expect(buy).toBeEnabled(); fireEvent.click(buy);
  await waitFor(() => expect(createBillingCheckout).toHaveBeenCalledWith("start"));
});

it("expired stored paid with server effective Free permits another plan", async () => {
  mockState.billing.current_plan = { code: "start", name: "Старт" };
  await renderBilling();
  expect(card("Бизнес").getByRole("button", { name: "Перейти к оплате" })).toBeEnabled();
});

it("does not derive a competing plan policy from effective plan in the browser", async () => {
  mockState.billing.effective_plan.code = "start"; mockState.billing.entitlement.source = "paid";
  await renderBilling();
  expect(card("Бизнес").getByRole("button", { name: "Перейти к оплате" })).toBeEnabled();
});

it("unknown server policy stays neutral and does not permit an uninformed checkout", async () => {
  mockState.billing.checkout_plans = null;
  await renderBilling();
  expect(screen.getAllByRole("button", { name: "Доступность уточняется" })).toHaveLength(3);
  for (const button of screen.getAllByRole("button", { name: "Доступность уточняется" })) expect(button).toBeDisabled();
  expect(createBillingCheckout).not.toHaveBeenCalled();
});

it("foreman cannot purchase even when server plan policy permits renewal", async () => {
  mockState.role = UserRole.FOREMAN;
  mockState.billing.checkout_plans.start = allowed("renew");
  await renderBilling();
  expect(card("Старт").getByRole("button", { name: "Доступно администратору" })).toBeDisabled();
});

it("refreshes server policy after a stale plan-change denial and explains it", async () => {
  vi.mocked(createBillingCheckout).mockRejectedValue(Object.assign(new Error("denied"), { backendCode: "PAID_PLAN_CHANGE_NOT_ALLOWED" }));
  await renderBilling(); fireEvent.click(card("Бизнес").getByRole("button"));
  expect(await screen.findByText(/Оплата доступна после окончания текущего оплаченного периода/)).toBeInTheDocument();
  await waitFor(() => expect(mockRefreshBilling).toHaveBeenCalledTimes(1));
});

it("immediate success refreshes billing without claiming online payment unavailable", async () => {
  vi.mocked(createBillingCheckout).mockResolvedValue({ payment_id: 100, status: "succeeded", confirmation_url: null });
  await renderBilling(); fireEvent.click(card("Старт").getByRole("button"));
  await waitFor(() => expect(mockRefreshBilling).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(/Онлайн-оплата пока недоступна/)).not.toBeInTheDocument();
});

it("shows operator review explicitly for a paid conflicting checkout", async () => {
  vi.mocked(createBillingCheckout).mockResolvedValue({ payment_id: 100, status: "requires_review", confirmation_url: null });
  await renderBilling(); fireEvent.click(card("Старт").getByRole("button"));
  expect(await screen.findByText(/Платёж получен и требует проверки/)).toBeInTheDocument();
  expect(mockRefreshBilling).toHaveBeenCalledTimes(1);
});

it("keeps disabled-provider wording when the backend rejects creation", async () => {
  vi.mocked(createBillingCheckout).mockRejectedValue(new Error("YooKassa is disabled or not configured"));
  await renderBilling(); fireEvent.click(card("Старт").getByRole("button"));
  expect(await screen.findByText("Онлайн-оплата пока недоступна. Напишите в поддержку.")).toBeInTheDocument();
});

it("a double click before the render commits starts only one checkout", async()=>{
  let finish!: (value:any)=>void;
  vi.mocked(createBillingCheckout).mockReturnValue(new Promise(resolve=>{finish=resolve;}));
  await renderBilling();const buy=card("Старт").getByRole("button");
  fireEvent.click(buy);fireEvent.click(buy);expect(createBillingCheckout).toHaveBeenCalledTimes(1);
  await act(async()=>{finish({payment_id:100,status:"pending",confirmation_url:null});});
});

it("after expiry the same plan is purchasable only when the server allows it",async()=>{
  mockState.billing.current_plan={code:"start",name:"Старт"};
  await renderBilling();expect(card("Старт").getByRole("button",{name:"Перейти к оплате"})).toBeEnabled();
});

it.each(["PAID_RENEWAL_NOT_AVAILABLE","CHECKOUT_RESULT_PENDING","CHECKOUT_REVIEW_REQUIRED"])("explains %s without encouraging an independent payment",async code=>{
  vi.mocked(createBillingCheckout).mockRejectedValue(Object.assign(new Error("fixture"),{backendCode:code}));
  await renderBilling();fireEvent.click(card("Старт").getByRole("button"));
  const message=code==="PAID_RENEWAL_NOT_AVAILABLE"?/Досрочная оплата недоступна/:code==="CHECKOUT_RESULT_PENDING"?/восстановит существующий платёж/:/Не оплачивайте повторно/;
  expect(await screen.findByText(message)).toBeInTheDocument();
});
