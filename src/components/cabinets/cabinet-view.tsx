"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Archive,
  Bot,
  Briefcase,
  Clock3,
  Crown,
  HeartPulse,
  Loader2,
} from "lucide-react";
import { KBEditor } from "@/components/editor/editor";
import { HeaderActions } from "@/components/layout/header-actions";
import { VersionHistory } from "@/components/editor/version-history";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cronToHuman, cronToShortLabel } from "@/lib/agents/cron-utils";
import {
  CABINET_VISIBILITY_OPTIONS,
  cabinetVisibilityModeLabel,
} from "@/lib/cabinets/visibility";
import { useEditorStore } from "@/stores/editor-store";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import type {
  CabinetAgentSummary,
  CabinetJobSummary,
  CabinetOverview,
} from "@/types/cabinets";

function startCase(value: string | undefined, fallback = "General"): string {
  if (!value) return fallback;

  const words = value
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean);

  if (words.length === 0) return fallback;

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function rankAgentType(type?: string): number {
  if (type === "lead") return 0;
  if (type === "specialist") return 1;
  if (type === "support") return 2;
  return 3;
}

function sortOrgAgents(a: CabinetAgentSummary, b: CabinetAgentSummary): number {
  if (a.cabinetDepth !== b.cabinetDepth) {
    return a.cabinetDepth - b.cabinetDepth;
  }
  const typeRank = rankAgentType(a.type) - rankAgentType(b.type);
  if (typeRank !== 0) return typeRank;
  if ((b.active ? 1 : 0) !== (a.active ? 1 : 0)) {
    return (b.active ? 1 : 0) - (a.active ? 1 : 0);
  }
  return a.name.localeCompare(b.name);
}

function findChiefAgent(agents: CabinetAgentSummary[]): CabinetAgentSummary | null {
  const orderedAgents = [...agents].sort(sortOrgAgents);
  const bySlug = orderedAgents.find((agent) => agent.slug.toLowerCase() === "ceo");
  if (bySlug) return bySlug;

  const byName = orderedAgents.find((agent) => agent.name.trim().toLowerCase() === "ceo");
  if (byName) return byName;

  const byRole = orderedAgents.find((agent) =>
    agent.role.toLowerCase().includes("chief executive")
  );
  if (byRole) return byRole;

  return orderedAgents.find((agent) => agent.type === "lead") || null;
}

function CompactOrgChart({
  cabinetName,
  agents,
  onAgentClick,
}: {
  cabinetName: string;
  agents: CabinetAgentSummary[];
  onAgentClick?: (agent: CabinetAgentSummary) => void;
}) {
  const chiefAgent = findChiefAgent(agents);
  const orgRoot = chiefAgent || {
    scopedId: "__cabinet_ceo__",
    name: "CEO",
    slug: "__cabinet_ceo__",
    emoji: "👑",
    role: "Executive lead not configured yet",
    department: "executive",
    type: "lead",
    active: false,
    heartbeat: undefined,
    workspace: undefined,
    jobCount: 0,
    taskCount: 0,
    cabinetPath: "",
    cabinetName,
    cabinetDepth: 0,
    inherited: false,
  };
  const orgAgents = agents
    .filter((agent) => agent.slug !== orgRoot.slug)
    .sort(sortOrgAgents);
  const groupedOrgAgents = Object.entries(
    orgAgents.reduce<Record<string, CabinetAgentSummary[]>>((acc, agent) => {
      const department = agent.department || "general";
      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(agent);
      return acc;
    }, {})
  )
    .sort(([left], [right]) => {
      if (left === "general") return 1;
      if (right === "general") return -1;
      return startCase(left).localeCompare(startCase(right));
    })
    .map(([department, departmentAgents]) => ({
      department,
      label: startCase(department),
      agents: departmentAgents.sort(sortOrgAgents),
    }));

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border bg-card">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Cabinet Org Chart</h2>
            <p className="text-xs text-muted-foreground">
              {cabinetName} agents grouped by department
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          <div
            className={cn("rounded-[24px] bg-primary/[0.08] p-4", onAgentClick && "cursor-pointer hover:bg-primary/[0.12] transition-colors")}
            onClick={() => onAgentClick?.(orgRoot)}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background text-[26px]">
                {orgRoot.emoji || "👑"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <Crown className="h-3 w-3" />
                  CEO
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em]">
                  {orgRoot.name}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {orgRoot.role}
                </p>
                {orgRoot.inherited ? (
                  <div className="mt-2">
                    <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {orgRoot.cabinetName}
                    </span>
                  </div>
                ) : null}
              </div>
              <span
                className={cn(
                  "mt-1 inline-flex h-2.5 w-2.5 rounded-full",
                  orgRoot.active ? "bg-emerald-500" : "bg-muted-foreground/30"
                )}
                title={orgRoot.active ? "Active" : "Paused"}
              />
            </div>
          </div>

          {groupedOrgAgents.length > 0 ? (
            groupedOrgAgents.map((group) => (
              <section
                key={group.department}
                className="rounded-[24px] border border-border/70 bg-background/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold">{group.label}</h4>
                    <p className="text-xs text-muted-foreground">
                      {group.agents.length} {group.agents.length === 1 ? "agent" : "agents"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2.5">
                  {group.agents.map((agent) => (
                    <div
                      key={agent.scopedId}
                      className={cn("rounded-2xl border border-border/60 bg-card px-3 py-3", onAgentClick && "cursor-pointer hover:border-primary/30 transition-colors")}
                      onClick={() => onAgentClick?.(agent)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-[22px]">
                          {agent.emoji || "🤖"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{agent.name}</p>
                            <span
                              className={cn(
                                "inline-flex h-2.5 w-2.5 rounded-full",
                                agent.active ? "bg-emerald-500" : "bg-muted-foreground/30"
                              )}
                              title={agent.active ? "Active" : "Paused"}
                            />
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {agent.role}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {startCase(agent.type, "Specialist")}
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {agent.jobCount} {agent.jobCount === 1 ? "job" : "jobs"}
                            </span>
                            {agent.inherited ? (
                              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {agent.cabinetName}
                              </span>
                            ) : null}
                            {agent.heartbeat ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                {cronToShortLabel(agent.heartbeat)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
              Add more agents to start mapping this cabinet’s team.
            </div>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}

function SchedulesPanel({
  cabinetPath,
  agents,
  jobs,
}: {
  cabinetPath: string;
  agents: CabinetAgentSummary[];
  jobs: CabinetJobSummary[];
}) {
  const agentNameBySlug = useMemo(
    () =>
      new Map(
        agents.map((agent) => [agent.scopedId, agent.name])
      ),
    [agents]
  );
  const heartbeatAgents = agents
    .filter((agent) => agent.heartbeat)
    .sort((left, right) => left.name.localeCompare(right.name));
  const jobsWithOwners = jobs.map((job) => ({
    ...job,
    ownerName: job.ownerScopedId
      ? agentNameBySlug.get(job.ownerScopedId) || job.ownerAgent || null
      : job.ownerAgent || null,
  }));
  const includesDescendants = jobs.some((job) => job.inherited) || heartbeatAgents.some((agent) => agent.inherited);

  return (
    <section className="flex min-h-[320px] flex-col overflow-hidden rounded-[28px] border bg-card">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Schedules</h2>
            <p className="text-xs text-muted-foreground">
              {includesDescendants
                ? "Jobs and heartbeat rhythms across the visible cabinet tree"
                : "Jobs and heartbeat rhythms for this cabinet"}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Jobs
              </h3>
            </div>

            <div className="space-y-2">
              {jobsWithOwners.length > 0 ? (
                jobsWithOwners.map((job) => (
                  <div
                    key={job.scopedId}
                    className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{job.name}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {job.ownerName ? `${job.ownerName} · ` : ""}
                          {cronToHuman(job.schedule)}
                        </p>
                        {job.cabinetPath !== cabinetPath ? (
                          <div className="mt-2">
                            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {job.cabinetName}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                          job.enabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {job.enabled ? "Enabled" : "Paused"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background/70 px-3 py-4 text-sm text-muted-foreground">
                  No cabinet jobs yet.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <HeartPulse className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Heartbeats
              </h3>
            </div>

            <div className="space-y-2">
              {heartbeatAgents.length > 0 ? (
                heartbeatAgents.map((agent) => (
                  <div
                    key={agent.scopedId}
                    className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-lg">
                        {agent.emoji || "🤖"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{agent.name}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {cronToHuman(agent.heartbeat || "")}
                        </p>
                        {agent.cabinetPath !== cabinetPath ? (
                          <div className="mt-2">
                            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {agent.cabinetName}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background/70 px-3 py-4 text-sm text-muted-foreground">
                  No heartbeats configured yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}

export function CabinetView({ cabinetPath }: { cabinetPath: string }) {
  const [overview, setOverview] = useState<CabinetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectPage = useTreeStore((state) => state.selectPage);
  const loadPage = useEditorStore((state) => state.loadPage);
  const setSection = useAppStore((state) => state.setSection);
  const cabinetVisibilityMode = useAppStore((state) => state.cabinetVisibilityMode);
  const setCabinetVisibilityMode = useAppStore((state) => state.setCabinetVisibilityMode);

  const openCabinet = useCallback(
    (path: string) => {
      selectPage(path);
      loadPage(path);
      setSection({ type: "page" });
    },
    [loadPage, selectPage, setSection]
  );

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        path: cabinetPath,
        visibility: cabinetVisibilityMode,
      });
      const response = await fetch(`/api/cabinets/overview?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to load cabinet overview");
      }

      const data = (await response.json()) as CabinetOverview;
      setOverview(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cabinet overview");
    } finally {
      setLoading(false);
    }
  }, [cabinetPath, cabinetVisibilityMode]);

  useEffect(() => {
    void loadOverview();

    const interval = window.setInterval(() => {
      void loadOverview();
    }, 15000);
    const handleFocus = () => {
      void loadOverview();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadOverview]);

  const cabinetName =
    overview?.cabinet.name ||
    cabinetPath.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ||
    "Cabinet";
  const cabinetDescription =
    overview?.cabinet.description || "Portable software layer for agents, jobs, and knowledge.";
  const activeAgents = overview?.agents.filter((agent) => agent.active).length || 0;
  const heartbeatCount =
    overview?.agents.filter((agent) => Boolean(agent.heartbeat)).length || 0;
  const directChildCabinetCount = overview?.children.length || 0;
  const visibleCabinetCount = overview?.visibleCabinets.length || 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-border/70 bg-background/95 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-1">
          <VersionHistory />
          <HeaderActions />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-[32px] border bg-card shadow-sm">
            <div className="relative h-28 overflow-hidden bg-gradient-to-r from-primary/25 via-primary/12 to-background">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_44%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,hsl(var(--primary)/0.07)_100%)]" />
            </div>

            <div className="relative px-5 pb-6 pt-5 sm:px-6">
              {overview?.parent ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openCabinet(overview.parent!.path)}
                  className="mb-4 gap-2 rounded-full px-3"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to {overview.parent.name}
                </Button>
              ) : null}

              <div className="-mt-14 flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-border/60 bg-background text-primary shadow-sm">
                    <Archive className="h-7 w-7" />
                  </div>

                  <div className="min-w-0 pt-4">
                    <div className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                      {overview?.cabinet.kind || "Cabinet"}
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                      {cabinetName}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {cabinetDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {overview?.agents.length || 0} agents
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {activeAgents} active
                </div>
                <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {overview?.jobs.length || 0} jobs
                </div>
                <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {heartbeatCount} heartbeats
                </div>
                <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {directChildCabinetCount} {directChildCabinetCount === 1 ? "child cabinet" : "child cabinets"}
                </div>
                <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {visibleCabinetCount} {visibleCabinetCount === 1 ? "visible cabinet" : "visible cabinets"}
                </div>
                <div className="rounded-full bg-muted px-3 py-1 font-mono text-[11px] text-muted-foreground">
                  /{cabinetPath}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Visible Agent Scope
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cabinetVisibilityModeLabel(cabinetVisibilityMode)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {CABINET_VISIBILITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setCabinetVisibilityMode(option.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        cabinetVisibilityMode === option.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {option.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="flex min-h-[720px] min-w-0 flex-col overflow-hidden rounded-[28px] border bg-card">
              <div className="border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <div>
                    <h2 className="text-sm font-semibold">Cabinet Notes</h2>
                    <p className="text-xs text-muted-foreground">
                      Showing this cabinet&apos;s index page for now
                    </p>
                  </div>
                </div>
              </div>
              <KBEditor />
            </section>

            <div className="flex min-h-[720px] flex-col gap-4">
              {loading && !overview ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border bg-card text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading cabinet overview...
                  </div>
                </div>
              ) : error && !overview ? (
                <div className="rounded-[28px] border border-destructive/30 bg-card px-5 py-4 text-sm text-destructive">
                  {error}
                </div>
              ) : overview ? (
                <>
                  <CompactOrgChart
                    cabinetName={cabinetName}
                    agents={overview.agents}
                    onAgentClick={(agent) =>
                      setSection({
                        type: "agent",
                        slug: agent.slug,
                        cabinetPath: agent.cabinetPath || cabinetPath,
                      })
                    }
                  />
                  <SchedulesPanel
                    cabinetPath={cabinetPath}
                    agents={overview.agents}
                    jobs={overview.jobs}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
