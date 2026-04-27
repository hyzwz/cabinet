import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";

const CONFIG_PATH = path.join(DATA_DIR, ".agents", ".config", "execution.json");

type ExecutionPolicyConfig = {
  allowDangerousCliFlags?: boolean;
};

function readExecutionPolicyConfig(): ExecutionPolicyConfig {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function allowDangerousCliFlags(): boolean {
  if (process.env.CABINET_DISABLE_DANGEROUS_CLI_FLAGS === "1") return false;
  if (process.env.CABINET_ALLOW_DANGEROUS_CLI_FLAGS === "0") return false;

  const config = readExecutionPolicyConfig();
  if (typeof config.allowDangerousCliFlags === "boolean") {
    return config.allowDangerousCliFlags;
  }

  return true;
}

export function dangerousCliArgs(args: string[]): string[] {
  return allowDangerousCliFlags() ? args : [];
}
