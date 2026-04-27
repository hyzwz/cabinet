import type { SlackMessage } from "@/types/agents";

// Keep Mission Control missing-alert counts strict and deterministic:
// only #alerts channel messages with type=alert and an explicit
// status/state/health field set to missing should be counted.
const MISSING_ALERT_PATTERNS = [
  /\bstatus\s*[:=-]\s*missing\b/i,
  /\bstate\s*[:=-]\s*missing\b/i,
  /\bhealth\s*[:=-]\s*missing\b/i,
];

export function isMissingAlertMessage(message: Partial<SlackMessage> | Record<string, unknown>): boolean {
  const channel = typeof message.channel === "string" ? message.channel.toLowerCase() : "";
  const type = typeof message.type === "string" ? message.type.toLowerCase() : "";
  const content = typeof message.content === "string" ? message.content.trim().toLowerCase() : "";

  if (channel !== "alerts" || type !== "alert") return false;

  return MISSING_ALERT_PATTERNS.some((pattern) => pattern.test(content));
}
