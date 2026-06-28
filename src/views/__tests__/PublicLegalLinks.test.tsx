import { render, screen } from "@testing-library/react";
import LandingView from "../LandingView";
import { LoginView } from "../LoginView";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../components/BrandLogo", () => ({
  default: () => <div>Brand</div>,
}));

vi.mock("../../components/LegalLinks", () => ({
  default: () => <div data-testid="public-legal-links">LegalLinks</div>,
}));

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
  });

  it("keeps the shared legal links block on the login page", () => {
    render(<LoginView />);

    expect(screen.getByTestId("public-legal-links")).toBeInTheDocument();
  });

  it("keeps the shared legal links block on the landing page", () => {
    render(<LandingView />);

    expect(screen.getByTestId("public-legal-links")).toBeInTheDocument();
  });
});
