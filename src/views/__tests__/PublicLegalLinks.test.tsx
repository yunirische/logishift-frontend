import { render, screen } from "@testing-library/react";
import LandingView from "../LandingView";
import { LoginView } from "../LoginView";
import {
  PUBLIC_LEGAL_LINKS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "../../config/legal";

const { mockUseAuth, mockIsMarketingHostname } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockIsMarketingHostname: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../components/BrandLogo", () => ({
  default: () => <div>Brand</div>,
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

vi.mock("../../components/ui", () => ({
  Button: ({ children, isLoading, ...props }: any) => (
    <button {...props} data-loading={isLoading ? "true" : "false"}>
      {children}
    </button>
  ),
  Input: (props: any) => <input {...props} />,
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock("../../services/api", async () => {
  const actual = await vi.importActual<typeof import("../../services/api")>(
    "../../services/api"
  );

  return {
    ...actual,
    default: {
      post: vi.fn(),
    },
  };
});

describe("Public legal links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ login: vi.fn() });
    mockIsMarketingHostname.mockReturnValue(true);
  });

  it("keeps the shared legal links block on the login page", () => {
    render(<LoginView />);

    expect(screen.getByText(SUPPORT_EMAIL)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Написать в поддержку/i })
    ).toBeInTheDocument();
  });

  it("renders landing support links only once and keeps legal links", () => {
    render(<LandingView />);

    expect(screen.getAllByText(SUPPORT_EMAIL)).toHaveLength(1);
    expect(screen.getAllByText(SUPPORT_PHONE)).toHaveLength(1);
    expect(
      screen.getAllByRole("link", { name: /Написать в поддержку/i })
    ).toHaveLength(1);

    PUBLIC_LEGAL_LINKS.forEach((link) => {
      expect(screen.getByRole("link", { name: link.label })).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /Настройки cookies/i })
    ).toBeInTheDocument();
  });
});
