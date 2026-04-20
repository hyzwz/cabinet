"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, Reply, Trash2, Check, X } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { useLocale } from "@/components/i18n/locale-provider";

interface Comment {
  id: string;
  page_path: string;
  author_id: string;
  author_name: string;
  content: string;
  parent_id: string | null;
  created_at: number;
  updated_at: number | null;
  resolved_at: number | null;
  replies?: Comment[];
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  onResolve,
  isReply = false,
}: {
  comment: Comment;
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string, resolved: boolean) => void;
  isReply?: boolean;
}) {
  return (
    <div
      className={`group ${isReply ? "ml-6 pl-3 border-l-2 border-border" : ""}`}
    >
      <div className="flex items-start gap-2 py-2">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
          {comment.author_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium truncate">
              {comment.author_name}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {timeAgo(comment.created_at)}
            </span>
            {comment.resolved_at && (
              <span className="text-[10px] text-green-500 font-medium">
                ✓ Resolved
              </span>
            )}
          </div>
          <p className="text-[13px] text-foreground/80 mt-0.5 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
              >
                <Reply className="h-3 w-3" />
                Reply
              </button>
            )}
            {!isReply && (
              <button
                onClick={() => onResolve(comment.id, !comment.resolved_at)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
              >
                {comment.resolved_at ? (
                  <X className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                {comment.resolved_at ? "Unresolve" : "Resolve"}
              </button>
            )}
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommentPanel() {
  const { currentPath } = useEditorStore();
  const { t } = useLocale();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!currentPath) return;
    try {
      const res = await fetch(`/api/comments/${currentPath}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // Silent fail
    }
  }, [currentPath]);

  useEffect(() => {
    if (isOpen && currentPath) {
      fetchComments();
    }
  }, [isOpen, currentPath, fetchComments]);

  // Refresh every 30s when panel is open
  useEffect(() => {
    if (!isOpen || !currentPath) return;
    const timer = setInterval(fetchComments, 30_000);
    return () => clearInterval(timer);
  }, [isOpen, currentPath, fetchComments]);

  const handleSubmit = async () => {
    if (!currentPath || !newComment.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${currentPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          parentId: replyTo,
        }),
      });
      if (res.ok) {
        setNewComment("");
        setReplyTo(null);
        await fetchComments();
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentPath) return;
    try {
      const res = await fetch(`/api/comments/${currentPath}?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchComments();
      }
    } catch {
      // Silent fail
    }
  };

  const handleResolve = async (id: string, resolved: boolean) => {
    if (!currentPath) return;
    try {
      const res = await fetch(`/api/comments/${currentPath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolved }),
      });
      if (res.ok) {
        await fetchComments();
      }
    } catch {
      // Silent fail
    }
  };

  if (!currentPath) return null;

  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length || 0),
    0
  );

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1 text-[11px] rounded-md transition-colors border border-border text-muted-foreground hover:bg-accent"
      >
        <MessageSquare className="h-3 w-3" />
        {t("editor.comments")}
        {totalCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
            {totalCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed right-0 top-0 h-full w-80 bg-background border-l border-border shadow-lg z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium">
              {t("editor.comments")}
              {totalCount > 0 && (
                <span className="ml-1.5 text-muted-foreground font-normal">
                  ({totalCount})
                </span>
              )}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {comments.length === 0 ? (
              <div className="text-center text-muted-foreground text-[13px] py-8">
                {t("editor.noComments")}
              </div>
            ) : (
              comments.map((thread) => (
                <div
                  key={thread.id}
                  className="border-b border-border/50 last:border-0 pb-2 mb-2"
                >
                  <CommentItem
                    comment={thread}
                    onReply={setReplyTo}
                    onDelete={handleDelete}
                    onResolve={handleResolve}
                  />
                  {thread.replies?.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      onReply={setReplyTo}
                      onDelete={handleDelete}
                      onResolve={handleResolve}
                      isReply
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border px-3 py-3">
            {replyTo && (
              <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground">
                <Reply className="h-3 w-3" />
                <span>{t("editor.replyingTo")}</span>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSubmit();
                  }
                }}
                placeholder={t("editor.commentPlaceholder")}
                className="flex-1 resize-none text-[13px] bg-accent/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 min-h-[60px]"
                rows={2}
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || loading}
                className="self-end p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
