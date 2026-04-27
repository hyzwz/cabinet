"use client";

import { create } from "zustand";
import type { SystemRole, UserRole, UserStatus } from "@/types";

interface AuthUser {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  systemRole: SystemRole;
  status: UserStatus;
  companyAdminCompanyIds: string[];
}

interface AuthState {
  user: AuthUser | null;
  authMode: "none" | "legacy" | "multi";
  loaded: boolean;
  setUser: (user: AuthUser | null) => void;
  setAuthMode: (mode: AuthState["authMode"]) => void;
  setLoaded: () => void;
  logout: () => Promise<void>;
  fetchAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authMode: "none",
  loaded: false,

  setUser: (user) => set({ user }),
  setAuthMode: (authMode) => set({ authMode }),
  setLoaded: () => set({ loaded: true }),

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
    window.location.href = "/login";
  },

  fetchAuth: async () => {
    try {
      const res = await fetch("/api/auth/check");
      const data = await res.json();
      set({
        loaded: true,
        authMode: data.mode || "none",
        user: data.user
          ? {
              userId: data.user.userId,
              username: data.user.username,
              displayName: data.user.displayName,
              role: data.user.role,
              systemRole: data.user.systemRole || (data.user.role === "admin" ? "platform_admin" : "user"),
              status: data.user.status || "active",
              companyAdminCompanyIds: data.user.companyAdminCompanyIds || [],
            }
          : null,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));
