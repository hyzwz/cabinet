"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { GitBranch, RefreshCw, Check, CloudDownload, Star, X, ArrowRight } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useCabinetUpdate } from "@/hooks/use-cabinet-update";
import { useEditorStore } from "@/stores/editor-store";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import { useAIPanelStore } from "@/stores/ai-panel-store";
import { createConversation } from "@/lib/agents/conversation-client";

const DISCORD_SUPPORT_URL = "https://discord.gg/hJa5TRTbTH";
const GITHUB_REPO_URL = "https://github.com/hilash/cabinet";
const GITHUB_STATS_URL = "/api/github/repo";
const GITHUB_STARS_FALLBACK = 244;

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.32 4.37a16.4 16.4 0 0 0-4.1-1.28.06.06 0 0 0-.07.03c-.18.32-.38.73-.52 1.06a15.16 15.16 0 0 0-4.56 0c-.15-.34-.35-.74-.53-1.06a.06.06 0 0 0-.07-.03c-1.43.24-2.8.68-4.1 1.28a.05.05 0 0 0-.02.02C3.77 8.17 3.12 11.87 3.44 15.53a.06.06 0 0 0 .02.04 16.52 16.52 0 0 0 5.03 2.54.06.06 0 0 0 .07-.02c.39-.54.74-1.12 1.04-1.73a.06.06 0 0 0-.03-.08 10.73 10.73 0 0 1-1.6-.77.06.06 0 0 1-.01-.1l.32-.24a.06.06 0 0 1 .06-.01c3.35 1.53 6.98 1.53 10.29 0a.06.06 0 0 1 .06 0c.1.08.21.16.32.24a.06.06 0 0 1-.01.1c-.51.3-1.05.56-1.6.77a.06.06 0 0 0-.03.08c.3.61.65 1.19 1.04 1.73a.06.06 0 0 0 .07.02 16.42 16.42 0 0 0 5.03-2.54.06.06 0 0 0 .02-.04c.38-4.23-.64-7.9-2.89-11.14a.04.04 0 0 0-.02-.02ZM9.68 13.3c-.98 0-1.78-.9-1.78-2s.79-2 1.78-2c.99 0 1.79.9 1.78 2 0 1.1-.8 2-1.78 2Zm4.64 0c-.98 0-1.78-.9-1.78-2s.79-2 1.78-2c.99 0 1.79.9 1.78 2 0 1.1-.79 2-1.78 2Z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.24c-3.34.73-4.04-1.42-4.04-1.42-.55-1.37-1.33-1.73-1.33-1.73-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.22 1.83 1.22 1.06 1.8 2.8 1.28 3.48.98.11-.77.42-1.28.76-1.58-2.67-.3-5.47-1.32-5.47-5.86 0-1.3.47-2.36 1.23-3.2-.12-.3-.53-1.52.12-3.16 0 0 1-.32 3.3 1.22a11.67 11.67 0 0 1 6.02 0c2.3-1.54 3.3-1.22 3.3-1.22.65 1.64.24 2.86.12 3.16.77.84 1.23 1.9 1.23 3.2 0 4.55-2.8 5.56-5.48 5.86.43.37.81 1.08.81 2.19v3.25c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function formatGithubStars(stars: number) {
  return new Intl.NumberFormat("en-US").format(stars);
}

/* ── Star burst explosion particles ── */
const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function StarExplosion() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {BURST_ANGLES.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = i % 2 === 0 ? 18 : 14;
        const tx = Math.round(Math.cos(rad) * dist);
        const ty = Math.round(Math.sin(rad) * dist);
        return (
          <span
            key={angle}
            className="absolute left-1/2 top-1/2 text-[7px] leading-none text-amber-400"
            style={{
              "--sb-x": `${tx}px`,
              "--sb-y": `${ty}px`,
              animation: "cabinet-star-burst 0.65s ease-out forwards",
              animationDelay: `${i * 25}ms`,
            } as React.CSSProperties}
          >
            ✦
          </span>
        );
      })}
    </span>
  );
}

export function StatusBar() {
  const { t, format } = useLocale();
  const { saveStatus, currentPath } = useEditorStore();
  const loadTree = useTreeStore((s) => s.loadTree);
  const selectedPath = useTreeStore((s) => s.selectedPath);
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const setAiPanelCollapsed = useAppStore((s) => s.setAiPanelCollapsed);
  const { open, addEditorSession } = useAIPanelStore();
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSubmitting, setAiSubmitting] = useState(false);

  const showAIPill = section.type === "page" && !!selectedPath;

  const handleAISubmit = async () => {
    if (!aiPrompt.trim() || !selectedPath || aiSubmitting) return;
    const message = aiPrompt.trim();
    setAiPrompt("");
    setAiSubmitting(true);
    setAiPanelCollapsed(false);
    open();
    try {
      try {
        const data = await createConversation({
          source: "editor",
          pagePath: selectedPath,
          userMessage: message,
          mentionedPaths: [],
        });
        const conversation = data.conversation as { id: string; title: string };
        addEditorSession({
          id: conversation.id,
          sessionId: conversation.id,
          pagePath: selectedPath,
          userMessage: message,
          prompt: conversation.title,
          timestamp: Date.now(),
          status: "running",
          reconnect: true,
        });
      } catch {
        // Preserve the previous fire-and-forget behavior for the status bar action.
      }
    } finally {
      setAiSubmitting(false);
    }
  };
  const [uncommitted, setUncommitted] = useState(0);
  const [pullStatus, setPullStatus] = useState<"idle" | "pulling" | "pulled" | "up-to-date" | "error">("idle");
  const [pulling, setPulling] = useState(false);
  const [githubStars, setGithubStars] = useState(GITHUB_STARS_FALLBACK);
  const [displayStars, setDisplayStars] = useState(0);
  const [starsExploding, setStarsExploding] = useState(false);
  const starsAnimRef = useRef<number | null>(null);
  const starsAnimated = useRef(false);
  const didAutoPullRef = useRef(false);
  const [appAlive, setAppAlive] = useState(true);
  const [daemonAlive, setDaemonAlive] = useState(true);
  const [installKind, setInstallKind] = useState<"source-managed" | "source-custom" | "electron-macos">("source-custom");
  const [showServerPopup, setShowServerPopup] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<
    { id: string; name: string; available: boolean; authenticated: boolean }[]
  >([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const { update } = useCabinetUpdate();

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

  const fetchGitStatus = async () => {
    try {
      const res = await fetch("/api/git/commit");
      if (res.ok) {
        const data = await res.json();
        setUncommitted(data.uncommitted || 0);
      }
    } catch {
      // ignore
    }
  };

  const fetchGitHubStats = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(GITHUB_STATS_URL, {
        signal,
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = await res.json();
      if (typeof data.stars === "number") {
        setGithubStars(data.stars);
      }
    } catch {
      // ignore
    }
  }, []);

  const pullAndRefresh = useCallback(async () => {
    if (pulling) return;
    setPulling(true);
    setPullStatus("pulling");
    try {
      const res = await fetch("/api/git/pull", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.pulled) {
          setPullStatus("pulled");
          // Reload tree to reflect new/changed files
          await loadTree();
        } else {
          setPullStatus("up-to-date");
        }
      } else {
        setPullStatus("error");
      }
    } catch {
      setPullStatus("error");
    } finally {
      setPulling(false);
      // Reset status after 3 seconds
      setTimeout(() => setPullStatus("idle"), 3000);
    }
  }, [pulling, loadTree]);

  // Auto-pull on mount (page load)
  useEffect(() => {
    if (didAutoPullRef.current) return;
    didAutoPullRef.current = true;

    const initialPull = window.setTimeout(() => {
      void pullAndRefresh();
    }, 0);
    return () => window.clearTimeout(initialPull);
  }, [pullAndRefresh]);

  // Poll git status
  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchGitStatus();
    }, 0);
    const interval = setInterval(fetchGitStatus, 15000);
    return () => {
      window.clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initialFetch = window.setTimeout(() => {
      void fetchGitHubStats(controller.signal);
    }, 0);
    const handleFocus = () => {
      void fetchGitHubStats();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      controller.abort();
      window.clearTimeout(initialFetch);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchGitHubStats]);

  // Animate stars counter from 0 → real value once real data arrives
  useEffect(() => {
    if (githubStars === GITHUB_STARS_FALLBACK) return;
    if (starsAnimated.current) return;
    starsAnimated.current = true;
    const target = githubStars;
    const duration = 2000;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayStars(Math.round(target * eased));
      if (progress < 1) {
        starsAnimRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayStars(target);
        setStarsExploding(true);
        setTimeout(() => setStarsExploding(false), 900);
      }
    };
    starsAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (starsAnimRef.current !== null) cancelAnimationFrame(starsAnimRef.current);
    };
  }, [githubStars]);

  return (
    <div className="relative flex items-center justify-between px-3 py-1 border-t border-border text-[11px] text-muted-foreground/60 bg-background">
      {/* Center: AI edit pill */}
      {showAIPill && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-auto">
          <div className="flex items-center rounded-full border border-border/50 bg-muted/30 px-2.5 py-0.5 gap-1.5 focus-within:border-border/80 focus-within:bg-muted/60 transition-colors w-56">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleAISubmit();
                }
              }}
              placeholder={t("layout.status.aiPlaceholder")}
              className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none min-w-0"
            />
            <button
              onClick={() => void handleAISubmit()}
              disabled={!aiPrompt.trim() || aiSubmitting}
              className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground disabled:opacity-20 transition-colors cursor-pointer"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
      <div className="flex min-w-0 items-center gap-3">
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
                ? t("layout.status.health.daemonAndProvidersDown")
                : !daemonAlive
                ? t("layout.status.health.daemonDown")
                : t("layout.status.health.noProviders")
            }
            aria-label={t("layout.status.serverStatusAria")}
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
                          {p.available && p.authenticated ? t("layout.status.popup.providerReady")
                          : p.available ? t("layout.status.popup.providerNotLoggedIn")
                          : t("layout.status.popup.providerNotInstalled")}
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
                              ? t("layout.status.popup.bothDown")
                              : !appAlive
                              ? t("layout.status.popup.appDownHelp")
                              : t("layout.status.popup.daemonDownHelp")}
                          </p>
                        ) : installKind === "source-managed" ? (
                          <p className="text-[10px] text-muted-foreground">
                            {!appAlive && !daemonAlive ? (
                              <>
                                {t("layout.status.sourceManagedBothDownPrefix")} {" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npx cabinet</code>
                              </>
                            ) : !appAlive ? (
                              <>
                                {t("layout.status.sourceManagedAppDownPrefix")} {" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npx cabinet</code>
                              </>
                            ) : (
                              <>
                                {t("layout.status.sourceManagedDaemonDownPrefix")} {" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npx cabinet</code>
                                {t("layout.status.sourceManagedDaemonDownSuffix")}
                              </>
                            )}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">
                            {!appAlive && !daemonAlive ? (
                              <>
                                {t("layout.status.sourceCustomBothDownPrefix")} {" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev:all</code>
                              </>
                            ) : !appAlive ? (
                              <>
                                {t("layout.status.sourceCustomAppDownPrefix")} {" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev</code>
                              </>
                            ) : (
                              <>
                                {t("layout.status.sourceCustomDaemonDownPrefix")} {" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev</code>
                                {t("layout.status.sourceCustomDaemonDownMiddle")} {" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev:all</code>
                                {" "}{t("layout.status.sourceCustomDaemonDownSuffix")}
                              </>
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
        {currentPath && (
          <span>
            {saveStatus === "saving"
              ? t("layout.status.saving")
              : saveStatus === "saved"
              ? t("layout.status.saved")
              : saveStatus === "error"
              ? t("layout.status.saveFailed")
              : t("layout.status.ready")}
          </span>
        )}
        {pullStatus === "pulling" && (
          <span className="flex items-center gap-1 text-blue-400">
            <CloudDownload className="h-3 w-3 animate-pulse" />
            {t("layout.status.pull.pulling")}
          </span>
        )}
        {pullStatus === "pulled" && (
          <span className="flex items-center gap-1 text-green-400">
            <Check className="h-3 w-3" />
            {t("layout.status.pull.updated")}
          </span>
        )}
        {pullStatus === "up-to-date" && (
          <span className="flex items-center gap-1 text-muted-foreground/60">
            <Check className="h-3 w-3" />
            {t("layout.status.pull.upToDate")}
          </span>
        )}
        {pullStatus === "error" && (
          <span className="flex items-center gap-1 text-red-400">
            {t("layout.status.pull.failed")}
          </span>
        )}
        {update?.updateStatus.state === "restart-required" && (
          <button
            onClick={() => setSection({ type: "settings" })}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-amber-600 hover:bg-muted hover:text-foreground transition-colors"
            title={t("layout.status.restartSettingsTitle")}
          >
            <CloudDownload className="h-3 w-3" />
            {t("layout.status.restartCta")}
          </button>
        )}
        {update?.updateAvailable && update?.updateStatus.state !== "restart-required" && update.latest && (
          <button
            onClick={() => setSection({ type: "settings" })}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-blue-500 hover:bg-muted hover:text-foreground transition-colors"
            title={format("layout.status.updateAvailableTitle", { version: update.latest.version })}
          >
            <CloudDownload className="h-3 w-3" />
            {format("layout.status.updateAvailableLabel", { version: update.latest.version })}
          </button>
        )}
        <span className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          {uncommitted > 0 ? format("layout.status.uncommitted", { count: uncommitted }) : t("layout.status.allCommitted")}
        </span>
        <button
          onClick={pullAndRefresh}
          disabled={pulling}
          aria-label={t("layout.status.pullLatest")}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1"
          title={t("layout.status.pullLatestTitle")}
        >
          <RefreshCw className={`h-3 w-3 ${pulling ? "animate-spin" : ""}`} />
          {t("layout.status.sync")}
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <a
          href={DISCORD_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("layout.status.discordAria")}
          title={t("layout.status.discord")}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#5865F2]/20 bg-[#5865F2]/10 px-2.5 py-1 text-[#5865F2] transition-all hover:-translate-y-px hover:border-[#5865F2]/35 hover:bg-[#5865F2]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1"
        >
          <DiscordIcon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold tracking-[0.04em] text-foreground">
            {t("layout.status.chat")}
          </span>
        </a>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("layout.status.githubAria")}
          title={t("layout.status.github")}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/55 px-2.5 py-1 transition-all hover:-translate-y-px hover:border-foreground/15 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1"
        >
          <GitHubIcon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold tracking-[0.04em] text-foreground">
            {t("layout.status.contribute")}
          </span>
        </a>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={format("layout.status.starsAria", { count: formatGithubStars(githubStars) })}
          title={format("layout.status.starsTitle", { count: formatGithubStars(githubStars) })}
          className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-700 transition-all hover:-translate-y-px hover:border-amber-500/35 hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 dark:text-amber-300"
        >
          {starsExploding && <StarExplosion />}
          <Star className="h-3.5 w-3.5 fill-current" />
          <span className="text-[10px] font-semibold tracking-[0.04em] text-foreground">
            {format("layout.status.starsLabel", { count: formatGithubStars(displayStars || githubStars) })}
          </span>
        </a>
      </div>
    </div>
  );
}
