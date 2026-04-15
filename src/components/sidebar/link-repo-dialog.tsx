"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, FolderOpen, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@/types";
import { useLocale } from "@/components/i18n/locale-provider";

interface LinkRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPath?: string;
}

function basenameForPath(value: string): string {
  const normalized = value.trim().replace(/[\\/]+$/, "");
  if (!normalized) return "";
  const parts = normalized.split(/[\\/]/);
  return parts[parts.length - 1] || "";
}

function findNode(nodes: TreeNode[], targetPath: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const found = findNode(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

export function LinkRepoDialog({ open, onOpenChange, parentPath }: LinkRepoDialogProps) {
  const loadTree = useTreeStore((s) => s.loadTree);
  const selectPage = useTreeStore((s) => s.selectPage);
  const nodes = useTreeStore((s) => s.nodes);
  const loadPage = useEditorStore((s) => s.loadPage);

  const [localPath, setLocalPath] = useState("");
  const [name, setName] = useState("");
  const [remote, setRemote] = useState("");
  const [description, setDescription] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [devExpanded, setDevExpanded] = useState(false);
  const { t } = useLocale();

  // Warn if the parent directory already has children beyond index.md
  const parentHasContent = useMemo(() => {
    if (!parentPath) return false;
    const parentNode = findNode(nodes, parentPath);
    return !!(parentNode?.children && parentNode.children.length > 0);
  }, [parentPath, nodes]);

  useEffect(() => {
    if (!open) {
      setLocalPath("");
      setName("");
      setRemote("");
      setDescription("");
      setBrowsing(false);
      setCreating(false);
      setError("");
      setDevExpanded(false);
    }
  }, [open]);

  async function handleBrowse() {
    setBrowsing(true);
    setError("");

    try {
      const res = await fetch("/api/system/pick-directory", {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || t("sidebar.failedOpenFolderPicker"));
      }

      if (data?.cancelled || !data?.path) {
        return;
      }

      setLocalPath(data.path);
      setName((current) => current || basenameForPath(data.path));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t("sidebar.failedOpenFolderPicker")
      );
    } finally {
      setBrowsing(false);
    }
  }

  async function handleCreate() {
    if (!localPath.trim()) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/system/link-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          localPath: localPath.trim(),
          name: name.trim() || basenameForPath(localPath),
          remote: remote.trim() || undefined,
          description: description.trim() || undefined,
          parentPath: parentPath || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || t("sidebar.failedLoadKnowledge"));
      }

      await loadTree();
      selectPage(data.path);
      await loadPage(data.path);
      onOpenChange(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t("sidebar.failedLoadKnowledge")
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("sidebar.loadKnowledge")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-xs text-muted-foreground">
{t("sidebar.folderHelper")}
          </p>

          {parentHasContent && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
              <TriangleAlert className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
              <p className="text-xs text-yellow-500">
                {t("sidebar.folderExistingContentWarning")}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t("sidebar.folder")}
            </label>
            <div className="flex gap-2">
              <Input
                placeholder={t("sidebar.folderPathPlaceholder")}
                value={localPath}
                onChange={(event) => setLocalPath(event.target.value)}
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleBrowse()}
                disabled={browsing || creating}
              >
                {browsing ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FolderOpen data-icon="inline-start" />
                )}
                {t("sidebar.browse")}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t("sidebar.name")}
            </label>
            <Input
              placeholder={basenameForPath(localPath) || t("sidebar.folderNamePlaceholder")}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          {/* ── For Developers ─────────────────────────────── */}
          <div className="border border-border rounded-md">
            <button
              type="button"
              onClick={() => setDevExpanded(!devExpanded)}
              className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 transition-transform duration-150",
                  devExpanded && "rotate-90"
                )}
              />
              {t("sidebar.forDevelopers")}
            </button>
            {devExpanded && (
              <div className="flex flex-col gap-3 px-3 pb-3">
                <p className="text-xs text-muted-foreground">
                  {t("sidebar.forDevelopersHelp")}
                </p>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("sidebar.remoteUrl")}
                  </label>
                  <Input
                    placeholder={t("sidebar.remoteUrlPlaceholder")}
                    value={remote}
                    onChange={(event) => setRemote(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("sidebar.description")}
                  </label>
                  <Input
                    placeholder={t("sidebar.descriptionPlaceholder")}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              {t("sidebar.cancel")}
            </Button>
            <Button type="submit" disabled={!localPath.trim() || creating}>
              {creating ? t("sidebar.loading") : t("sidebar.load")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
