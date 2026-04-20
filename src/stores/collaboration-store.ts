"use client";

import { create } from "zustand";
import { useAuthStore } from "@/stores/auth-store";

interface LockInfo {
  page_path: string;
  user_id: string;
  username: string;
  acquired_at: number;
  last_heartbeat: number;
}

interface CollaborationState {
  lockStatus: "idle" | "locked_by_me" | "locked_by_other" | "acquiring";
  lockInfo: LockInfo | null;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  recheckTimer: ReturnType<typeof setInterval> | null;
  heartbeatFailures: number;

  checkLock: (pagePath: string) => Promise<void>;
  acquireLock: (pagePath: string) => Promise<boolean>;
  releaseLock: (pagePath: string) => Promise<void>;
  clearLock: () => void;
  startHeartbeat: (pagePath: string) => void;
  startLockRecheck: (pagePath: string) => void;
}

const MAX_HEARTBEAT_FAILURES = 3;

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  lockStatus: "idle",
  lockInfo: null,
  heartbeatTimer: null,
  recheckTimer: null,
  heartbeatFailures: 0,

  checkLock: async (pagePath: string) => {
    try {
      const res = await fetch(`/api/locks/${pagePath}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.locked) {
        set({ lockStatus: "idle", lockInfo: null });
        return;
      }
      const authUser = useAuthStore.getState().user;
      if (authUser && data.lock.user_id === authUser.userId) {
        set({ lockStatus: "locked_by_me", lockInfo: data.lock });
        get().startHeartbeat(pagePath);
      } else {
        set({ lockStatus: "locked_by_other", lockInfo: data.lock });
        get().startLockRecheck(pagePath);
      }
    } catch {
      set({ lockStatus: "idle", lockInfo: null });
    }
  },

  acquireLock: async (pagePath: string) => {
    set({ lockStatus: "acquiring" });
    try {
      const res = await fetch(`/api/locks/${pagePath}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        set({ lockStatus: "locked_by_me", lockInfo: data.lock });
        get().startHeartbeat(pagePath);
        return true;
      }
      if (res.status === 423) {
        set({
          lockStatus: "locked_by_other",
          lockInfo: {
            page_path: pagePath,
            user_id: "",
            username: data.lockedBy,
            acquired_at: data.acquiredAt,
            last_heartbeat: data.acquiredAt,
          },
        });
        get().startLockRecheck(pagePath);
        return false;
      }
      set({ lockStatus: "idle", lockInfo: null });
      return false;
    } catch {
      set({ lockStatus: "idle", lockInfo: null });
      return false;
    }
  },

  releaseLock: async (pagePath: string) => {
    const { heartbeatTimer, recheckTimer } = get();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (recheckTimer) clearInterval(recheckTimer);
    try {
      await fetch(`/api/locks/${pagePath}`, { method: "DELETE" });
    } catch {
      // Best effort
    }
    set({ lockStatus: "idle", lockInfo: null, heartbeatTimer: null, recheckTimer: null, heartbeatFailures: 0 });
  },

  clearLock: () => {
    const { heartbeatTimer, recheckTimer } = get();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (recheckTimer) clearInterval(recheckTimer);
    set({ lockStatus: "idle", lockInfo: null, heartbeatTimer: null, recheckTimer: null, heartbeatFailures: 0 });
  },

  startHeartbeat: (pagePath: string) => {
    const { heartbeatTimer } = get();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    set({ heartbeatFailures: 0 });

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/heartbeat/${pagePath}`, {
          method: "POST",
        });
        if (res.ok) {
          set({ heartbeatFailures: 0 });
        } else {
          // Lock lost (expired or taken)
          clearInterval(timer);
          set({ lockStatus: "idle", lockInfo: null, heartbeatTimer: null, heartbeatFailures: 0 });
        }
      } catch {
        // Network error — increment failures, release after threshold
        const failures = get().heartbeatFailures + 1;
        set({ heartbeatFailures: failures });
        if (failures >= MAX_HEARTBEAT_FAILURES) {
          clearInterval(timer);
          set({ lockStatus: "idle", lockInfo: null, heartbeatTimer: null, heartbeatFailures: 0 });
        }
      }
    }, 60_000);
    set({ heartbeatTimer: timer });
  },

  // Periodically recheck if another user's lock has expired
  startLockRecheck: (pagePath: string) => {
    const { recheckTimer } = get();
    if (recheckTimer) clearInterval(recheckTimer);

    const timer = setInterval(async () => {
      const { lockStatus: status } = get();
      if (status !== "locked_by_other") {
        clearInterval(timer);
        set({ recheckTimer: null });
        return;
      }
      try {
        const res = await fetch(`/api/locks/${pagePath}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.locked) {
          clearInterval(timer);
          set({ lockStatus: "idle", lockInfo: null, recheckTimer: null });
        }
      } catch {
        // Retry on next interval
      }
    }, 30_000);
    set({ recheckTimer: timer });
  },
}));
