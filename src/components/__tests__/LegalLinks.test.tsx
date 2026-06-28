import { render, screen } from "@testing-library/react";
import LegalLinks from "../LegalLinks";
import { PUBLIC_LEGAL_LINKS, SUPPORT_EMAIL } from "../../config/legal";

const { mockIsMarketingHostname } = vi.hoisted(() => ({
  mockIsMarketingHostname: vi.fn(),
}));

vi.mock("../../config/demo", async () => {
  const actual = await vi.importActual<typeof import("../../config/demo")>(
    "../../config/demo"
  );

  return {
    ...actual,
    isMarketingHostname: mockIsMarketingHostname,
  };
});

describe("LegalLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides only the support block when showSupport is false", () => {
    mockIsMarketingHostname.mockReturnValue(true);

    render(<LegalLinks showSupport={false} />);

    expect(screen.queryByText(SUPPORT_EMAIL)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Написать в поддержку/i })
    ).not.toBeInTheDocument();
    PUBLIC_LEGAL_LINKS.forEach((link) => {
      expect(screen.getByRole("link", { name: link.label })).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /Настройки cookies/i })
    ).toBeInTheDocument();
  });

  it("keeps the default support block on public pages", () => {
    mockIsMarketingHostname.mockReturnValue(false);

    render(<LegalLinks compact />);

    expect(screen.getByText(SUPPORT_EMAIL)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Написать в поддержку/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Настройки cookies/i })
    ).not.toBeInTheDocument();
  });
});
