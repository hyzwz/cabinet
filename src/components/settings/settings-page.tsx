"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import {
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  Bell,
  Plug,
  Cpu,
  Save,
  Loader2,
  Clock,
  CloudDownload,
  Palette,
  Check,
  Info,
  Terminal,
  ExternalLink,
  ChevronDown,
  Copy,
  ClipboardCheck,
  HardDrive,
  FolderOpen,
  RotateCw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UpdateSummary } from "@/components/system/update-summary";
import { useCabinetUpdate } from "@/hooks/use-cabinet-update";
import { useTheme } from "next-themes";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  THEMES,
  applyTheme,
  getStoredThemeName,
  storeThemeName,
  type ThemeDefinition,
} from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { ProviderInfo } from "@/types/agents";
import { useAuthStore } from "@/stores/auth-store";
import { UsersTab } from "@/components/settings/users-tab";

interface McpServer {
  name: string;
  command: string;
  enabled: boolean;
  env: Record<string, string>;
  description?: string;
}

interface IntegrationConfig {
  mcp_servers: Record<string, McpServer>;
  notifications: {
    browser_push: boolean;
    telegram: { enabled: boolean; bot_token: string; chat_id: string };
    slack_webhook: { enabled: boolean; url: string };
    email: { enabled: boolean; frequency: "hourly" | "daily"; to: string };
  };
  scheduling: {
    max_concurrent_agents: number;
    default_heartbeat_interval: string;
    active_hours: string;
    pause_on_error: boolean;
  };
}

type Tab = "providers" | "storage" | "integrations" | "notifications" | "appearance" | "updates" | "about" | "users";

function TerminalCommand({ command }: { command: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 mt-1.5 font-mono text-[12px]"
      style={{ background: "#1e1e1e", color: "#d4d4d4" }}
    >
      <span style={{ color: "#6A9955" }}>$</span>
      <span className="flex-1 select-all">{command}</span>
      <button
        onClick={copy}
        className="shrink-0 p-1 rounded transition-colors hover:bg-white/10"
        title={t("settings.providers.copyToClipboard")}
      >
        {copied ? (
          <ClipboardCheck className="size-3.5" style={{ color: "#6A9955" }} />
        ) : (
          <Copy className="size-3.5" style={{ color: "#808080" }} />
        )}
      </button>
    </div>
  );
}

type SetupStep = { title: string; detail: string; cmd?: string; openTerminal?: boolean; link?: { label: string; url: string } };

const PROVIDER_SETUP_STEPS: Record<string, SetupStep[]> = {
  "claude-code": [
    { title: "Get a Claude subscription", detail: "Any Claude Code subscription will do (Pro, Max, or Team).", link: { label: "Open Claude billing", url: "https://claude.ai/settings/billing" } },
    { title: "Open a terminal", detail: "You'll need a terminal to run the next steps.", openTerminal: true },
    { title: "Install Claude Code", detail: "Run the following in your terminal:", cmd: "npm install -g @anthropic-ai/claude-code" },
    { title: "Log in to Claude", detail: "Authenticate with your subscription:", cmd: "claude auth login" },
    { title: "Verify login", detail: "Check that you're logged in:", cmd: "claude auth status" },
  ],
  "codex-cli": [
    { title: "Open a terminal", detail: "You'll need a terminal to run the next steps.", openTerminal: true },
    { title: "Install Codex CLI", detail: "Run the following in your terminal:", cmd: "npm i -g @openai/codex" },
    { title: "Log in to Codex", detail: "Authenticate with your ChatGPT or API account:", cmd: "codex login" },
    { title: "Verify login", detail: "Check that you're logged in:", cmd: "codex login status" },
  ],
};

export function SettingsPage() {
  const { t, format } = useLocale();
  const { showHiddenFiles, setShowHiddenFiles } = useTreeStore();
  const currentUser = useAuthStore((s) => s.user);
  const authMode = useAuthStore((s) => s.authMode);
  const isAdmin = authMode === "multi" && currentUser?.role === "admin";
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProvider, setDefaultProvider] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [defaultEffort, setDefaultEffort] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProviders, setSavingProviders] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [dataDir, setDataDir] = useState("");
  const [dataDirPending, setDataDirPending] = useState<string | null>(null);
  const [dataDirBrowsing, setDataDirBrowsing] = useState(false);
  const [dataDirSaving, setDataDirSaving] = useState(false);
  const [dataDirRestartNeeded, setDataDirRestartNeeded] = useState(false);
  const VALID_TABS: Tab[] = ["providers", "storage", "integrations", "notifications", "appearance", "updates", "about", "users"];
  const initialTab = (() => {
    const slug = useAppStore.getState().section.slug as Tab | undefined;
    return slug && VALID_TABS.includes(slug) ? slug : "providers";
  })();
  const [tab, setTabState] = useState<Tab>(initialTab);
  const initializedRef = useRef(false);

  // Sync tab changes to hash
  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    useAppStore.getState().setSection({ type: "settings", slug: t });
  }, []);

  // Listen for external hash changes (browser back/forward)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Set hash on first render if it's just #/settings
      if (!useAppStore.getState().section.slug) {
        useAppStore.getState().setSection({ type: "settings", slug: tab });
      }
    }
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.section.type === "settings" && state.section.slug !== prev.section.slug) {
        const slug = state.section.slug as Tab | undefined;
        if (slug && VALID_TABS.includes(slug)) {
          setTabState(slug);
        }
      }
    });
    return unsub;
  }, []);
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [activeThemeName, setActiveThemeName] = useState<string | null>(null);
  const { setTheme: setNextTheme } = useTheme();
  const {
    update,
    loading: updateLoading,
    refreshing: updateRefreshing,
    applyPending,
    backupPending,
    backupPath,
    actionError,
    refresh: refreshUpdate,
    createBackup,
    openDataDir,
    applyUpdate,
  } = useCabinetUpdate();

  // Sync active theme name on mount
  useEffect(() => {
    setActiveThemeName(getStoredThemeName() || "paper");
  }, []);

  const selectTheme = (themeDef: ThemeDefinition) => {
    applyTheme(themeDef);
    setActiveThemeName(themeDef.name);
    storeThemeName(themeDef.name);
    setNextTheme(themeDef.type);
  };

  const darkThemes = THEMES.filter((t) => t.type === "dark");
  const lightThemes = THEMES.filter((t) => t.type === "light");

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/agents/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setDefaultProvider(data.defaultProvider || "");
        setDefaultModel(data.defaultModel || "");
        setDefaultEffort(data.defaultEffort || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProviderSettings = useCallback(async (
    nextDefaultProvider: string,
    disabledProviderIds: string[],
    migrations: Array<{ fromProviderId: string; toProviderId: string }> = [],
    overrides?: { defaultModel?: string; defaultEffort?: string }
  ) => {
    setSavingProviders(true);
    try {
      const res = await fetch("/api/agents/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProvider: nextDefaultProvider,
          defaultModel: overrides?.defaultModel ?? (defaultModel || undefined),
          defaultEffort: overrides?.defaultEffort ?? (defaultEffort || undefined),
          disabledProviderIds,
          migrations,
        }),
      });
      if (res.ok) {
        await refresh(true);
        return true;
      }

      const data = await res.json().catch(() => null);
      if (res.status === 409 && data?.conflicts) {
        const message = (data.conflicts as Array<{
          providerId: string;
          agentSlugs: string[];
          jobs: Array<{ jobName: string }>;
          suggestedProviderId: string;
        }>).map((conflict) =>
          `${conflict.providerId}: ${conflict.agentSlugs.length} agents, ${conflict.jobs.length} jobs`
        ).join("\n");
        window.alert(`Provider disable blocked until assignments are migrated:\n${message}`);
      }
    } catch {
      // ignore
    } finally {
      setSavingProviders(false);
    }
    return false;
  }, [refresh, defaultModel, defaultEffort]);

  const getProviderName = (providerId: string) =>
    providers.find((provider) => provider.id === providerId)?.name || providerId;

  const describeProviderUsage = (provider: ProviderInfo) => {
    const parts: string[] = [];
    if ((provider.usage?.agentCount ?? 0) > 0) {
      parts.push(`${provider.usage!.agentCount} agent${provider.usage!.agentCount === 1 ? "" : "s"}`);
    }
    if ((provider.usage?.jobCount ?? 0) > 0) {
      parts.push(`${provider.usage!.jobCount} job${provider.usage!.jobCount === 1 ? "" : "s"}`);
    }
    return parts.join(", ");
  };

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/agents/config/integrations");
      if (res.ok) {
        setConfig(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch("/api/agents/config/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const loadDataDir = useCallback(async () => {
    try {
      const res = await fetch("/api/system/data-dir");
      if (res.ok) {
        const data = await res.json();
        setDataDir(data.dataDir || "");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    loadConfig();
    loadDataDir();
  }, [refresh, loadConfig, loadDataDir]);

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateMcp = (id: string, field: string, value: unknown) => {
    if (!config) return;
    setConfig({
      ...config,
      mcp_servers: {
        ...config.mcp_servers,
        [id]: { ...config.mcp_servers[id], [field]: value },
      },
    });
  };

  const updateMcpEnv = (id: string, envKey: string, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      mcp_servers: {
        ...config.mcp_servers,
        [id]: {
          ...config.mcp_servers[id],
          env: { ...config.mcp_servers[id].env, [envKey]: value },
        },
      },
    });
  };

  const updateNotif = (path: string, value: unknown) => {
    if (!config) return;
    const parts = path.split(".");
    const notif = { ...config.notifications } as Record<string, unknown>;
    if (parts.length === 1) {
      notif[parts[0]] = value;
    } else {
      notif[parts[0]] = { ...(notif[parts[0]] as Record<string, unknown>), [parts[1]]: value };
    }
    setConfig({ ...config, notifications: notif as IntegrationConfig["notifications"] });
  };

  const updateScheduling = (field: string, value: unknown) => {
    if (!config) return;
    setConfig({
      ...config,
      scheduling: { ...config.scheduling, [field]: value },
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "providers", label: t("settings.tabs.providers"), icon: <Cpu className="h-3.5 w-3.5" /> },
    { id: "storage", label: t("settings.tabs.storage"), icon: <HardDrive className="h-3.5 w-3.5" /> },
    { id: "integrations", label: t("settings.tabs.integrations"), icon: <Plug className="h-3.5 w-3.5" /> },
    { id: "notifications", label: t("settings.tabs.notifications"), icon: <Bell className="h-3.5 w-3.5" /> },
    { id: "appearance", label: t("settings.tabs.appearance"), icon: <Palette className="h-3.5 w-3.5" /> },
    { id: "updates", label: t("settings.tabs.updates"), icon: <CloudDownload className="h-3.5 w-3.5" /> },
    ...(isAdmin ? [{ id: "users" as Tab, label: t("settings.tabs.users"), icon: <Users className="h-3.5 w-3.5" /> }] : []),
    { id: "about", label: t("settings.tabs.about"), icon: <Info className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border transition-[padding] duration-200"
        style={{ paddingLeft: `calc(1rem + var(--sidebar-toggle-offset, 0px))` }}
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
            {t("settings.title")}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
<Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-[12px]"
            onClick={() => { refresh(); loadConfig(); }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("settings.refresh")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
              tab === t.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="p-4 space-y-6 max-w-2xl">
          {/* Appearance Tab */}
          {tab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[13px] font-semibold mb-1">{t("settings.appearance.themeTitle")}</h3>
                <p className="text-[12px] text-muted-foreground mb-4">
                  {t("settings.appearance.themeDescription")}
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-2">{t("settings.appearance.lightThemes")}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {lightThemes.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => selectTheme(t)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all",
                            activeThemeName === t.name
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div
                            className="h-4 w-4 rounded-full shrink-0 border border-[#00000015]"
                            style={{ backgroundColor: t.accent }}
                          />
                          <span
                            className={cn(
                              "text-[12px]",
                              t.name === "paper" ? "italic" : "font-medium"
                            )}
                            style={{
                              fontFamily: t.name === "paper"
                                ? "var(--font-logo), Georgia, serif"
                                : (t.headingFont || t.font),
                            }}
                          >
                            {t.label}
                          </span>
                          {activeThemeName === t.name && (
                            <Check className="h-3 w-3 text-primary ml-auto shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-2">{t("settings.appearance.darkThemes")}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {darkThemes.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => selectTheme(t)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all",
                            activeThemeName === t.name
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div
                            className="h-4 w-4 rounded-full shrink-0 border border-[#ffffff20]"
                            style={{ backgroundColor: t.accent }}
                          />
                          <span
                            className="text-[12px] font-medium"
                            style={{ fontFamily: t.headingFont || t.font }}
                          >
                            {t.label}
                          </span>
                          {activeThemeName === t.name && (
                            <Check className="h-3 w-3 text-primary ml-auto shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-[13px] font-semibold mb-1">{t("settings.appearance.sidebarTitle")}</h3>
                <p className="text-[12px] text-muted-foreground mb-4">
                  {t("settings.appearance.sidebarDescription")}
                </p>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={showHiddenFiles}
                      onChange={(e) => setShowHiddenFiles(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <div>
                      <span className="text-[13px] font-medium">{t("settings.appearance.showHiddenFiles")}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t("settings.appearance.showHiddenFilesHint")}
                      </p>
                    </div>
                  </div>
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘" : "Ctrl"}+⇧+.
                  </kbd>
                </label>
              </div>
            </div>
          )}

          {/* Storage Tab */}
          {tab === "storage" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[14px] font-semibold mb-1">{t("settings.storage.title")}</h3>
                <p className="text-[12px] text-muted-foreground">
                  {t("settings.storage.description")}
                </p>
              </div>

              {dataDirRestartNeeded && (
                <div className="flex items-center gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
                  <RotateCw className="h-4 w-4 shrink-0 text-yellow-500" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-yellow-500">{t("settings.storage.restartRequired")}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {t("settings.storage.restartDescription")}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-muted-foreground">
                  {t("settings.storage.currentPath")}
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 bg-muted/30">
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-mono text-[12px] truncate select-all">
                    {dataDir || t("settings.storage.loading")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => {
                      navigator.clipboard.writeText(dataDir);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-muted-foreground">
                  {t("settings.storage.changeDirectory")}
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("settings.storage.pathPlaceholder")}
                    value={dataDirPending ?? ""}
                    onChange={(e) => setDataDirPending(e.target.value)}
                    className="font-mono text-[12px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0"
                    disabled={dataDirBrowsing || dataDirSaving}
                    onClick={async () => {
                      setDataDirBrowsing(true);
                      try {
                        const res = await fetch("/api/system/pick-directory", { method: "POST" });
                        const data = await res.json().catch(() => null);
                        if (data?.path) setDataDirPending(data.path);
                      } catch {
                        // ignore
                      } finally {
                        setDataDirBrowsing(false);
                      }
                    }}
                  >
                    {dataDirBrowsing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FolderOpen className="h-3.5 w-3.5" />
                    )}
                    {t("settings.storage.browse")}
                  </Button>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={!dataDirPending?.trim() || dataDirSaving || dataDirPending.trim() === dataDir}
                    onClick={async () => {
                      if (!dataDirPending?.trim()) return;
                      setDataDirSaving(true);
                      try {
                        const res = await fetch("/api/system/data-dir", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ dataDir: dataDirPending.trim() }),
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok) {
                          alert(data?.error || t("settings.common.failedToSave"));
                          return;
                        }
                        setDataDirRestartNeeded(true);
                        setDataDirPending(null);
                      } catch {
                        alert(t("settings.storage.saveError"));
                      } finally {
                        setDataDirSaving(false);
                      }
                    }}
                  >
                    {dataDirSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {t("settings.storage.save")}
                  </Button>
                  {dataDir && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => {
                        fetch("/api/system/open-data-dir", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({}),
                        });
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      {t("settings.storage.openInFinder")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-[12px] text-muted-foreground">
                  {format("settings.storage.envNotice", {
                    variable: "CABINET_DATA_DIR",
                  }).split("CABINET_DATA_DIR")[0]}
                  <code className="px-1 py-0.5 rounded bg-muted text-[11px]">CABINET_DATA_DIR</code>
                  {format("settings.storage.envNotice", {
                    variable: "CABINET_DATA_DIR",
                  }).split("CABINET_DATA_DIR")[1]}
                </p>
              </div>
            </div>
          )}

          {tab === "updates" && update && (
            <UpdateSummary
              update={update}
              loading={updateLoading}
              refreshing={updateRefreshing}
              applyPending={applyPending}
              backupPending={backupPending}
              backupPath={backupPath}
              actionError={actionError}
              onRefresh={() => {
                void refreshUpdate();
              }}
              onApply={applyUpdate}
              onCreateBackup={async () => {
                await createBackup("data");
              }}
              onOpenDataDir={openDataDir}
            />
          )}

          {tab === "updates" && !update && updateLoading && (
            <p className="text-[13px] text-muted-foreground">{t("settings.updates.checking")}</p>
          )}

          {/* Providers Tab */}
          {tab === "providers" && (
            <>
              <div>
                <h3 className="text-[14px] font-semibold mb-3">{t("settings.providers.title")}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("settings.providers.description")}
                </p>

                {loading ? (
                  <p className="text-[13px] text-muted-foreground">{t("settings.providers.loading")}</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="mb-3 rounded-lg border border-border bg-card p-3">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("settings.providers.defaultProvider")}
                        </label>
                        <div className="mt-2 space-y-1">
                          {providers
                            .filter((p) => p.type === "cli" && p.available && p.authenticated)
                            .map((provider) => {
                              const isDefault = provider.id === defaultProvider;
                              return (
                                <button
                                  key={provider.id}
                                  onClick={() => {
                                    if (isDefault || savingProviders) return;
                                    const disabledProviderIds = providers
                                      .filter((p) => !p.enabled && p.id !== provider.id)
                                      .map((p) => p.id);
                                    const oldDefault = defaultProvider;
                                    const oldDefaultUsage = providers.find((p) => p.id === oldDefault)?.usage;
                                    const migrations = (oldDefaultUsage?.totalCount ?? 0) > 0
                                      ? [{ fromProviderId: oldDefault, toProviderId: provider.id }]
                                      : [];
                                    void saveProviderSettings(provider.id, disabledProviderIds, migrations);
                                  }}
                                  disabled={savingProviders}
                                  className={cn(
                                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors",
                                    isDefault
                                      ? "bg-primary/5 border border-primary/30"
                                      : "border border-transparent hover:bg-muted"
                                  )}
                                >
                                  <span className={cn(
                                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                                    isDefault
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground/30"
                                  )}>
                                    {isDefault && <Check className="size-2.5" />}
                                  </span>
                                  <span className={cn("font-medium", isDefault ? "text-foreground" : "text-muted-foreground")}>
                                    {provider.name}
                                  </span>
                                  {provider.version && (
                                    <span className="ml-auto text-[10px] text-muted-foreground/60">{provider.version}</span>
                                  )}
                                </button>
                              );
                            })}
                          {providers.filter((p) => p.type === "cli" && p.available && p.authenticated).length === 0 && (
                            <p className="text-[12px] text-muted-foreground py-2">
                              {t("settings.providers.noneInstalled")}
                            </p>
                          )}
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          General conversations and fallback runs use this provider.
                        </p>
                      </div>

                      {/* Default model selector */}
                      {(() => {
                        const activeP = providers.find((p) => p.id === defaultProvider);
                        const models = activeP?.models || [];
                        const effortLevels = activeP?.effortLevels || [];
                        if (models.length === 0 && effortLevels.length === 0) return null;
                        return (
                          <div className="mb-3 rounded-lg border border-border bg-card p-3 space-y-4">
                            {models.length > 0 && (
                              <div>
                                <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {t("settings.providers.defaultModel")}
                                </label>
                                <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                                  {models.map((m) => {
                                    const isActive = defaultModel === m.id;
                                    return (
                                      <button
                                        key={m.id}
                                        onClick={() => {
                                          if (isActive || savingProviders) return;
                                          setDefaultModel(m.id);
                                          const disabledIds = providers.filter((p) => !p.enabled).map((p) => p.id);
                                          void saveProviderSettings(defaultProvider, disabledIds, [], { defaultModel: m.id });
                                        }}
                                        disabled={savingProviders}
                                        className={cn(
                                          "rounded-md px-3 py-2 text-left text-[12px] transition-colors",
                                          isActive
                                            ? "bg-primary/5 border border-primary/30"
                                            : "border border-transparent hover:bg-muted"
                                        )}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className={cn(
                                            "flex size-3 shrink-0 items-center justify-center rounded-full border",
                                            isActive
                                              ? "border-primary bg-primary text-primary-foreground"
                                              : "border-muted-foreground/30"
                                          )}>
                                            {isActive && <Check className="size-1.5" />}
                                          </span>
                                          <span className={cn("font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                                            {m.name}
                                          </span>
                                        </div>
                                        {m.description && (
                                          <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">{m.description}</p>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {effortLevels.length > 0 && (
                              <div>
                                <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {t("settings.providers.reasoningEffort")}
                                </label>
                                <div className="mt-2 grid gap-1.5 sm:grid-cols-4">
                                  {effortLevels.map((e) => {
                                    const isActive = defaultEffort === e.id;
                                    return (
                                      <button
                                        key={e.id}
                                        onClick={() => {
                                          if (isActive || savingProviders) return;
                                          setDefaultEffort(e.id);
                                          const disabledIds = providers.filter((p) => !p.enabled).map((p) => p.id);
                                          void saveProviderSettings(defaultProvider, disabledIds, [], { defaultEffort: e.id });
                                        }}
                                        disabled={savingProviders}
                                        className={cn(
                                          "rounded-md px-3 py-2 text-left text-[12px] transition-colors",
                                          isActive
                                            ? "bg-primary/5 border border-primary/30"
                                            : "border border-transparent hover:bg-muted"
                                        )}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className={cn(
                                            "flex size-3 shrink-0 items-center justify-center rounded-full border",
                                            isActive
                                              ? "border-primary bg-primary text-primary-foreground"
                                              : "border-muted-foreground/30"
                                          )}>
                                            {isActive && <Check className="size-1.5" />}
                                          </span>
                                          <span className={cn("font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                                            {e.name}
                                          </span>
                                        </div>
                                        {e.description && (
                                          <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">{e.description}</p>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        {t("settings.providers.cliAgents")}
                      </h4>
                      <div className="space-y-2">
                        {providers
                          .filter((p) => p.type === "cli")
                          .map((provider) => {
                            const isReady = !!(provider.available && provider.authenticated);
                            const isInstalled = !!provider.available;
                            const isExpanded = expandedProvider === provider.id;
                            const setupSteps = PROVIDER_SETUP_STEPS[provider.id] || [];
                            const statusColor = isReady ? "text-green-500" : isInstalled ? "text-amber-500" : "text-muted-foreground";
                            const statusText = isReady
                              ? provider.version || t("settings.providers.ready")
                              : isInstalled
                                ? t("settings.providers.installedNotLoggedIn")
                                : t("settings.providers.notInstalled");
                            return (
                              <div
                                key={provider.id}
                                className="bg-card border border-border rounded-lg p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {isReady ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : isInstalled ? (
                                      <XCircle className="h-4 w-4 text-amber-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <div>
                                      <p className="text-[13px] font-medium">{provider.name}</p>
                                      <p className={cn("text-[11px]", statusColor)}>
                                        {statusText}
                                      </p>
                                      {(provider.usage?.totalCount ?? 0) > 0 && (
                                        <p className="text-[11px] text-muted-foreground">
                                          {format("settings.providers.usageInUseBy", {
                                            usage: describeProviderUsage(provider),
                                          })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {setupSteps.length > 0 && (
                                      <button
                                        onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                                        className={cn(
                                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                                          isExpanded ? "bg-muted" : ""
                                        )}
                                        title={t("settings.providers.guide")}
                                      >
                                        <Info className="size-3" />
                                        {t("settings.providers.guide")}
                                        <ChevronDown
                                          className="size-3 transition-transform duration-300"
                                          style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}
                                        />
                                      </button>
                                    )}
                                    <span className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                      provider.id === defaultProvider
                                        ? "bg-primary/10 text-primary"
                                        : provider.enabled
                                          ? "bg-emerald-500/10 text-emerald-500"
                                          : "bg-muted text-muted-foreground"
                                    )}>
                                      {provider.id === defaultProvider
                                        ? t("settings.providers.defaultBadge")
                                        : provider.enabled
                                          ? t("settings.providers.enabledBadge")
                                          : t("settings.providers.disabledBadge")}
                                    </span>
                                    <button
                                      onClick={async () => {
                                        const nextDisabled = provider.enabled
                                          ? providers
                                              .filter((entry) => !entry.enabled || entry.id === provider.id)
                                              .map((entry) => entry.id)
                                          : providers
                                              .filter((entry) => !entry.enabled && entry.id !== provider.id)
                                              .map((entry) => entry.id);
                                        const enabledAfterToggle = providers.filter(
                                          (entry) => !nextDisabled.includes(entry.id) && entry.type === "cli"
                                        );
                                        const nextDefault =
                                          provider.id === defaultProvider && nextDisabled.includes(provider.id)
                                            ? enabledAfterToggle[0]?.id || defaultProvider
                                            : defaultProvider;
                                        const migrations =
                                          provider.enabled && (provider.usage?.totalCount ?? 0) > 0
                                            ? [{ fromProviderId: provider.id, toProviderId: nextDefault }]
                                            : [];

                                        if (provider.enabled && (provider.usage?.totalCount ?? 0) > 0) {
                                          const confirmed = window.confirm(
                                            format("settings.providers.confirmDisableAndMigrate", {
                                              provider: provider.name,
                                              usage: describeProviderUsage(provider),
                                              nextProvider: getProviderName(nextDefault),
                                            })
                                          );
                                          if (!confirmed) return;
                                        }

                                        await saveProviderSettings(nextDefault, nextDisabled, migrations);
                                      }}
                                      disabled={savingProviders || (provider.id === defaultProvider && providers.filter((entry) => entry.type === "cli" && entry.enabled).length <= 1)}
                                      className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                                    >
                                      {provider.enabled
                                        ? t("settings.providers.toggleDisable")
                                        : t("settings.providers.toggleEnable")}
                                    </button>
                                  </div>
                                </div>

                                {/* Expandable setup guide */}
                                {setupSteps.length > 0 && (
                                  <div
                                    className="overflow-hidden transition-all duration-300 ease-in-out"
                                    style={{
                                      maxHeight: isExpanded ? 600 : 0,
                                      opacity: isExpanded ? 1 : 0,
                                    }}
                                  >
                                    <div className="rounded-lg bg-muted/50 p-3 space-y-3">
                                      {setupSteps.map((step, i) => (
                                        <div key={i} className="flex items-start gap-2.5">
                                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5 bg-primary text-primary-foreground">
                                            {i + 1}
                                          </span>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium">{step.title}</p>
                                            <p className="text-[11px] mt-0.5 text-muted-foreground">{step.detail}</p>
                                            {step.cmd && (
                                              <TerminalCommand command={step.cmd} />
                                            )}
                                            {step.openTerminal && (
                                              <button
                                                onClick={() => {
                                                  fetch("/api/terminal/open", { method: "POST" }).catch(() => {
                                                    alert(t("settings.providers.openTerminalError"));
                                                  });
                                                }}
                                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 mt-1.5 text-[11px] font-medium transition-all hover:-translate-y-0.5"
                                                style={{ background: "#1e1e1e", color: "#d4d4d4" }}
                                              >
                                                <Terminal className="size-3" />
                                                {t("settings.providers.openTerminal")}
                                              </button>
                                            )}
                                            {step.link && (
                                              <a
                                                href={step.link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] font-medium mt-1.5 text-primary hover:underline"
                                              >
                                                {step.link.label}
                                                <ExternalLink className="size-3" />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      <p className="text-[11px] text-muted-foreground">
                                        {format("settings.providers.setupAfter", {
                                          recheck: t("settings.providers.recheck"),
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {/* Re-check button */}
                      <button
                        onClick={() => void refresh()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted disabled:opacity-50 mt-2"
                      >
                        <RefreshCw className={cn("size-3", loading && "animate-spin")} />
                        {t("settings.providers.recheck")}
                      </button>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        {t("settings.providers.apiAgents")}
                      </h4>
                      <div className="space-y-2">
                        {[
                          { name: "Anthropic API", env: "ANTHROPIC_API_KEY", status: t("settings.providers.comingSoon") },
                          { name: "OpenAI API", env: "OPENAI_API_KEY", status: t("settings.providers.comingSoon") },
                          { name: "Google AI API", env: "GOOGLE_AI_API_KEY", status: t("settings.providers.comingSoon") },
                        ].map((p) => (
                          <div
                            key={p.name}
                            className="flex items-center justify-between bg-card border border-border rounded-lg p-3 opacity-50"
                          >
                            <div className="flex items-center gap-3">
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-[13px] font-medium">{p.name}</p>
                                <p className="text-[11px] text-muted-foreground">{p.status}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </>
          )}

          {/* Integrations Tab */}
          {tab === "integrations" && (
            <div className="relative">
              {/* Blurred content preview */}
              <div className="pointer-events-none select-none blur-[2px] opacity-70" aria-hidden="true">
                <div>
                  <h3 className="text-[14px] font-semibold mb-1">{t("settings.integrations.title")}</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t("settings.integrations.description")}
                  </p>
                  <div className="space-y-3">
                    {["Brave Search", "GitHub", "Slack"].map((name) => (
                      <div key={name} className="bg-card border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-8 rounded-full bg-muted-foreground/30 relative">
                              <span className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white" />
                            </div>
                            <span className="text-[13px] font-medium">{name}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {t("settings.providers.disabledBadge")}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{t("settings.integrations.command")}</label>
                            <div className="w-full mt-0.5 h-7 bg-muted/30 border border-border/50 rounded" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{t("settings.integrations.apiKey")}</label>
                            <div className="w-full mt-0.5 h-7 bg-muted/30 border border-border/50 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-6 mt-6">
                  <h3 className="text-[14px] font-semibold mb-1">{t("settings.integrations.schedulingTitle")}</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t("settings.integrations.description")}
                  </p>
                  <div className="bg-card border border-border rounded-lg p-3 space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{t("settings.integrations.maxConcurrentAgents")}</label>
                      <div className="w-full mt-0.5 h-7 bg-muted/30 border border-border/50 rounded" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t("settings.integrations.activeHours")}
                      </label>
                      <div className="w-full mt-0.5 h-7 bg-muted/30 border border-border/50 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Coming Soon overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 bg-background/80 backdrop-blur-sm rounded-xl px-8 py-6 border border-border shadow-lg">
                  <Plug className="h-6 w-6 text-muted-foreground/50" />
                  <span className="text-[13px] font-semibold">{t("settings.common.comingSoon")}</span>
                  <p className="text-[12px] text-muted-foreground text-center max-w-[220px]">
                    {t("settings.integrations.comingSoonDescription")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {tab === "notifications" && (
            <div className="relative">
              {/* Blurred content preview */}
              <div className="pointer-events-none select-none blur-[2px] opacity-70" aria-hidden="true">
                <div>
                  <h3 className="text-[14px] font-semibold mb-1">{t("settings.notifications.title")}</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t("settings.notifications.description")}
                  </p>
                  <div className="space-y-3">
                    {[
                      { icon: "🔔", name: t("settings.notifications.browserPush"), desc: t("settings.notifications.browserPushDescription") },
                      { icon: "✈️", name: t("settings.notifications.telegram"), desc: t("settings.notifications.telegramDescription") },
                      { icon: "💬", name: t("settings.notifications.slackWebhook"), desc: t("settings.notifications.slackWebhookDescription") },
                      { icon: "📧", name: t("settings.notifications.emailDigest"), desc: t("settings.notifications.emailDigestDescription") },
                    ].map((ch) => (
                      <div key={ch.name} className="bg-card border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{ch.icon}</span>
                            <div>
                              <p className="text-[13px] font-medium">{ch.name}</p>
                              <p className="text-[11px] text-muted-foreground">{ch.desc}</p>
                            </div>
                          </div>
                          <div className="h-4 w-8 rounded-full bg-muted-foreground/30 relative">
                            <span className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-6 mt-6">
                  <h3 className="text-[14px] font-semibold mb-1">{t("settings.notifications.alertRules")}</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t("settings.notifications.alertRulesDescription")}
                  </p>
                  <div className="space-y-2">
                    {[
                      { event: t("settings.notifications.alertsChannelMessages"), desc: t("settings.notifications.alertsChannelMessagesDescription") },
                      { event: t("settings.notifications.humanMentions"), desc: t("settings.notifications.humanMentionsDescription") },
                      { event: t("settings.notifications.goalFloorBreached"), desc: t("settings.notifications.goalFloorBreachedDescription") },
                      { event: t("settings.notifications.agentHealthDegraded"), desc: t("settings.notifications.agentHealthDegradedDescription") },
                    ].map((rule) => (
                      <div key={rule.event} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                        <div>
                          <p className="text-[12px] font-medium">{rule.event}</p>
                          <p className="text-[10px] text-muted-foreground/60">{rule.desc}</p>
                        </div>
                        <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{t("settings.notifications.alwaysOn")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coming Soon overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 bg-background/80 backdrop-blur-sm rounded-xl px-8 py-6 border border-border shadow-lg">
                  <Bell className="h-6 w-6 text-muted-foreground/50" />
                  <span className="text-[13px] font-semibold">{t("settings.common.comingSoon")}</span>
                  <p className="text-[12px] text-muted-foreground text-center max-w-[220px]">
                    {t("settings.notifications.comingSoonDescription")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab (admin only) */}
          {tab === "users" && isAdmin && (
            <UsersTab />
          )}

          {/* About Tab */}
          {tab === "about" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[14px] font-semibold mb-1">{t("settings.about.title")}</h3>
                <p className="text-[12px] text-muted-foreground">
                  AI-first self-hosted knowledge base and startup OS.
                </p>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("settings.about.version")}</span>
                  <span className="font-mono">0.2.6</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("settings.about.framework")}</span>
                  <span>Next.js (App Router)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("settings.about.storage")}</span>
                  <span className="font-mono text-[12px] truncate max-w-[300px]" title={dataDir}>{dataDir || "Local filesystem"}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("settings.about.ai")}</span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Powered by local AI CLIs
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[12px] text-muted-foreground">
                  All content lives as markdown files on disk. Humans define intent. Agents do the work. The knowledge base is the shared memory between both.
                </p>
              </div>


            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
