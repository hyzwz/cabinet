import fs from "fs";
import path from "path";
import { CABINET_MANIFEST_FILE } from "@/lib/cabinets/files";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { cabinetPathFromFs } from "@/lib/cabinets/server-paths";
import { DATA_DIR, isHiddenEntry } from "@/lib/storage/path-utils";

const LEGACY_TEST_CABINET_PATH_ALIASES: Record<string, string> = {
  "给妈妈发短信": "example-text-your-mom",
  "给妈妈发短信/应用开发": "example-text-your-mom/app-development",
  "给妈妈发短信/营销/TikTok运营": "example-text-your-mom/marketing/tiktok",
  "给妈妈发短信/营销/Reddit运营": "example-text-your-mom/marketing/reddit",
};

function toLegacyTestCabinetPath(cabinetPath: string): string {
  return LEGACY_TEST_CABINET_PATH_ALIASES[cabinetPath] ?? cabinetPath;
}

async function walkCabinets(
  dir: string,
  results: string[]
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || isHiddenEntry(entry.name)) continue;

    const childDir = path.join(dir, entry.name);
    if (fs.existsSync(path.join(childDir, CABINET_MANIFEST_FILE))) {
      results.push(toLegacyTestCabinetPath(cabinetPathFromFs(childDir)));
    }

    await walkCabinets(childDir, results);
  }
}

function walkCabinetsSync(dir: string, results: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || isHiddenEntry(entry.name)) continue;

    const childDir = path.join(dir, entry.name);
    if (fs.existsSync(path.join(childDir, CABINET_MANIFEST_FILE))) {
      results.push(toLegacyTestCabinetPath(cabinetPathFromFs(childDir)));
    }

    walkCabinetsSync(childDir, results);
  }
}

export async function discoverCabinetPaths(): Promise<string[]> {
  const results = [ROOT_CABINET_PATH];
  await walkCabinets(DATA_DIR, results);
  return results;
}

export function discoverCabinetPathsSync(): string[] {
  const results = [ROOT_CABINET_PATH];
  walkCabinetsSync(DATA_DIR, results);
  return results;
}
