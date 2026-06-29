import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_UNAUTHORIZED_EVENT,
} from "../../shared/api/client";
import type {
  LoginPayload,
  RegisterPayload,
  User,
  UserUpdatePayload,
} from "../../shared/api/types";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  updateCurrentUser,
} from "./api";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  updateProfile: (payload: UserUpdatePayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const restoreStarted = useRef(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setUser(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    if (restoreStarted.current) {
      return;
    }
    restoreStarted.current = true;

    if (!localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
      setStatus("anonymous");
      return;
    }

    void getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch(() => {
        clearSession();
      });
  }, [clearSession]);

  useEffect(() => {
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, clearSession);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, clearSession);
  }, [clearSession]);

  const login = useCallback(async (payload: LoginPayload) => {
    const session = await loginRequest(payload);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.access_token);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const session = await registerRequest(payload);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.access_token);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const updateProfile = useCallback(async (payload: UserUpdatePayload) => {
    const updatedUser = await updateCurrentUser(payload);
    setUser(updatedUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
        await logoutRequest();
      }
    } catch {
      // Logout remains client-side for stateless JWTs, even if the API is unavailable.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, status, login, register, updateProfile, logout }),
    [user, status, login, register, updateProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
