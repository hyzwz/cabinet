"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  "Brainstorm ideas",
  "Map user journey",
  "Plan roadmap",
  "Create research plan",
  "Create requirements doc",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const setSection = useAppStore((s) => s.setSection);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.company?.name) {
          setUserName(data.company.name);
        }
      })
      .catch(() => {});
  }, []);

  const submitPrompt = async (text: string) => {
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/agents/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentSlug: "general",
          userMessage: text.trim(),
          mentionedPaths: [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPrompt("");
        setSection({
          type: "agent",
          slug: "general",
          conversationId: data.conversation?.id,
        });
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPrompt(prompt);
  };

  const greeting = getGreeting();
  const displayName = userName || "there";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-center text-foreground tracking-tight">
          {greeting}, {displayName}.<br />
          What are we working on today?
        </h1>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="I want to create..."
            disabled={submitting}
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-3 pr-12",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "shadow-sm"
            )}
            autoFocus
          />
          <button
            type="submit"
            disabled={!prompt.trim() || submitting}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2",
              "h-8 w-8 rounded-lg flex items-center justify-center",
              "transition-colors",
              prompt.trim() && !submitting
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => submitPrompt(action)}
              disabled={submitting}
              className={cn(
                "rounded-full border border-border px-4 py-1.5",
                "text-sm text-foreground/80",
                "hover:bg-accent hover:text-accent-foreground",
                "transition-colors",
                submitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
