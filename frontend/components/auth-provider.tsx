"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppUser } from "@/lib/types";
import { fetchProfile, loginRequest, registerRequest } from "@/lib/api";

const TOKEN_KEY = "readitlater_token";
const USER_KEY = "readitlater_user";

type AuthContextValue = {
  user: AppUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredJson(): { token: string | null; user: AppUser | null } {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (!token || !raw) return { token: null, user: null };
    const user = JSON.parse(raw) as AppUser;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

function persistAuth(token: string, user: AppUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { token: t, user: u } = readStoredJson();
    setToken(t);
    setUser(u);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: t, user: u } = await loginRequest(email, password);
    persistAuth(t, u);
    setToken(t);
    setUser(u);
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      await registerRequest(username, email, password);
    },
    []
  );

  const refreshUser = useCallback(async () => {
    const t = token ?? readStoredJson().token;
    if (!t) return;
    const u = await fetchProfile(t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, register, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
