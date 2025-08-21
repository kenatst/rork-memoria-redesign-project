import React, { useCallback, useEffect, useMemo, useState } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AUTH_KEY = "memoria_auth_v1";

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { user?: AuthUser };
          setUser(parsed.user ?? null);
        }
      } catch (e) {
        console.log("Load auth error", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (nextUser: AuthUser | null) => {
    try {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ user: nextUser }));
    } catch (e) {
      console.log("Persist auth error", e);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const mockUser: AuthUser = { id: "u_" + Date.now().toString(), email, displayName: email.split("@")[0] };
      setUser(mockUser);
      await persist(mockUser);
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const mockUser: AuthUser = { id: "u_" + Date.now().toString(), email, displayName };
      setUser(mockUser);
      await persist(mockUser);
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      setUser(null);
      await persist(null);
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  return useMemo(() => ({
    isLoading,
    isAuthenticated: !!user,
    user,
    signIn,
    signUp,
    signOut,
  }), [isLoading, user, signIn, signUp, signOut]);
});