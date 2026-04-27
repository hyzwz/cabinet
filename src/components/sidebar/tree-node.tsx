"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Archive,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Trash2,
  FilePlus,
  Globe,
  Pencil,
  AppWindow,
  GitBranch,
  FileType,
  Table,
  Copy,
  ClipboardCopy,
  Link2,
  Link2Off,
  Code,
  Image,
  Video,
  Music,
  Workflow,
  File,
  Presentation,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeNode as TreeNodeType } from "@/types";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAppStore } from "@/stores/app-store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinkRepoDialog } from "./link-repo-dialog";
import { NewCabinetDialog } from "./new-cabinet-dialog";
import { getDataDir } from "@/lib/data-dir-cache";
import { useLocale } from "@/components/i18n/locale-provider";
import { slugify } from "@/lib/storage/slugify";

interface TreeNodeProps {
  node: TreeNodeType;
  depth: number;
  contextCabinetPath?: string | null;
}

const RENAME_ALLOWED_CHARACTERS = /^[\p{L}\p{N}_\- ]+$/u;

export type RenameValidationMessageKey =
  | "sidebar.renameEmpty"
  | "sidebar.renameInvalidPrompt"
  | "sidebar.renameUnchangedPrompt";

export function getRenameValidationMessage(params: {
  currentSlug: string;
  nextTitle: string;
  t: (key: RenameValidationMessageKey) => string;
}): string | null {
  const trimmed = params.nextTitle.trim();
  if (!trimmed) return params.t("sidebar.renameEmpty");

  const slug = slugify(trimmed);
  if (!slug || !RENAME_ALLOWED_CHARACTERS.test(trimmed)) {
    return params.t("sidebar.renameInvalidPrompt");
  }

  if (slug === params.currentSlug) {
    return params.t("sidebar.renameUnchangedPrompt");
  }

  return null;
}

export function RenameSuccessBadge({ message }: { message: string | null }) {
  if (!message) return null;
  return <span className="ml-auto truncate text-[11px] text-emerald-600">{message}</span>;
}

export function TreeNodeRenameForm({
  renameTitle,
  renameError,
  renameValidationError,
  renaming,
  onRenameTitleChange,
  onSubmit,
  onCancel,
}: {
  renameTitle: string;
  renameError: string | null;
  renameValidationError: string | null;
  renaming: boolean;
  onRenameTitleChange: (value: string) => void;
  onSubmit: (event?: React.FormEvent) => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLocale();

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input
        value={renameTitle}
        onChange={(event) => onRenameTitleChange(event.target.value)}
        autoFocus
      />
      {renameError ? (
        <p className="text-sm text-destructive">{renameError}</p>
      ) : renameValidationError ? (
        <p className="text-sm text-muted-foreground">
          {renameValidationError}
        </p>
      ) : null}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={renaming}
        >
          {t("sidebar.cancel")}
        </Button>
        <Button type="submit" disabled={renaming || !!renameValidationError}>
          {renaming ? t("sidebar.creating") : t("sidebar.rename")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TreeNodeRenameDialog(props: {
  open: boolean;
  renameTitle: string;
  renameError: string | null;
  renameValidationError: string | null;
  renaming: boolean;
  onOpenChange: (open: boolean) => void;
  onRenameTitleChange: (value: string) => void;
  onSubmit: (event?: React.FormEvent) => void | Promise<void>;
}) {
  const { t } = useLocale();

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sidebar.rename")}</DialogTitle>
          <DialogDescription>{t("sidebar.renameDescription")}</DialogDescription>
        </DialogHeader>
        <TreeNodeRenameForm
          renameTitle={props.renameTitle}
          renameError={props.renameError}
          renameValidationError={props.renameValidationError}
          renaming={props.renaming}
          onRenameTitleChange={props.onRenameTitleChange}
          onSubmit={props.onSubmit}
          onCancel={() => props.onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function TreeNode({
  node,
  depth,
  contextCabinetPath = null,
}: TreeNodeProps) {
  const {
    selectedPath,
    expandedPaths,
    dragOverPath,
    toggleExpand,
    selectPage,
    deletePage,
    movePage,
    setDragOver,
    createPage,
    renamePage,
  } = useTreeStore();
  const loadPage = useEditorStore((s) => s.loadPage);
  const setSection = useAppStore((s) => s.setSection);
  const [subPageOpen, setSubPageOpen] = useState(false);
  const [subPageTitle, setSubPageTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSuccess, setRenameSuccess] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkRepoOpen, setLinkRepoOpen] = useState(false);
  const [createCabinetOpen, setCreateCabinetOpen] = useState(false);
  const { t, format } = useLocale();

  const isSelected = selectedPath === node.path;
  const isDragOver = dragOverPath === node.path;
  const hasChildren = !!(node.children && node.children.length > 0);
  const isExpanded = hasChildren && expandedPaths.has(node.path);
  const title = node.frontmatter?.title || node.name;
  const currentSlug = useMemo(
    () => node.path.split("/").filter(Boolean).at(-1) ?? node.path,
    [node.path],
  );
  const renameValidationError = useMemo(
    () =>
      getRenameValidationMessage({
        currentSlug,
        nextTitle: renameTitle,
        t,
      }),
    [currentSlug, renameTitle, t],
  );

  const openRenameDialog = useCallback(() => {
    setRenameTitle(title);
    setRenameError(null);
    setRenameSuccess(null);
    setRenameOpen(true);
  }, [title]);

  const handleClick = () => {
    selectPage(node.path);
    if (node.type === "cabinet") {
      loadPage(node.path);
      setSection({
        type: "cabinet",
        mode: "cabinet",
        cabinetPath: node.path,
      });
      return;
    }

    if (node.type === "file" || node.type === "directory") {
      loadPage(node.path);
    }

    setSection(
      contextCabinetPath
        ? {
            type: "page",
            mode: "cabinet",
            cabinetPath: contextCabinetPath,
          }
        : { type: "page" }
    );
  };

  const handleDelete = () => {
    setDeleteOpen(true);
  };

  const handleCreateSubPage = async () => {
    if (!subPageTitle.trim()) return;
    setCreating(true);
    try {
      await createPage(node.path, subPageTitle.trim());
      const slug = slugify(subPageTitle);
      const nextPath = `${node.path}/${slug}`;
      selectPage(nextPath);
      loadPage(nextPath);
      setSection(
        contextCabinetPath
          ? {
              type: "page",
              mode: "cabinet",
              cabinetPath: contextCabinetPath,
            }
          : { type: "page" }
      );
      setSubPageTitle("");
      setSubPageOpen(false);
    } catch (error) {
      console.error("Failed to create sub page:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleRenameSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (renaming) return;
    if (renameValidationError) {
      setRenameError(renameValidationError);
      setRenameSuccess(null);
      return;
    }

    setRenaming(true);
    setRenameError(null);
    setRenameSuccess(null);
    try {
      await renamePage(node.path, renameTitle.trim());
      setRenameSuccess(t("sidebar.renameSuccess"));
      setRenameOpen(false);
    } catch (error) {
      setRenameError(
        error instanceof Error && error.message
          ? error.message
          : t("sidebar.failedRename"),
      );
    } finally {
      setRenaming(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", node.path);
      e.dataTransfer.effectAllowed = "move";
    },
    [node.path]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDragOver(node.path);
    },
    [node.path, setDragOver]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragOverPath === node.path) {
        setDragOver(null);
      }
    },
    [node.path, dragOverPath, setDragOver]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(null);

      const fromPath = e.dataTransfer.getData("text/plain");
      if (!fromPath || fromPath === node.path) return;

      // Don't drop onto own children
      if (fromPath.startsWith(node.path + "/")) return;

      // Drop onto this node's path (it becomes the parent)
      const isDir = node.type === "directory";
      const targetParent = isDir ? node.path : node.path.split("/").slice(0, -1).join("/");
      if (fromPath === targetParent) return;

      movePage(fromPath, targetParent);
    },
    [node.path, node.type, movePage, setDragOver]
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <button
            onClick={handleClick}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex items-center gap-1.5 w-full text-left py-1.5 px-2 text-[13px] rounded-md transition-colors",
              "hover:bg-accent/50 cursor-grab active:cursor-grabbing",
              isSelected && "bg-accent text-accent-foreground font-medium",
              isDragOver &&
                "bg-primary/10 ring-1 ring-primary/30 ring-inset"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {hasChildren ? (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.path);
                }}
                className="shrink-0 flex items-center justify-center w-3.5 h-3.5 rounded hover:bg-accent"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-150",
                    isExpanded && "rotate-90"
                  )}
                />
              </span>
            ) : (
              <span className="w-3.5" />
            )}
            {node.type === "csv" ? (
              <Table className="h-4 w-4 shrink-0 text-green-400" />
            ) : node.type === "pdf" ? (
              <FileType className="h-4 w-4 shrink-0 text-red-400" />
            ) : node.type === "app" ? (
              <AppWindow className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : node.type === "website" ? (
              <Globe className="h-4 w-4 shrink-0 text-blue-400" />
            ) : node.type === "code" ? (
              <Code className="h-4 w-4 shrink-0 text-violet-400" />
            ) : node.type === "image" ? (
              <Image className="h-4 w-4 shrink-0 text-pink-400" />
            ) : node.type === "video" ? (
              <Video className="h-4 w-4 shrink-0 text-cyan-400" />
            ) : node.type === "audio" ? (
              <Music className="h-4 w-4 shrink-0 text-amber-400" />
            ) : node.type === "mermaid" ? (
              <Workflow className="h-4 w-4 shrink-0 text-teal-400" />
            ) : node.type === "presentation" ? (
              <Presentation className="h-4 w-4 shrink-0 text-orange-400" />
            ) : node.type === "unknown" ? (
              <File className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            ) : node.type === "cabinet" ? (
              <Archive className="h-4 w-4 shrink-0 text-amber-400" />
            ) : node.hasRepo ? (
              <GitBranch className="h-4 w-4 shrink-0 text-orange-400" />
            ) : node.isLinked ? (
              <Link2 className="h-4 w-4 shrink-0 text-blue-400" />
            ) : hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
              )
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={cn("truncate", node.type === "unknown" && "opacity-50")}>{title}</span>
            <RenameSuccessBadge message={renameSuccess} />
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setSubPageOpen(true)}>
            <FilePlus className="h-4 w-4 mr-2" />
            {t("sidebar.addSubPage")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setLinkRepoOpen(true)}>
            <GitBranch className="h-4 w-4 mr-2" />
            {t("sidebar.loadKnowledge")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setCreateCabinetOpen(true)}>
            <Archive className="h-4 w-4 mr-2" />
            {t("sidebar.createCabinetHere")}
          </ContextMenuItem>
          <ContextMenuItem onClick={openRenameDialog}>
            <Pencil className="h-4 w-4 mr-2" />
            {t("sidebar.rename")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(node.path)}>
            <Copy className="h-4 w-4 mr-2" />
            {t("sidebar.copyRelativePath")}
          </ContextMenuItem>
          <ContextMenuItem onClick={async () => {
            const dir = await getDataDir();
            navigator.clipboard.writeText(`${dir}/${node.path}`);
          }}>
            <ClipboardCopy className="h-4 w-4 mr-2" />
            {t("sidebar.copyFullPath")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => {
            fetch("/api/system/open-data-dir", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subpath: node.path }),
            });
          }}>
            <FolderOpen className="h-4 w-4 mr-2" />
            {t("sidebar.openInFinder")}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} className="text-destructive">
            {node.isLinked ? (
              <Link2Off className="h-4 w-4 mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {node.isLinked ? t("sidebar.unlink") : t("sidebar.delete")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              contextCabinetPath={contextCabinetPath}
            />
          ))}
        </div>
      )}

      <Dialog open={subPageOpen} onOpenChange={setSubPageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {format("sidebar.addSubPageTo", { title })}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateSubPage();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder={t("sidebar.pageTitlePlaceholder")}
              value={subPageTitle}
              onChange={(e) => setSubPageTitle(e.target.value)}
              autoFocus
            />
            <Button type="submit" disabled={!subPageTitle.trim() || creating}>
              {creating ? t("sidebar.creating") : t("sidebar.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <TreeNodeRenameDialog
        open={renameOpen}
        renameTitle={renameTitle}
        renameError={renameError}
        renameValidationError={renameValidationError}
        renaming={renaming}
        onOpenChange={(open) => {
          setRenameOpen(open);
          if (open) {
            setRenameError(null);
            setRenameSuccess(null);
            setRenameTitle(title);
          }
        }}
        onRenameTitleChange={(value) => {
          setRenameTitle(value);
          if (renameError) setRenameError(null);
          if (renameSuccess) setRenameSuccess(null);
        }}
        onSubmit={handleRenameSubmit}
      />

      <LinkRepoDialog open={linkRepoOpen} onOpenChange={setLinkRepoOpen} parentPath={node.path} />

      <NewCabinetDialog
        open={createCabinetOpen}
        onOpenChange={setCreateCabinetOpen}
        parentPath={node.path}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                {node.isLinked
                  ? <Link2Off className="h-4 w-4 text-destructive" />
                  : <TriangleAlert className="h-4 w-4 text-destructive" />
                }
              </div>
              <div className="flex flex-col gap-1">
                <DialogTitle>
                  {node.isLinked
                    ? format("sidebar.unlinkTitle", { title })
                    : node.type === "cabinet"
                      ? format("sidebar.deleteCabinetTitle", { title })
                      : format("sidebar.deleteTitle", { title })
                  }
                </DialogTitle>
                <DialogDescription>
                  {node.isLinked
                    ? t("sidebar.unlinkDescription")
                    : node.type === "cabinet"
                      ? t("sidebar.deleteCabinetDescription")
                      : node.type === "directory"
                        ? t("sidebar.deleteDirectoryDescription")
                        : t("sidebar.deleteFileDescription")
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("sidebar.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deletePage(node.path);
                setDeleteOpen(false);
              }}
            >
              {node.isLinked ? t("sidebar.unlink") : t("sidebar.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
