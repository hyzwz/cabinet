"use client";

import { type Editor } from "@tiptap/react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  FileCode,
  CheckSquare,
  PilcrowRight,
  PilcrowLeft,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { useLocale } from "@/components/i18n/locale-provider";

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const frontmatter = useEditorStore((s) => s.frontmatter);
  const updateFrontmatter = useEditorStore((s) => s.updateFrontmatter);
  const isRtl = frontmatter?.dir === "rtl";
  const { t } = useLocale();

  if (!editor) return null;

  const items = [
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
      label: t("editor.heading1"),
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
      label: t("editor.heading2"),
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
      label: t("editor.heading3"),
    },
    { separator: true },
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
      label: t("editor.bold"),
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
      label: t("editor.italic"),
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive("strike"),
      label: t("editor.strikethrough"),
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive("code"),
      label: t("editor.inlineCode"),
    },
    { separator: true },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
      label: t("editor.bulletList"),
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
      label: t("editor.orderedList"),
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive("blockquote"),
      label: t("editor.blockquote"),
    },
    {
      icon: CheckSquare,
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive("taskList"),
      label: t("editor.checklist"),
    },
    {
      icon: FileCode,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive("codeBlock"),
      label: t("editor.codeBlock"),
    },
    {
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: false,
      label: t("editor.divider"),
    },
    { separator: true },
    {
      icon: Undo,
      action: () => editor.chain().focus().undo().run(),
      isActive: false,
      label: t("editor.undo"),
    },
    {
      icon: Redo,
      action: () => editor.chain().focus().redo().run(),
      isActive: false,
      label: t("editor.redo"),
    },
    { separator: true },
    {
      icon: isRtl ? PilcrowLeft : PilcrowRight,
      action: () => updateFrontmatter({ dir: isRtl ? undefined : "rtl" }),
      isActive: isRtl,
      label: isRtl ? t("editor.switchToLtr") : t("editor.switchToRtl"),
    },
  ];

  return (
    <div className="flex items-center gap-0.5 border-b border-border px-2 py-1 bg-background/50 overflow-x-auto scrollbar-none">
      {items.map((item, i) => {
        if ("separator" in item) {
          return (
            <Separator key={i} orientation="vertical" className="mx-1 h-6" />
          );
        }
        const Icon = item.icon;
        return (
          <Toggle
            key={i}
            size="sm"
            pressed={item.isActive}
            onPressedChange={() => item.action()}
            aria-label={item.label}
            className="h-8 w-8 p-0"
          >
            <Icon className="h-4 w-4" />
          </Toggle>
        );
      })}
    </div>
  );
}
