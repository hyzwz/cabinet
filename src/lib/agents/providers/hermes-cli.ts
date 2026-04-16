import { execSync } from "child_process";
import type { AgentProvider, ProviderStatus } from "../provider-interface";
import { checkCliProviderAvailable, resolveCliCommand, RUNTIME_PATH } from "../provider-cli";

const HOME = process.env.HOME || "";

export const hermesCliProvider: AgentProvider = {
  id: "hermes-cli",
  name: "Hermes Agent",
  type: "cli",
  icon: "brain",
  installMessage:
    "Hermes Agent not found. Install from: https://github.com/NousResearch/hermes-agent",
  installSteps: [
    {
      title: "Install Hermes Agent",
      detail: "Follow the setup guide at https://github.com/NousResearch/hermes-agent",
      link: {
        label: "Hermes Agent GitHub",
        url: "https://github.com/NousResearch/hermes-agent",
      },
    },
    {
      title: "Configure API key",
      detail: "Run hermes setup and configure your inference provider (OpenRouter, OpenAI, etc.)",
    },
  ],
  detachedPromptLaunchMode: "one-shot",
  models: [
    { id: "gpt-5.4", name: "GPT-5.4", description: "OpenAI flagship" },
    { id: "o3", name: "o3", description: "Most capable reasoning" },
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", description: "Fast and capable" },
    { id: "anthropic/claude-opus-4", name: "Claude Opus 4", description: "Most intelligent" },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Google flagship" },
  ],
  command: "hermes",
  commandCandidates: [
    `${HOME}/.hermes/bin/hermes`,
    `${HOME}/.local/bin/hermes`,
    `${HOME}/MeishuSourceCode/hermes-agent/.venv/bin/hermes`,
    "/usr/local/bin/hermes",
    "/opt/homebrew/bin/hermes",
    "hermes",
  ],

  buildArgs(prompt: string, _workdir: string): string[] {
    return ["chat", "--yolo", "-q", prompt];
  },

  buildOneShotInvocation(prompt: string, workdir: string) {
    return {
      command: this.command || "hermes",
      args: this.buildArgs ? this.buildArgs(prompt, workdir) : [],
    };
  },

  buildSessionInvocation(prompt: string | undefined, _workdir: string) {
    if (prompt?.trim()) {
      return {
        command: this.command || "hermes",
        args: ["chat", "--yolo", "-q", prompt.trim()],
      };
    }
    return {
      command: this.command || "hermes",
      args: ["chat", "--yolo"],
    };
  },

  async isAvailable(): Promise<boolean> {
    return checkCliProviderAvailable(this);
  },

  async healthCheck(): Promise<ProviderStatus> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          available: false,
          authenticated: false,
          error: this.installMessage,
        };
      }

      try {
        const cmd = resolveCliCommand(this);
        const output = execSync(`${cmd} status 2>&1`, {
          encoding: "utf8",
          env: { ...process.env, PATH: RUNTIME_PATH },
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 10000,
        });

        // Parse status output for API key presence
        const hasKey = /✓/.test(output) && /API Keys/i.test(output);

        // Get version from --version output
        let version: string | undefined;
        try {
          const verOut = execSync(`${cmd} --version 2>&1`, {
            encoding: "utf8",
            env: { ...process.env, PATH: RUNTIME_PATH },
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 5000,
          });
          const m = verOut.match(/Hermes Agent v([\d.]+)/);
          if (m) version = `v${m[1]}`;
        } catch { /* ignore */ }

        if (hasKey) {
          return {
            available: true,
            authenticated: true,
            version,
          };
        }

        return {
          available: true,
          authenticated: false,
          version,
          error: "Hermes is installed but no API keys configured. Run: hermes setup",
        };
      } catch {
        return {
          available: true,
          authenticated: false,
          error: "Could not verify Hermes status. Run: hermes setup",
        };
      }
    } catch (error) {
      return {
        available: false,
        authenticated: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
