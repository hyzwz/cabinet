import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CabinetReportingLinkView,
  CabinetReportingSnapshotView,
  ReportingLinkCreateRequest,
  ReportingLinksResponse,
  ReportingLinkUpdateRequest,
  ReportingScopeView,
} from "@/types/cabinets";
import {
  buildCabinetReportingApiPath,
  buildLinkedSnapshotMap,
  buildReportingFreshnessCounts,
  buildReportingHealthSummary,
  buildReportingSnapshotCounts,
  buildReportingStatusCounts,
  filterReportingLinks,
  getReportingHealthState,
  getReportingSnapshotAgeMs,
  groupReportingLinksByStatus,
  isReportingSnapshotStale,
  type ReportingFreshnessFilter,
  type ReportingHealthScope,
  type ReportingSnapshotFilter,
} from "./reporting-helpers";

export function useReportingLinksData({
  cabinetId,
  cabinetPath,
  snapshots,
  onRefreshSnapshots,
}: {
  cabinetId?: string | null;
  cabinetPath: string;
  snapshots: CabinetReportingSnapshotView[];
  onRefreshSnapshots?: (source?: "create" | "update" | "manual" | "review-missing" | "review-stale" | "open-missing" | "open-stale") => Promise<void>;
}) {
  const [links, setLinks] = useState<CabinetReportingLinkView[]>([]);
  const [scope, setScope] = useState<ReportingScopeView | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | CabinetReportingLinkView["status"]>("all");
  const [snapshotFilter, setSnapshotFilter] = useState<ReportingSnapshotFilter>("all");
  const [freshnessFilter, setFreshnessFilter] = useState<ReportingFreshnessFilter>("all");
  const [healthScope, setHealthScope] = useState<ReportingHealthScope>("active");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [didJustRefresh, setDidJustRefresh] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshActivityLabel, setRefreshActivityLabel] = useState<string | null>(null);
  const [openCompletionNotice, setOpenCompletionNotice] = useState<string | null>(null);
  const [statusUpdateNotice, setStatusUpdateNotice] = useState<string | null>(null);
  const refreshFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newChildCabinetId, setNewChildCabinetId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const linkedSnapshots = useMemo(() => {
    return buildLinkedSnapshotMap(snapshots);
  }, [snapshots]);

  const statusCounts = useMemo(() => {
    return buildReportingStatusCounts(links);
  }, [links]);

  const snapshotCounts = useMemo(() => {
    return buildReportingSnapshotCounts(links, linkedSnapshots);
  }, [linkedSnapshots, links]);

  const freshnessCounts = useMemo(() => {
    return buildReportingFreshnessCounts(links, linkedSnapshots);
  }, [linkedSnapshots, links]);

  const filteredLinks = useMemo(() => {
    return filterReportingLinks(
      links,
      linkedSnapshots,
      statusFilter,
      snapshotFilter,
      freshnessFilter,
    );
  }, [freshnessFilter, linkedSnapshots, links, snapshotFilter, statusFilter]);

  const activeLinksMissingSnapshots = useMemo(() => {
    return links.filter(
      (link) => link.status === "active" && !linkedSnapshots.has(link.childCabinetId),
    );
  }, [linkedSnapshots, links]);

  const staleLinkedSnapshots = useMemo(() => {
    return links.filter((link) => {
      const snapshot = linkedSnapshots.get(link.childCabinetId);
      return Boolean(snapshot && isReportingSnapshotStale(snapshot.generatedAt));
    });
  }, [linkedSnapshots, links]);

  const derivedHealthScope = useMemo<ReportingHealthScope>(() => {
    if (statusFilter === "active") return "active";
    return "all";
  }, [statusFilter]);

  useEffect(() => {
    if (healthScope !== derivedHealthScope) {
      setHealthScope(derivedHealthScope);
    }
  }, [derivedHealthScope, healthScope]);

  useEffect(() => {
    return () => {
      if (refreshFeedbackTimerRef.current) {
        clearTimeout(refreshFeedbackTimerRef.current);
      }
      if (openCompletionTimerRef.current) {
        clearTimeout(openCompletionTimerRef.current);
      }
      if (statusUpdateTimerRef.current) {
        clearTimeout(statusUpdateTimerRef.current);
      }
    };
  }, []);

  const healthSummary = useMemo(() => {
    return buildReportingHealthSummary(links, linkedSnapshots, healthScope);
  }, [healthScope, linkedSnapshots, links]);

  const activeHealthState = useMemo(() => {
    return getReportingHealthState(snapshotFilter, freshnessFilter);
  }, [freshnessFilter, snapshotFilter]);

  const groupedLinks = useMemo(() => {
    return groupReportingLinksByStatus(filteredLinks);
  }, [filteredLinks]);
  const resolvedCabinetId = cabinetId?.trim() || cabinetPath;
  const requestCabinetPath = cabinetId?.trim() ? cabinetPath : null;
  const reportingLinksPath = buildCabinetReportingApiPath({
    cabinetId: resolvedCabinetId,
    cabinetPath: requestCabinetPath,
    resource: "reporting-links",
  });

  const refreshLinks = useCallback(async (source: "auto" | "manual" | "create" | "update" | "review-missing" | "review-stale" | "open-missing" | "open-stale" = "auto") => {
    setIsLoading(true);
    setRefreshActivityLabel(
      source === "manual"
        ? "Refreshing links manually"
        : source === "create"
          ? "Refreshing links after create"
          : source === "update"
            ? "Refreshing links after update"
            : source === "review-missing"
              ? "Refreshing before missing review"
              : source === "review-stale"
                ? "Refreshing before stale review"
                : source === "open-missing"
                  ? "Refreshing and opening missing cabinet"
                  : source === "open-stale"
                    ? "Refreshing and opening stale cabinet"
                    : "Refreshing links"
    );
    try {
      const response = await fetch(reportingLinksPath, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | (ReportingLinksResponse & { error?: string; code?: string; scope?: ReportingScopeView | null })
        | null;

      if (!response.ok) {
        const responseError = new Error(payload?.error ?? "Failed to load reporting links") as Error & {
          code?: string;
        };
        responseError.code = payload?.code ?? undefined;
        throw responseError;
      }

      setLinks(payload?.links ?? []);
      setScope(payload?.scope ?? null);
      setError(null);
      setErrorCode(null);
      setLastUpdatedAt(new Date().toISOString());
      const nextRefreshNotice =
        source === "manual"
          ? "Links refreshed manually"
          : source === "create"
            ? "Links synced after create"
            : source === "update"
              ? "Links synced after update"
              : source === "review-missing"
                ? "Links refreshed before missing review"
                : source === "review-stale"
                  ? "Links refreshed before stale review"
                  : source === "open-missing"
                    ? "Links refreshed before opening missing cabinet"
                    : source === "open-stale"
                      ? "Links refreshed before opening stale cabinet"
                      : "Links refreshed";
      setRefreshNotice(nextRefreshNotice);
      setDidJustRefresh(true);
      if (refreshFeedbackTimerRef.current) {
        clearTimeout(refreshFeedbackTimerRef.current);
      }
      refreshFeedbackTimerRef.current = setTimeout(() => {
        setDidJustRefresh(false);
        setRefreshNotice(null);
      }, 4_000);

      return nextRefreshNotice;
    } catch (requestError) {
      setLinks([]);
      setScope(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load reporting links",
      );
      setErrorCode(
        requestError instanceof Error && "code" in requestError
          ? String((requestError as Error & { code?: unknown }).code ?? "")
          : null,
      );
    } finally {
      setIsLoading(false);
      setRefreshActivityLabel(null);
    }
  }, [reportingLinksPath]);

  const acknowledgeOpenCompletion = useCallback((notice: string) => {
    setOpenCompletionNotice(notice);
    if (openCompletionTimerRef.current) {
      clearTimeout(openCompletionTimerRef.current);
    }
    openCompletionTimerRef.current = setTimeout(() => {
      setOpenCompletionNotice(null);
    }, 4_000);
  }, []);

  const acknowledgeStatusUpdate = useCallback((notice: string) => {
    setStatusUpdateNotice(notice);
    if (statusUpdateTimerRef.current) {
      clearTimeout(statusUpdateTimerRef.current);
    }
    statusUpdateTimerRef.current = setTimeout(() => {
      setStatusUpdateNotice(null);
    }, 4_000);
  }, []);

  useEffect(() => {
    void refreshLinks();
  }, [refreshLinks]);

  const createLink = useCallback(async () => {
    const childCabinetId = newChildCabinetId.trim();
    if (!childCabinetId) {
      setError("Child cabinet path is required");
      return;
    }

    setIsSaving(true);
    try {
      const requestBody = {
        childCabinetId,
        ...(requestCabinetPath
          ? {
              childCabinetPath: childCabinetId,
              parentCabinetPath: requestCabinetPath,
            }
          : {}),
      } satisfies ReportingLinkCreateRequest;
      const response = await fetch(reportingLinksPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to create reporting link");
      }

      setNewChildCabinetId("");
      await Promise.all([refreshLinks("create"), onRefreshSnapshots?.("create") ?? Promise.resolve()]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create reporting link",
      );
    } finally {
      setIsSaving(false);
    }
  }, [newChildCabinetId, onRefreshSnapshots, refreshLinks, reportingLinksPath, requestCabinetPath]);

  const updateLinkStatus = useCallback(
    async (linkId: string, status: ReportingLinkUpdateRequest["status"]) => {
      setIsSaving(true);
      try {
        const response = await fetch(reportingLinksPath, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkId, status } satisfies ReportingLinkUpdateRequest),
        });
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to update reporting link");
        }

        await Promise.all([refreshLinks("update"), onRefreshSnapshots?.("update") ?? Promise.resolve()]);
        acknowledgeStatusUpdate(
          status === "active"
            ? "Link reactivated and scope refreshed"
            : status === "paused"
              ? "Link paused and scope refreshed"
              : "Link revoked and scope refreshed",
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to update reporting link",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [acknowledgeStatusUpdate, onRefreshSnapshots, refreshLinks, reportingLinksPath],
  );

  return {
    scope,
    links,
    statusFilter,
    snapshotFilter,
    freshnessFilter,
    healthScope,
    isLoading,
    error,
    errorCode,
    lastUpdatedAt,
    didJustRefresh,
    refreshNotice,
    refreshActivityLabel,
    openCompletionNotice,
    statusUpdateNotice,
    newChildCabinetId,
    isSaving,
    linkedSnapshots,
    statusCounts,
    snapshotCounts,
    freshnessCounts,
    filteredLinks,
    activeLinksMissingSnapshots,
    staleLinkedSnapshots,
    healthSummary,
    activeHealthState,
    groupedLinks,
    setStatusFilter,
    setSnapshotFilter,
    setFreshnessFilter,
    setHealthScope,
    setNewChildCabinetId,
    refreshLinks,
    acknowledgeOpenCompletion,
    createLink,
    updateLinkStatus,
  };
}

export function useReportingSnapshotsData({
  cabinetId,
  cabinetPath,
  initialSnapshots,
  initialError,
  refreshToken = 0,
}: {
  cabinetId?: string | null;
  cabinetPath: string;
  initialSnapshots: CabinetReportingSnapshotView[];
  initialError?: string | null;
  refreshToken?: number;
}) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [scope, setScope] = useState<ReportingScopeView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [didJustRefresh, setDidJustRefresh] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshActivityLabel, setRefreshActivityLabel] = useState<string | null>(null);
  const refreshFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((left, right) => {
      return getReportingSnapshotAgeMs(left.generatedAt) - getReportingSnapshotAgeMs(right.generatedAt);
    });
  }, [snapshots]);

  const staleSnapshotCount = useMemo(() => {
    return sortedSnapshots.filter((snapshot) => isReportingSnapshotStale(snapshot.generatedAt)).length;
  }, [sortedSnapshots]);

  useEffect(() => {
    setSnapshots(initialSnapshots);
  }, [initialSnapshots]);

  useEffect(() => {
    setError(initialError ?? null);
  }, [initialError]);

  useEffect(() => {
    return () => {
      if (refreshFeedbackTimerRef.current) {
        clearTimeout(refreshFeedbackTimerRef.current);
      }
    };
  }, []);
  const resolvedCabinetId = cabinetId?.trim() || cabinetPath;
  const requestCabinetPath = cabinetId?.trim() ? cabinetPath : null;
  const reportingSnapshotsPath = buildCabinetReportingApiPath({
    cabinetId: resolvedCabinetId,
    cabinetPath: requestCabinetPath,
    resource: "reporting",
  });

  const refreshSnapshots = useCallback(async (source: "auto" | "manual" | "create" | "update" | "review-missing" | "review-stale" | "open-missing" | "open-stale" = "auto") => {
    setIsLoading(true);
    setRefreshActivityLabel(
      source === "manual"
        ? "Refreshing snapshots manually"
        : source === "create"
          ? "Refreshing snapshots after link create"
          : source === "update"
            ? "Refreshing snapshots after link update"
            : source === "review-missing"
              ? "Refreshing before missing review"
              : source === "review-stale"
                ? "Refreshing before stale review"
                : source === "open-missing"
                  ? "Refreshing and opening missing cabinet"
                  : source === "open-stale"
                    ? "Refreshing and opening stale cabinet"
                    : "Refreshing reporting snapshots"
    );

    try {
      const response = await fetch(reportingSnapshotsPath, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | {
            snapshots?: CabinetReportingSnapshotView[];
            scope?: ReportingScopeView | null;
            error?: string;
            code?: string;
          }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to load cabinet reporting");
        setErrorCode(payload?.code ?? null);
        setScope(null);
        return;
      }

      setSnapshots(payload?.snapshots ?? []);
      setScope(payload?.scope ?? null);
      setError(null);
      setErrorCode(null);
      setLastUpdatedAt(new Date().toISOString());
      const nextRefreshNotice =
        source === "manual"
          ? "Snapshots refreshed manually"
          : source === "create"
            ? "Snapshots synced after link create"
            : source === "update"
              ? "Snapshots synced after link update"
              : source === "review-missing"
                ? "Snapshots refreshed before missing review"
                : source === "review-stale"
                  ? "Snapshots refreshed before stale review"
                  : source === "open-missing"
                    ? "Snapshots refreshed before opening missing cabinet"
                    : source === "open-stale"
                      ? "Snapshots refreshed before opening stale cabinet"
                      : "Snapshots refreshed";
      setRefreshNotice(nextRefreshNotice);
      setDidJustRefresh(true);
      if (refreshFeedbackTimerRef.current) {
        clearTimeout(refreshFeedbackTimerRef.current);
      }
      refreshFeedbackTimerRef.current = setTimeout(() => {
        setDidJustRefresh(false);
        setRefreshNotice(null);
      }, 4_000);

      return nextRefreshNotice;
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load cabinet reporting",
      );
      setErrorCode(
        fetchError instanceof Error && "code" in fetchError
          ? String((fetchError as Error & { code?: unknown }).code ?? "")
          : null,
      );
      setScope(null);
    } finally {
      setIsLoading(false);
      setRefreshActivityLabel(null);
    }
  }, [reportingSnapshotsPath]);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots, refreshToken]);

  return {
    scope,
    snapshots,
    isLoading,
    error,
    errorCode,
    sortedSnapshots,
    staleSnapshotCount,
    lastUpdatedAt,
    didJustRefresh,
    refreshNotice,
    refreshActivityLabel,
    refreshSnapshots,
  };
}
