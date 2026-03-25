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
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  BalanceResponse,
} from "@/types/auth";
import {
  apiPost,
  apiGet,
  getStoredTokens,
  setStoredTokens,
  clearStoredTokens,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  balance: string | null;
  planType: "free" | "premium";
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => void;
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
];

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
      clearStoredTokens();
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

  // On mount: check stored tokens and load user
  useEffect(() => {
    async function init() {
      const tokens = getStoredTokens();
      if (!tokens?.access) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await apiGet<User>("/auth/me/");
        setUser(userData);
        // Load balance in parallel
        refreshBalance();
      } catch {
        clearStoredTokens();
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [refreshBalance]);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

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
        router.replace("/dashboard");
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
      setStoredTokens(res.tokens);
      setUser(res.user);
      refreshBalance();

      if (!res.user.has_completed_onboarding) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    },
    [router, refreshBalance]
  );

  const register = useCallback(
    async (data: RegisterRequest): Promise<AuthResponse> => {
      const res = await apiPost<AuthResponse>("/auth/register/", data, {
        auth: false,
      });

      if (res.tokens) {
        setStoredTokens(res.tokens);
        setUser(res.user);
        refreshBalance();
        router.push("/onboarding");
      }

      return res;
    },
    [router, refreshBalance]
  );

  const logout = useCallback(() => {
    clearStoredTokens();
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
