"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useLocale } from "@/components/i18n/locale-provider";


export function StatusBar() {
  const setSection = useAppStore((s) => s.setSection);
  const [appAlive, setAppAlive] = useState(true);
  const [daemonAlive, setDaemonAlive] = useState(true);
  const [installKind, setInstallKind] = useState<"source-managed" | "source-custom" | "electron-macos">("source-custom");
  const [showServerPopup, setShowServerPopup] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<
    { id: string; name: string; available: boolean; authenticated: boolean }[]
  >([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const { t } = useLocale();

  const anyProviderReady = useMemo(
    () => !providersLoaded || providerStatuses.some((p) => p.available && p.authenticated),
    [providersLoaded, providerStatuses],
  );

  const fetchProviderStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/providers/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.providers)) {
        setProviderStatuses(data.providers);
        setProvidersLoaded(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Poll both server health endpoints
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      const [appRes, daemonRes] = await Promise.allSettled([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/health/daemon", { cache: "no-store" }),
      ]);
      if (!mounted) return;
      const appOk = appRes.status === "fulfilled" && appRes.value.ok;
      setAppAlive(appOk);
      setDaemonAlive(daemonRes.status === "fulfilled" && daemonRes.value.ok);
      if (appOk && appRes.status === "fulfilled") {
        try {
          const data = await appRes.value.json();
          if (data.installKind) setInstallKind(data.installKind);
        } catch { /* ignore */ }
      }
    };
    void checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch provider status once on mount
  useEffect(() => {
    void fetchProviderStatus();
  }, [fetchProviderStatus]);

  return (
    <div className="relative flex items-center px-3 py-1 border-t border-border text-[11px] text-muted-foreground/60 bg-background">
      <div className="flex min-w-0 items-center">
        <div className="relative">
          <button
            onClick={() => {
              setShowServerPopup((v) => {
                if (!v) void fetchProviderStatus();
                return !v;
              });
            }}
            className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors cursor-pointer ${
              appAlive && daemonAlive && anyProviderReady
                ? "text-green-500 hover:bg-green-500/10"
                : !appAlive
                ? "text-red-500 hover:bg-red-500/10"
                : "text-amber-500 hover:bg-amber-500/10"
            }`}
            title={
              appAlive && daemonAlive && anyProviderReady
                ? t("layout.status.health.allRunning")
                : !appAlive
                ? t("layout.status.health.appDown")
                : !daemonAlive && !anyProviderReady
                ? `${t("layout.status.health.daemonDown")}; ${t("layout.status.health.noProviders")}`
                : !daemonAlive
                ? t("layout.status.health.daemonDown")
                : t("layout.status.health.noProviders")
            }
            aria-label="Server status — click for details"
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                appAlive && daemonAlive && anyProviderReady
                  ? "bg-green-500"
                  : !appAlive
                  ? "bg-red-500 animate-pulse"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            <span>
              {appAlive && daemonAlive && anyProviderReady
                ? t("layout.status.online")
                : !appAlive
                ? t("layout.status.offline")
                : t("layout.status.degraded")}
            </span>
          </button>
          {showServerPopup && (
            <div className={`absolute bottom-full left-0 mb-2 z-50 w-80 rounded-lg border bg-background p-3 shadow-lg ${
              appAlive && daemonAlive && anyProviderReady
                ? "border-green-500/30"
                : !appAlive
                ? "border-red-500/30"
                : "border-amber-500/30"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2.5">
                  <p className={`text-xs font-medium ${
                    appAlive && daemonAlive && anyProviderReady
                      ? "text-green-500"
                      : !appAlive
                      ? "text-red-500"
                      : "text-amber-500"
                  }`}>
                    {appAlive && daemonAlive && anyProviderReady
                      ? t("layout.status.popup.allRunning")
                      : t("layout.status.popup.disruption")}
                  </p>

                  {/* App Server */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${appAlive ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="font-medium text-foreground/80">{t("layout.status.popup.appServer")}</span>
                      <span className={`ml-auto ${appAlive ? "text-green-500" : "text-red-500"}`}>{appAlive ? t("layout.status.popup.running") : t("layout.status.popup.down")}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 pl-3.5">
                      {appAlive
                        ? t("layout.status.popup.pagesWorking")
                        : t("layout.status.popup.pagesUnavailable")}
                    </p>
                  </div>

                  {/* Daemon */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${daemonAlive ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="font-medium text-foreground/80">{t("layout.status.popup.daemon")}</span>
                      <span className={`ml-auto ${daemonAlive ? "text-green-500" : "text-red-500"}`}>{daemonAlive ? t("layout.status.popup.running") : t("layout.status.popup.down")}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 pl-3.5">
                      {daemonAlive
                        ? t("layout.status.popup.agentsWorking")
                        : t("layout.status.popup.agentsUnavailable")}
                    </p>
                  </div>

                  {/* Agent Providers */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                        anyProviderReady ? "bg-green-500" : "bg-red-500"
                      }`} />
                      <span className="font-medium text-foreground/80">{t("layout.status.popup.providers")}</span>
                      <span className={`ml-auto ${anyProviderReady ? "text-green-500" : "text-red-500"}`}>
                        {!providersLoaded ? t("layout.status.popup.checking") : anyProviderReady ? t("layout.status.popup.available") : t("layout.status.popup.noneReady")}
                      </span>
                    </div>
                    {providersLoaded && providerStatuses.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-[10px] pl-3.5 text-muted-foreground/70">
                        <span className={`inline-block h-1 w-1 rounded-full shrink-0 ${
                          p.available && p.authenticated ? "bg-green-500"
                          : p.available ? "bg-amber-500"
                          : "bg-red-500/50"
                        }`} />
                        <span>{p.name}</span>
                        <span className="ml-auto">
                          {p.available && p.authenticated ? t("layout.status.popup.ready")
                          : p.available ? t("layout.status.popup.notLoggedIn")
                          : t("layout.status.popup.notInstalled")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Troubleshooting tips */}
                  {(!appAlive || !daemonAlive || !anyProviderReady) && (
                    <div className="pt-1.5 border-t border-border space-y-1">
                      <p className="text-[10px] font-medium text-foreground/70">{t("layout.status.popup.howToFix")}</p>
                      {(!appAlive || !daemonAlive) && (
                        installKind === "electron-macos" ? (
                          <p className="text-[10px] text-muted-foreground">
                            {!appAlive && !daemonAlive
                              ? "Both servers are down. Try quitting and reopening the Cabinet app."
                              : !appAlive
                              ? "The app server is not responding. Try quitting and reopening the Cabinet app."
                              : "The background daemon is not running. Try quitting and reopening the Cabinet app. If the issue persists, check Activity Monitor for stuck Cabinet processes."}
                          </p>
                        ) : installKind === "source-managed" ? (
                          <p className="text-[10px] text-muted-foreground">
                            {!appAlive && !daemonAlive ? (
                              <>Both servers are down. Restart with:{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npx cabinet</code></>
                            ) : !appAlive ? (
                              <>The app server crashed. Restart with:{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npx cabinet</code></>
                            ) : (
                              <>The daemon is not running. It should start automatically with{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npx cabinet</code>
                              . Try restarting.</>
                            )}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">
                            {!appAlive && !daemonAlive ? (
                              <>Both servers are down. Start everything with:{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev:all</code></>
                            ) : !appAlive ? (
                              <>The Next.js app server crashed or was stopped. Restart with:{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev</code></>
                            ) : (
                              <>The daemon is not running. If you started only{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev</code>
                              , use{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev:all</code>
                              {" "}instead to start both servers.</>
                            )}
                          </p>
                        )
                      )}
                      {appAlive && daemonAlive && !anyProviderReady && (
                        <p className="text-[10px] text-muted-foreground">
                          {t("layout.status.popup.noProvidersInstalled")}
                          <button
                            onClick={() => { setSection({ type: "settings" }); setShowServerPopup(false); }}
                            className="underline hover:text-foreground transition-colors"
                          >
                            {t("layout.status.popup.configureInSettings")}
                          </button>
                        </p>
                      )}
                    </div>
                  )}

                  {/* All good state */}
                  {appAlive && daemonAlive && anyProviderReady && (
                    <p className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border">
                      {t("layout.status.popup.allFeaturesAvailable")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowServerPopup(false)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label={t("layout.status.popup.dismiss")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
