import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import type { Dirent } from "fs";
import { CABINET_MANIFEST_FILE } from "@/lib/cabinets/files";
import { normalizeCabinetPath, ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { cabinetPathFromFs, findOwningCabinetPathForPage, resolveCabinetDir } from "@/lib/cabinets/server-paths";
import { resolveConfiguredCompanyId } from "@/lib/auth/company-id";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { listMembershipsForUser } from "@/lib/storage/company-io";
import type {
  Actor,
  CabinetMembershipProvider,
  CabinetMembershipProviderResult,
  CabinetMembershipRef,
  CabinetResourceMapping,
  CabinetResourceMappingProvider,
  CompanyMembershipProvider,
  CompanyMembershipProviderResult,
  CompanyMembershipRef,
  CompanyContext,
} from "@/lib/auth/page-authorization";

const CONFIG_DIR = path.join(DATA_DIR, ".agents", ".config");
const COMPANY_CONFIG_PATH = path.join(CONFIG_DIR, "company.json");
const MEMBERSHIPS_CONFIG_PATH = path.join(CONFIG_DIR, "memberships.json");

type StoredMembershipConfig = {
  defaultCompanyId?: string;
  users?: Record<
    string,
    {
      defaultCompanyId?: string;
      defaultCabinetId?: string;
      companies?: CompanyMembershipRef[];
      cabinets?: CabinetMembershipRef[];
    }
  >;
  cabinets?: Record<
    string,
    {
      companyId?: string;
      path?: string;
    }
  >;
};

type CabinetManifestRef = {
  cabinetId: string;
  companyId: string;
  path: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function actorFallbackCompanyRole(actor: Actor): "company_admin" | "company_member" | null {
  if (actor.kind !== "user") return null;
  return actor.role === "admin" || actor.systemRole === "platform_admin" ? "company_admin" : "company_member";
}

function actorFallbackCabinetRole(actor: Actor): CabinetMembershipRef["role"] | null {
  if (actor.kind !== "user") return null;
  if (actor.role === "admin" || actor.systemRole === "platform_admin") return "cabinet_admin";
  if (actor.role === "viewer") return "cabinet_viewer";
  return "cabinet_editor";
}

async function readWorkspaceCompanyId(): Promise<string> {
  const configured = await readJsonFile<Record<string, unknown>>(COMPANY_CONFIG_PATH);
  const companyId = configured ? resolveConfiguredCompanyId(configured) : null;
  if (companyId) return companyId;

  const rootManifest = await readCabinetManifestFields(ROOT_CABINET_PATH);
  return (
    resolveConfiguredCompanyId({ company: { name: rootManifest.name ?? undefined } }) ||
    rootManifest.id ||
    "default-company"
  );
}

async function readMembershipConfig(): Promise<StoredMembershipConfig | null> {
  const parsed = await readJsonFile<StoredMembershipConfig>(MEMBERSHIPS_CONFIG_PATH);
  return isRecord(parsed) ? parsed : null;
}

async function readCabinetManifestFields(cabinetPath: string): Promise<{
  id: string | null;
  name: string | null;
}> {
  const normalizedPath = normalizeCabinetPath(cabinetPath, true) || ROOT_CABINET_PATH;
  const dir = resolveCabinetDir(normalizedPath);
  try {
    const raw = await fs.readFile(path.join(dir, CABINET_MANIFEST_FILE), "utf-8");
    const parsed = yaml.load(raw);
    if (!isRecord(parsed)) return { id: null, name: null };
    return {
      id: typeof parsed.id === "string" && parsed.id.trim() ? parsed.id.trim() : null,
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : null,
    };
  } catch {
    return { id: null, name: null };
  }
}

async function readCabinetManifestId(cabinetPath: string): Promise<string | null> {
  return (await readCabinetManifestFields(cabinetPath)).id;
}

async function readCabinetManifest(cabinetPath: string): Promise<CabinetManifestRef | null> {
  const normalizedPath = normalizeCabinetPath(cabinetPath, true) || ROOT_CABINET_PATH;
  const manifestId = await readCabinetManifestId(normalizedPath);
  if (!manifestId && normalizedPath !== ROOT_CABINET_PATH) {
    return null;
  }

  return {
    cabinetId: manifestId || "root",
    companyId: await readWorkspaceCompanyId(),
    path: normalizedPath,
  };
}

async function discoverCabinets(): Promise<CabinetManifestRef[]> {
  const results: CabinetManifestRef[] = [];

  async function visit(dir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const manifestPath = path.join(dir, CABINET_MANIFEST_FILE);
    try {
      await fs.access(manifestPath);
      const cabinetPath = cabinetPathFromFs(dir);
      const manifest = await readCabinetManifest(cabinetPath);
      if (manifest) results.push(manifest);
    } catch {
      // No manifest at this level.
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      await visit(path.join(dir, entry.name));
    }
  }

  await visit(DATA_DIR);
  return results;
}

function findStoredUserConfig(config: StoredMembershipConfig | null, actor: Actor) {
  if (actor.kind !== "user" || !config?.users) return null;
  return config.users[actor.userId] || config.users[actor.username] || null;
}

function normalizeCompanyMembership(value: CompanyMembershipRef): CompanyMembershipRef | null {
  const companyId = typeof value.companyId === "string" ? value.companyId.trim() : "";
  if (!companyId) return null;
  return {
    companyId,
    isDefault: value.isDefault === true,
    role: typeof value.role === "string" && value.role.trim() ? value.role.trim() : undefined,
  };
}

function normalizeCabinetMembership(value: CabinetMembershipRef): CabinetMembershipRef | null {
  const cabinetId = typeof value.cabinetId === "string" ? value.cabinetId.trim() : "";
  const companyId = typeof value.companyId === "string" ? value.companyId.trim() : "";
  if (!cabinetId || !companyId) return null;
  const role = value.role === "cabinet_admin" || value.role === "cabinet_editor" || value.role === "cabinet_viewer"
    ? value.role
    : "cabinet_viewer";
  return {
    cabinetId,
    companyId,
    role,
    isDefault: value.isDefault === true,
  };
}

export const fileCompanyMembershipProvider: CompanyMembershipProvider = {
  async getMemberships(actor): Promise<CompanyMembershipProviderResult> {
    if (actor.kind === "anonymous") {
      return { memberships: [], defaultCompanyId: null };
    }

    const config = await readMembershipConfig();
    const stateMemberships = await listMembershipsForUser(actor.userId);
    const activeStateMemberships = stateMemberships
      .filter((membership) => membership.status === "active")
      .map((membership) => ({
        companyId: membership.companyId,
        role: membership.role,
        isDefault: false,
      }));
    if (activeStateMemberships.length > 0) {
      activeStateMemberships[0] = { ...activeStateMemberships[0]!, isDefault: true };
      return {
        memberships: activeStateMemberships,
        defaultCompanyId: activeStateMemberships[0]?.companyId ?? null,
      };
    }

    const userConfig = findStoredUserConfig(config, actor);
    const configured = userConfig?.companies
      ?.map(normalizeCompanyMembership)
      .filter((value): value is CompanyMembershipRef => Boolean(value)) ?? [];

    if (configured.length > 0) {
      return {
        memberships: configured,
        defaultCompanyId: userConfig?.defaultCompanyId || config?.defaultCompanyId || null,
      };
    }

    const companyId = config?.defaultCompanyId || await readWorkspaceCompanyId();
    const role = actorFallbackCompanyRole(actor);
    return {
      memberships: role ? [{ companyId, role, isDefault: true }] : [],
      defaultCompanyId: companyId,
    };
  },
};

export const fileCabinetMembershipProvider: CabinetMembershipProvider = {
  async getMemberships(actor, companyContext: CompanyContext): Promise<CabinetMembershipProviderResult> {
    if (actor.kind === "anonymous") {
      return { memberships: [], defaultCabinetId: null };
    }

    const config = await readMembershipConfig();
    const userConfig = findStoredUserConfig(config, actor);
    const configured = userConfig?.cabinets
      ?.map(normalizeCabinetMembership)
      .filter((value): value is CabinetMembershipRef => Boolean(value)) ?? [];

    if (configured.length > 0) {
      return {
        memberships: configured,
        defaultCabinetId: userConfig?.defaultCabinetId || null,
      };
    }

    const fallbackRole = actorFallbackCabinetRole(actor);
    if (!fallbackRole) {
      return { memberships: [], defaultCabinetId: null };
    }

    const fallbackCompanyId = companyContext.companyId || await readWorkspaceCompanyId();
    const cabinets = await discoverCabinets();
    const memberships = cabinets.map((cabinet) => ({
      cabinetId: cabinet.cabinetId,
      companyId: cabinet.companyId || fallbackCompanyId,
      role: fallbackRole,
      isDefault: cabinet.path === ROOT_CABINET_PATH,
    }));

    return {
      memberships,
      defaultCabinetId: memberships.find((membership) => membership.isDefault)?.cabinetId ?? memberships[0]?.cabinetId ?? null,
    };
  },
};

export const fileCabinetResourceMappingProvider: CabinetResourceMappingProvider = {
  async resolveCabinetForPage(virtualPath: string): Promise<CabinetResourceMapping | null> {
    const owningPath = await findOwningCabinetPathForPage(virtualPath).catch(() => ROOT_CABINET_PATH);
    const manifest = await readCabinetManifest(owningPath);
    if (!manifest) return null;

    const config = await readMembershipConfig();
    const stored = config?.cabinets?.[manifest.cabinetId];
    const companyId = stored?.companyId?.trim() || manifest.companyId;
    if (!companyId) return null;

    return {
      cabinetId: manifest.cabinetId,
      companyId,
    };
  },
};
