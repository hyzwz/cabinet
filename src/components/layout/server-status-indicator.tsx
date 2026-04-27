"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

export function ServerStatusIndicator() {
  const { t } = useLocale();
  const [appAlive, setAppAlive] = useState(true);
  const [daemonAlive, setDaemonAlive] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<
    { id: string; name: string; available: boolean; authenticated: boolean }[]
  >([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);

  const anyProviderReady = useMemo(
    () => !providersLoaded || providerStatuses.some((p) => p.available && p.authenticated),
    [providersLoaded, providerStatuses],
  );
  const allReady = appAlive && daemonAlive && anyProviderReady;
  const appDown = !appAlive;

  const fetchProviderStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/providers/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.providers)) {
        setProviderStatuses(data.providers);
        setProvidersLoaded(true);
      }
    } catch {
      // Keep the last known state.
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      const [appRes, daemonRes] = await Promise.allSettled([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/health/daemon", { cache: "no-store" }),
      ]);
      if (!mounted) return;
      setAppAlive(appRes.status === "fulfilled" && appRes.value.ok);
      setDaemonAlive(daemonRes.status === "fulfilled" && daemonRes.value.ok);
    };

    void checkHealth();
    void fetchProviderStatus();
    const interval = window.setInterval(() => {
      void checkHealth();
      void fetchProviderStatus();
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [fetchProviderStatus]);

  const statusTitle = allReady
    ? t("layout.status.health.allRunning")
    : appDown
      ? t("layout.status.health.appDown")
      : !daemonAlive && !anyProviderReady
        ? t("layout.status.health.daemonAndProvidersDown")
        : !daemonAlive
          ? t("layout.status.health.daemonDown")
          : t("layout.status.health.noProviders");

  return (
    <div className="relative flex items-center border-t border-border bg-background px-3 py-1 text-[11px] text-muted-foreground/70">
      <button
        onClick={() => setShowPopup((open) => !open)}
        className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors ${
          allReady
            ? "text-green-500 hover:bg-green-500/10"
            : appDown
              ? "text-red-500 hover:bg-red-500/10"
              : "text-amber-500 hover:bg-amber-500/10"
        }`}
        title={statusTitle}
        aria-label={t("layout.status.serverStatusAria")}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            allReady
              ? "bg-green-500"
              : appDown
                ? "bg-red-500 animate-pulse"
                : "bg-amber-500 animate-pulse"
          }`}
        />
        <span>
          {allReady
            ? t("layout.status.online")
            : appDown
              ? t("layout.status.offline")
              : t("layout.status.degraded")}
        </span>
      </button>

      {showPopup && (
        <div
          className={`absolute bottom-full left-3 z-50 mb-2 w-80 rounded-lg border bg-background p-3 shadow-lg ${
            allReady
              ? "border-green-500/30"
              : appDown
                ? "border-red-500/30"
                : "border-amber-500/30"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2.5">
              <p className={`text-xs font-medium ${allReady ? "text-green-500" : appDown ? "text-red-500" : "text-amber-500"}`}>
                {allReady ? t("layout.status.popup.allRunning") : t("layout.status.popup.disruption")}
              </p>

              <StatusRow
                label={t("layout.status.popup.appServer")}
                ok={appAlive}
                okLabel={t("layout.status.popup.running")}
                downLabel={t("layout.status.popup.down")}
                detail={appAlive ? t("layout.status.popup.pagesWorking") : t("layout.status.popup.pagesUnavailable")}
              />
              <StatusRow
                label={t("layout.status.popup.daemon")}
                ok={daemonAlive}
                okLabel={t("layout.status.popup.running")}
                downLabel={t("layout.status.popup.down")}
                detail={daemonAlive ? t("layout.status.popup.agentsWorking") : t("layout.status.popup.agentsUnavailable")}
              />

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${anyProviderReady ? "bg-green-500" : "bg-amber-500"}`} />
                  <span className="font-medium text-foreground/80">{t("layout.status.popup.providers")}</span>
                  <span className={`ml-auto ${anyProviderReady ? "text-green-500" : "text-amber-500"}`}>
                    {!providersLoaded
                      ? t("layout.status.popup.checking")
                      : anyProviderReady
                        ? t("layout.status.popup.available")
                        : t("layout.status.popup.noneReady")}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPopup(false)}
              className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("layout.status.popup.dismiss")}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({
  label,
  ok,
  okLabel,
  downLabel,
  detail,
}: {
  label: string;
  ok: boolean;
  okLabel: string;
  downLabel: string;
  detail: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 text-[11px]">
        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
        <span className="font-medium text-foreground/80">{label}</span>
        <span className={`ml-auto ${ok ? "text-green-500" : "text-red-500"}`}>{ok ? okLabel : downLabel}</span>
      </div>
      <p className="pl-3.5 text-[10px] text-muted-foreground/70">{detail}</p>
    </div>
  );
}
