"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  BalanceResponse,
} from "@/types/auth";
import { apiPost, apiGet } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  balance: string | null;
  planType: "free" | "premium";
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  loginWithGoogle: (code: string, redirectUri: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/password-reset",
  "/password-reset-confirm",
  "/pricing",
  "/auth/google/callback",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<string | null>(null);
  const [planType, setPlanType] = useState<"free" | "premium">("free");
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!user;

  const refreshUser = useCallback(async () => {
    try {
      const userData = await apiGet<User>("/auth/me/");
      setUser(userData);
    } catch {
      setUser(null);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const data = await apiGet<BalanceResponse>("/billing/balance/");
      setBalance(data.balance);
      setPlanType(data.plan.plan_type);
    } catch {
      // Silently fail
    }
  }, []);

  // On mount: check if a valid session cookie exists by calling /auth/me/
  useEffect(() => {
    async function init() {
      try {
        const userData = await apiGet<User>("/auth/me/");
        setUser(userData);
        refreshBalance();
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [refreshBalance]);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isPublic = isPublicPath(pathname);

    if (!isAuthenticated && !isPublic) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && user && !user.has_completed_onboarding) {
      if (pathname !== "/onboarding") {
        router.replace("/onboarding");
        return;
      }
    }

    if (isAuthenticated && isPublic) {
      if (user?.has_completed_onboarding) {
        router.replace("/app");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  const login = useCallback(
    async (data: LoginRequest) => {
      const res = await apiPost<AuthResponse>("/auth/login/", data, {
        auth: false,
      });
      setUser(res.user);
      refreshBalance();

      if (!res.user.has_completed_onboarding) {
        router.push("/onboarding");
      } else {
        router.push("/app");
      }
    },
    [router, refreshBalance]
  );

  const register = useCallback(
    async (data: RegisterRequest): Promise<AuthResponse> => {
      const res = await apiPost<AuthResponse>("/auth/register/", data, {
        auth: false,
      });

      if (res.user?.is_email_verified) {
        // AUTO_VERIFY_EMAIL=True (dev) — cookies already set, go straight to onboarding
        setUser(res.user);
        refreshBalance();
        router.push("/onboarding");
      }
      // If is_email_verified=false, do nothing here — the register page handles the UI

      return res;
    },
    [router, refreshBalance]
  );

  const loginWithGoogle = useCallback(
    async (code: string, redirectUri: string) => {
      const res = await apiPost<AuthResponse>("/auth/google/", { code, redirect_uri: redirectUri }, { auth: false });
      setUser(res.user);
      refreshBalance();

      if (!res.user.has_completed_onboarding) {
        router.push("/onboarding");
      } else {
        router.push("/app");
      }
    },
    [router, refreshBalance]
  );

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout/");
    } catch {
      // Silently fail — cookies will expire naturally
    }
    setUser(null);
    setBalance(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      balance,
      planType,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
      refreshBalance,
    }),
    [
      user,
      isLoading,
      isAuthenticated,
      balance,
      planType,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
      refreshBalance,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
