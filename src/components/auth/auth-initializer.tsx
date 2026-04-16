"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function AuthInitializer() {
  const fetchAuth = useAuthStore((s) => s.fetchAuth);
  const loaded = useAuthStore((s) => s.loaded);

  useEffect(() => {
    if (!loaded) {
      fetchAuth();
    }
  }, [fetchAuth, loaded]);

  return null;
}
