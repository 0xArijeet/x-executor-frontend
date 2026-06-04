import { authApi } from "@/lib/hub/api";
import type { User } from "@/lib/hub/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearToken, getToken, setToken } from "./storage";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const current = getToken();
    setTokenState(current);
    if (!current) {
      setUser(null);
      return;
    }
    const me = await authApi.me(current);
    setUser(me);
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => {
        clearToken();
        setTokenState(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken } = await authApi.login(email, password);
    setToken(accessToken);
    setTokenState(accessToken);
    const me = await authApi.me(accessToken);
    setUser(me);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { accessToken } = await authApi.register(email, password);
    setToken(accessToken);
    setTokenState(accessToken);
    const me = await authApi.me(accessToken);
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, refreshUser }),
    [user, token, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
