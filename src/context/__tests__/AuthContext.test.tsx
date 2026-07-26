import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import {
  APP_DEMO_PERSONA_KEY,
  DEMO_PERSONA_KEY,
  EXPLICIT_DEMO_LOGOUT_KEY,
  demoActiveShiftKey,
} from "../../config/demo";
import { TOKEN_KEY, USER_KEY } from "../../services/api";
import { DEMO_SESSION_STORAGE_KEY } from "../../lib/demoSession";

const {
  mockClearAuth,
  mockRedirectToLogin,
  mockRefreshUser,
} = vi.hoisted(() => ({
  mockClearAuth: vi.fn(),
  mockRedirectToLogin: vi.fn(),
  mockRefreshUser: vi.fn(),
}));

vi.mock("../../config/demo", async () => {
  const actual = await vi.importActual<typeof import("../../config/demo")>(
    "../../config/demo"
  );

  return {
    ...actual,
    redirectToLogin: mockRedirectToLogin,
  };
});

vi.mock("../../services/api", async () => {
  const actual = await vi.importActual<typeof import("../../services/api")>(
    "../../services/api"
  );

  return {
    ...actual,
    clearAuth: mockClearAuth,
    refreshUser: mockRefreshUser,
  };
});

vi.mock("../../components/common/PasswordChangeModal", () => ({
  default: () => <div>Password modal</div>,
}));

const callLog: string[] = [];

const Harness = ({
  options,
}: {
  options: { redirectToLogin?: boolean; markExplicitDemoLogout?: boolean };
}) => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div>
      <div data-testid="auth-state">{isAuthenticated ? "auth" : "guest"}</div>
      <button type="button" onClick={() => logout(options)}>
        Logout
      </button>
    </div>
  );
};

const seedAuthenticatedStorage = () => {
  localStorage.setItem(TOKEN_KEY, "header.payload.signature");
  localStorage.setItem(USER_KEY, JSON.stringify({ id: 1, full_name: "Demo User" }));
};

describe("AuthContext logout flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    callLog.length = 0;
    mockRefreshUser.mockResolvedValue({});
    mockClearAuth.mockImplementation(() => {
      callLog.push("clearAuth");
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    });
    mockRedirectToLogin.mockImplementation(() => {
      callLog.push("redirect");
    });
  });

  it("keeps selective cleanup, demo marker, and unrelated keys on explicit demo logout", async () => {
    seedAuthenticatedStorage();
    localStorage.setItem(APP_DEMO_PERSONA_KEY, "driver");
    localStorage.setItem(DEMO_PERSONA_KEY, "77");
    localStorage.setItem(demoActiveShiftKey(null), JSON.stringify({ id: 1 }));
    localStorage.setItem(demoActiveShiftKey(77), JSON.stringify({ id: 500 }));
    localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify({ version: 1 }));
    localStorage.setItem("keep_me", "1");

    render(
      <AuthProvider>
        <Harness options={{ redirectToLogin: false, markExplicitDemoLogout: true }} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("auth");
    });

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(localStorage.getItem(APP_DEMO_PERSONA_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_PERSONA_KEY)).toBeNull();
    expect(localStorage.getItem(demoActiveShiftKey(null))).toBeNull();
    expect(localStorage.getItem(demoActiveShiftKey(77))).toBeNull();
    expect(localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("keep_me")).toBe("1");
    expect(sessionStorage.getItem(EXPLICIT_DEMO_LOGOUT_KEY)).toBe("1");
    expect(screen.getByTestId("auth-state")).toHaveTextContent("guest");
    expect(mockRedirectToLogin).not.toHaveBeenCalled();
  });

  it("keeps non-demo logout behavior without setting the explicit demo marker", () => {
    seedAuthenticatedStorage();
    sessionStorage.setItem(EXPLICIT_DEMO_LOGOUT_KEY, "1");

    render(
      <AuthProvider>
        <Harness options={{ redirectToLogin: false, markExplicitDemoLogout: false }} />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(sessionStorage.getItem(EXPLICIT_DEMO_LOGOUT_KEY)).toBeNull();
    expect(mockRedirectToLogin).not.toHaveBeenCalled();
  });

  it("clears React auth state even if localStorage cleanup throws and continues remaining cleanup", async () => {
    seedAuthenticatedStorage();
    localStorage.setItem(APP_DEMO_PERSONA_KEY, "driver");
    localStorage.setItem(DEMO_PERSONA_KEY, "77");
    localStorage.setItem(demoActiveShiftKey(77), JSON.stringify({ id: 500 }));
    const originalRemoveItem = Storage.prototype.removeItem;

    const removeSpy = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(function (this: Storage, key: string) {
        if (this === localStorage && key === APP_DEMO_PERSONA_KEY) {
          throw new Error("localStorage remove failed");
        }
        return originalRemoveItem.call(this, key);
      });

    render(
      <AuthProvider>
        <Harness options={{ redirectToLogin: false, markExplicitDemoLogout: true }} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("auth");
    });

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(screen.getByTestId("auth-state")).toHaveTextContent("guest");
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(localStorage.getItem(APP_DEMO_PERSONA_KEY)).toBe("driver");
    expect(localStorage.getItem(DEMO_PERSONA_KEY)).toBeNull();
    expect(localStorage.getItem(demoActiveShiftKey(77))).toBeNull();
    expect(sessionStorage.getItem(EXPLICIT_DEMO_LOGOUT_KEY)).toBe("1");
    expect(mockClearAuth).toHaveBeenCalledTimes(1);

    removeSpy.mockRestore();
  });

  it("clears React auth state even if sessionStorage throws", async () => {
    seedAuthenticatedStorage();
    const originalRemoveItem = Storage.prototype.removeItem;

    const removeSpy = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(function (this: Storage, key: string) {
        if (this === sessionStorage && key === EXPLICIT_DEMO_LOGOUT_KEY) {
          throw new Error("sessionStorage remove failed");
        }
        return originalRemoveItem.call(this, key);
      });

    render(
      <AuthProvider>
        <Harness options={{ redirectToLogin: false, markExplicitDemoLogout: false }} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("auth");
    });

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(screen.getByTestId("auth-state")).toHaveTextContent("guest");
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(mockRedirectToLogin).not.toHaveBeenCalled();

    removeSpy.mockRestore();
  });

  it("calls redirect only when requested and preserves cleared auth state if redirect throws", async () => {
    seedAuthenticatedStorage();
    mockRedirectToLogin.mockImplementation(() => {
      callLog.push("redirect");
      throw new Error("replace failed");
    });

    render(
      <AuthProvider>
        <Harness options={{ redirectToLogin: true, markExplicitDemoLogout: false }} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("auth");
    });

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(mockRedirectToLogin).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("auth-state")).toHaveTextContent("guest");
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(callLog).toContain("clearAuth");
    expect(callLog).toContain("redirect");
    expect(callLog.indexOf("clearAuth")).toBeLessThan(callLog.indexOf("redirect"));
  });

  it("does not redirect when redirectToLogin is false", async () => {
    seedAuthenticatedStorage();

    render(
      <AuthProvider>
        <Harness options={{ redirectToLogin: false, markExplicitDemoLogout: false }} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("auth");
    });

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(mockRedirectToLogin).not.toHaveBeenCalled();
    expect(screen.getByTestId("auth-state")).toHaveTextContent("guest");
  });
});
