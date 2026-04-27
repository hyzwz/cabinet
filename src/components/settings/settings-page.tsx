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
  Eye,
  EyeOff,
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
import {
  getModelEffortLevels,
  getSuggestedProviderEffort,
  resolveProviderEffort,
  resolveProviderModel,
} from "@/lib/agents/runtime-options";
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

type IntegrationServerEntry = [string, McpServer];

type IntegrationReadiness = {
  configured: number;
  enabled: number;
  total: number;
};

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

function isIntegrationServerConfigured(server: McpServer): boolean {
  return Object.values(server.env).some((value) => value.trim().length > 0);
}

function isNotificationChannelConfigured(channel: { enabled: boolean } & Record<string, string | boolean>): boolean {
  return Object.entries(channel).some(([key, value]) => key !== "enabled" && typeof value === "string" && value.trim().length > 0);
}

function formatEnvLabel(key: string): string {
  return key
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
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
  const isAdmin = authMode === "multi" && (
    currentUser?.role === "admin" ||
    currentUser?.systemRole === "platform_admin" ||
    (currentUser?.companyAdminCompanyIds?.length ?? 0) > 0
  );
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
  const [integrationsFeedback, setIntegrationsFeedback] = useState<string | null>(null);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [notificationsFeedback, setNotificationsFeedback] = useState<string | null>(null);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationTestPending, setNotificationTestPending] = useState(false);
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
      const res = await fetch("/api/agents/providers", { cache: "no-store" });
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
    if (!config) return false;
    setSaving(true);
    try {
      const res = await fetch("/api/agents/config/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        throw new Error("save_failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return true;
    } catch {
      return false;
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

  const integrationEntries: IntegrationServerEntry[] = Object.entries(config?.mcp_servers ?? {});
  const integrationReadiness: IntegrationReadiness = integrationEntries.reduce(
    (summary, [, server]) => ({
      total: summary.total + 1,
      enabled: summary.enabled + (server.enabled ? 1 : 0),
      configured: summary.configured + (isIntegrationServerConfigured(server) ? 1 : 0),
    }),
    { total: 0, enabled: 0, configured: 0 }
  );
  const notificationsConfig = config?.notifications ?? null;
  const configuredNotificationChannels = notificationsConfig
    ? Number(notificationsConfig.browser_push) +
      Number(isNotificationChannelConfigured(notificationsConfig.telegram)) +
      Number(isNotificationChannelConfigured(notificationsConfig.slack_webhook)) +
      Number(isNotificationChannelConfigured(notificationsConfig.email))
    : 0;
  const enabledNotificationChannels = notificationsConfig
    ? Number(notificationsConfig.browser_push) +
      Number(notificationsConfig.telegram.enabled) +
      Number(notificationsConfig.slack_webhook.enabled) +
      Number(notificationsConfig.email.enabled)
    : 0;

  const handleLoadConfig = useCallback(async () => {
    setIntegrationsFeedback(null);
    setIntegrationsError(null);
    await loadConfig();
  }, [loadConfig]);

  const handleSaveConfig = useCallback(async () => {
    setIntegrationsFeedback(null);
    setIntegrationsError(null);
    const ok = await saveConfig();
    if (ok) {
      setIntegrationsFeedback("Integrations saved successfully.");
      return;
    }
    setIntegrationsError("Unable to save integrations right now.");
  }, [saveConfig]);

  const handleSaveNotifications = useCallback(async () => {
    setNotificationsFeedback(null);
    setNotificationsError(null);
    const ok = await saveConfig();
    if (ok) {
      setNotificationsFeedback("Notifications settings saved successfully.");
      return;
    }
    setNotificationsError("Unable to save notifications settings right now.");
  }, [saveConfig]);

  const handleSendTestNotification = useCallback(async () => {
    setNotificationsFeedback(null);
    setNotificationsError(null);
    setNotificationTestPending(true);
    try {
      const response = await fetch("/api/agents/config/notifications/test", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setNotificationsError(data?.message || "Unable to send a test notification.");
        return;
      }
      setNotificationsFeedback(data.message || "Test notification sent.");
    } catch {
      setNotificationsError("Unable to send a test notification.");
    } finally {
      setNotificationTestPending(false);
    }
  }, []);

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
                        const activeModel = resolveProviderModel(
                          activeP,
                          defaultModel || undefined,
                          undefined
                        );
                        const models = activeP?.models || [];
                        const effortLevels = getModelEffortLevels(
                          activeP,
                          activeModel?.id
                        );
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
                                          const nextEffortId =
                                            resolveProviderEffort(
                                              activeP,
                                              m.id,
                                              defaultEffort || undefined,
                                              undefined
                                            )?.id ||
                                            getSuggestedProviderEffort(activeP, m.id)?.id ||
                                            "";
                                          setDefaultModel(m.id);
                                          setDefaultEffort(nextEffortId);
                                          const disabledIds = providers.filter((p) => !p.enabled).map((p) => p.id);
                                          void saveProviderSettings(defaultProvider, disabledIds, [], {
                                            defaultModel: m.id,
                                            defaultEffort: nextEffortId,
                                          });
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
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[14px] font-semibold mb-1">{t("settings.integrations.title")}</h3>
                  <p className="text-xs text-muted-foreground mb-0">
                    {t("settings.integrations.description")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleLoadConfig();
                    }}
                    disabled={configLoading || saving}
                    className="gap-2"
                  >
                    <RotateCw className={cn("h-3.5 w-3.5", configLoading && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      void handleSaveConfig();
                    }}
                    disabled={!config || configLoading || saving}
                    className="gap-2"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save integrations
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Configured servers</p>
                  <p className="mt-2 text-2xl font-semibold">{integrationReadiness.configured}/{integrationReadiness.total}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Servers with at least one credential or env value present.</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Enabled servers</p>
                  <p className="mt-2 text-2xl font-semibold">{integrationReadiness.enabled}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Servers currently available to the runtime.</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Scheduling posture</p>
                  <p className="mt-2 text-sm font-medium">
                    {config?.scheduling.pause_on_error ? "Pause on error enabled" : "Pause on error disabled"}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {config ? `${config.scheduling.max_concurrent_agents} max concurrent agents · ${config.scheduling.active_hours}` : "Loading current scheduling settings..."}
                  </p>
                </div>
              </div>

              {integrationsFeedback && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-300">
                  {integrationsFeedback}
                </div>
              )}
              {integrationsError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                  {integrationsError}
                </div>
              )}

              {configLoading && !config ? (
                <div className="rounded-lg border border-border bg-card px-4 py-8 text-[13px] text-muted-foreground">
                  Loading integrations configuration…
                </div>
              ) : config ? (
                <>
                  <div className="space-y-3">
                    {integrationEntries.map(([id, server]) => {
                      const configured = isIntegrationServerConfigured(server);
                      return (
                        <div key={id} className="rounded-lg border border-border bg-card p-4 space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-semibold">{server.name}</p>
                                <span className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  server.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                                )}>
                                  {server.enabled ? "Enabled" : "Disabled"}
                                </span>
                                <span className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  configured ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                )}>
                                  {configured ? "Configured" : "Needs credentials"}
                                </span>
                              </div>
                              <p className="text-[12px] text-muted-foreground">{server.description || "External integration server"}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateMcp(id, "enabled", !server.enabled)}
                              className={cn(
                                "inline-flex items-center rounded-full p-1 transition-colors",
                                server.enabled ? "bg-emerald-500/20 justify-end" : "bg-muted justify-start"
                              )}
                              aria-pressed={server.enabled}
                              aria-label={`${server.enabled ? "Disable" : "Enable"} ${server.name}`}
                            >
                              <span className={cn(
                                "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                                server.enabled && "translate-x-4"
                              )} />
                              <span className="sr-only">{server.enabled ? "Enabled" : "Disabled"}</span>
                            </button>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Launch command</label>
                            <Input
                              value={server.command}
                              onChange={(event) => updateMcp(id, "command", event.target.value)}
                              className="mt-1 h-8 text-[12px]"
                            />
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            {Object.entries(server.env).map(([envKey, envValue]) => {
                              const revealKey = `${id}:${envKey}`;
                              const revealed = revealedKeys.has(revealKey);
                              return (
                                <div key={envKey}>
                                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{formatEnvLabel(envKey)}</label>
                                  <div className="mt-1 flex items-center gap-2">
                                    <Input
                                      type={revealed ? "text" : "password"}
                                      value={envValue}
                                      onChange={(event) => updateMcpEnv(id, envKey, event.target.value)}
                                      placeholder={`Set ${envKey}`}
                                      className="h-8 text-[12px]"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleReveal(revealKey)}
                                      className="h-8 px-2"
                                    >
                                      {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </Button>
                                  </div>
                                  <p className="mt-1 text-[10px] text-muted-foreground font-mono">{envKey}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                    <div>
                      <h4 className="text-[13px] font-semibold">Agent scheduling</h4>
                      <p className="text-[12px] text-muted-foreground">Control concurrency and runtime guardrails for integration-backed agents.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Max concurrent agents</label>
                        <Input
                          type="number"
                          min={1}
                          value={String(config.scheduling.max_concurrent_agents)}
                          onChange={(event) => updateScheduling("max_concurrent_agents", Number(event.target.value) || 1)}
                          className="mt-1 h-8 text-[12px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Heartbeat interval</label>
                        <Input
                          value={config.scheduling.default_heartbeat_interval}
                          onChange={(event) => updateScheduling("default_heartbeat_interval", event.target.value)}
                          className="mt-1 h-8 text-[12px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Active hours</label>
                        <Input
                          value={config.scheduling.active_hours}
                          onChange={(event) => updateScheduling("active_hours", event.target.value)}
                          className="mt-1 h-8 text-[12px]"
                        />
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[12px] font-medium">Pause agents on errors</p>
                            <p className="text-[11px] text-muted-foreground">Automatically pause follow-up runs after a failing integration cycle.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateScheduling("pause_on_error", !config.scheduling.pause_on_error)}
                            className={cn(
                              "inline-flex items-center rounded-full p-1 transition-colors",
                              config.scheduling.pause_on_error ? "bg-emerald-500/20 justify-end" : "bg-muted justify-start"
                            )}
                            aria-pressed={config.scheduling.pause_on_error}
                            aria-label="Toggle pause on error"
                          >
                            <span className={cn(
                              "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                              config.scheduling.pause_on_error && "translate-x-4"
                            )} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-8 text-[13px] text-destructive">
                  Unable to load integrations configuration.
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {tab === "notifications" && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[14px] font-semibold mb-1">{t("settings.notifications.title")}</h3>
                  <p className="text-xs text-muted-foreground mb-0">
                    {t("settings.notifications.description")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleLoadConfig();
                    }}
                    disabled={configLoading || saving || notificationTestPending}
                    className="gap-2"
                  >
                    <RotateCw className={cn("h-3.5 w-3.5", configLoading && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleSendTestNotification();
                    }}
                    disabled={!config || configLoading || saving || notificationTestPending}
                    className="gap-2"
                  >
                    {notificationTestPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                    Send test
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      void handleSaveNotifications();
                    }}
                    disabled={!config || configLoading || saving || notificationTestPending}
                    className="gap-2"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save notifications
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Configured channels</p>
                  <p className="mt-2 text-2xl font-semibold">{configuredNotificationChannels}/4</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Browser push plus three external delivery channels.</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Enabled channels</p>
                  <p className="mt-2 text-2xl font-semibold">{enabledNotificationChannels}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Channels currently allowed to receive notifications.</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Digest policy</p>
                  <p className="mt-2 text-sm font-medium">
                    {notificationsConfig?.email.enabled ? `Email digest ${notificationsConfig.email.frequency}` : "Email digest disabled"}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Tune the daily/hourly summary without leaving Settings.</p>
                </div>
              </div>

              {notificationsFeedback && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-300">
                  {notificationsFeedback}
                </div>
              )}
              {notificationsError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                  {notificationsError}
                </div>
              )}

              {configLoading && !config ? (
                <div className="rounded-lg border border-border bg-card px-4 py-8 text-[13px] text-muted-foreground">
                  Loading notifications configuration…
                </div>
              ) : notificationsConfig ? (
                <>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold">Browser push</p>
                          <p className="text-[12px] text-muted-foreground">In-app and browser delivery for real-time attention when Cabinet is open.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateNotif("browser_push", !notificationsConfig.browser_push)}
                          className={cn(
                            "inline-flex items-center rounded-full p-1 transition-colors",
                            notificationsConfig.browser_push ? "bg-emerald-500/20 justify-end" : "bg-muted justify-start"
                          )}
                          aria-pressed={notificationsConfig.browser_push}
                          aria-label="Toggle browser push notifications"
                        >
                          <span className={cn(
                            "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            notificationsConfig.browser_push && "translate-x-4"
                          )} />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold">Telegram</p>
                          <p className="text-[12px] text-muted-foreground">Route alerts to a bot for fast mobile delivery.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateNotif("telegram.enabled", !notificationsConfig.telegram.enabled)}
                          className={cn(
                            "inline-flex items-center rounded-full p-1 transition-colors",
                            notificationsConfig.telegram.enabled ? "bg-emerald-500/20 justify-end" : "bg-muted justify-start"
                          )}
                          aria-pressed={notificationsConfig.telegram.enabled}
                          aria-label="Toggle Telegram notifications"
                        >
                          <span className={cn(
                            "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            notificationsConfig.telegram.enabled && "translate-x-4"
                          )} />
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Bot token</label>
                          <Input
                            value={notificationsConfig.telegram.bot_token}
                            onChange={(event) => updateNotif("telegram.bot_token", event.target.value)}
                            placeholder="Enter Telegram bot token"
                            className="mt-1 h-8 text-[12px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Chat ID</label>
                          <Input
                            value={notificationsConfig.telegram.chat_id}
                            onChange={(event) => updateNotif("telegram.chat_id", event.target.value)}
                            placeholder="Enter Telegram chat ID"
                            className="mt-1 h-8 text-[12px]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold">Slack webhook</p>
                          <p className="text-[12px] text-muted-foreground">Send delivery copies into a shared incident or operations channel.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateNotif("slack_webhook.enabled", !notificationsConfig.slack_webhook.enabled)}
                          className={cn(
                            "inline-flex items-center rounded-full p-1 transition-colors",
                            notificationsConfig.slack_webhook.enabled ? "bg-emerald-500/20 justify-end" : "bg-muted justify-start"
                          )}
                          aria-pressed={notificationsConfig.slack_webhook.enabled}
                          aria-label="Toggle Slack webhook notifications"
                        >
                          <span className={cn(
                            "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            notificationsConfig.slack_webhook.enabled && "translate-x-4"
                          )} />
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Webhook URL</label>
                        <Input
                          value={notificationsConfig.slack_webhook.url}
                          onChange={(event) => updateNotif("slack_webhook.url", event.target.value)}
                          placeholder="https://hooks.slack.com/services/..."
                          className="mt-1 h-8 text-[12px]"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold">Email digest</p>
                          <p className="text-[12px] text-muted-foreground">Summaries for operators who prefer batched delivery over instant notifications.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateNotif("email.enabled", !notificationsConfig.email.enabled)}
                          className={cn(
                            "inline-flex items-center rounded-full p-1 transition-colors",
                            notificationsConfig.email.enabled ? "bg-emerald-500/20 justify-end" : "bg-muted justify-start"
                          )}
                          aria-pressed={notificationsConfig.email.enabled}
                          aria-label="Toggle email digest notifications"
                        >
                          <span className={cn(
                            "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            notificationsConfig.email.enabled && "translate-x-4"
                          )} />
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Recipient</label>
                          <Input
                            value={notificationsConfig.email.to}
                            onChange={(event) => updateNotif("email.to", event.target.value)}
                            placeholder="operator@example.com"
                            className="mt-1 h-8 text-[12px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Frequency</label>
                          <div className="mt-1 grid grid-cols-2 gap-2">
                            {(["hourly", "daily"] as const).map((frequency) => {
                              const active = notificationsConfig.email.frequency === frequency;
                              return (
                                <button
                                  key={frequency}
                                  type="button"
                                  onClick={() => updateNotif("email.frequency", frequency)}
                                  className={cn(
                                    "rounded-md border px-3 py-2 text-[12px] font-medium transition-colors",
                                    active ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {frequency === "hourly" ? "Hourly" : "Daily"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <div>
                      <h4 className="text-[13px] font-semibold">Alert policy</h4>
                      <p className="text-[12px] text-muted-foreground">This phase keeps event delivery broad while making the delivery channels configurable.</p>
                    </div>
                    <div className="space-y-2">
                      {[
                        "Channel messages requiring follow-up",
                        "Human mentions and assignment handoffs",
                        "Goal floor breaches and SLA misses",
                        "Agent health degradation or paused runs",
                      ].map((rule) => (
                        <div key={rule} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                          <p className="text-[12px] font-medium">{rule}</p>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Always on</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-8 text-[13px] text-destructive">
                  Unable to load notifications configuration.
                </div>
              )}
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
