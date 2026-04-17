"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { slugify } from "@/lib/storage/path-utils";
import { useLocale } from "@/components/i18n/locale-provider";

export function NewPageDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const { createPage } = useTreeStore();
  const { loadPage } = useEditorStore();
  const { t } = useLocale();

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      // Create at root level or under the currently selected directory
      const parentPath = "";
      await createPage(parentPath, title.trim());
      const slug = slugify(title);
      loadPage(slug);
      setTitle("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to create page:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        data-new-page-trigger
        className="flex items-center gap-1.5 w-full text-xs px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer whitespace-nowrap"
      >
        <Plus className="h-4 w-4" />
        {t("sidebar.newPage")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sidebar.createNewPage")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder={t("sidebar.pageTitlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={!title.trim() || creating}>
            {creating ? t("sidebar.creating") : t("sidebar.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
