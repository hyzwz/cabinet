import { NextResponse } from "next/server";
import { getDaemonProviderStatuses } from "@/lib/agents/daemon-client";

interface CachedStatus {
  providers: {
    id: string;
    name: string;
    available: boolean;
    authenticated: boolean;
  }[];
  anyReady: boolean;
}

let cachedResult: CachedStatus | null = null;
let cachedAt = 0;
const CACHE_TTL = 30_000;

function cacheKey(): string {
  return process.env.CABINET_DAEMON_URL || "";
}

let cachedDaemonUrl = cacheKey();

export async function GET() {
  try {
    const now = Date.now();
    const daemonUrl = cacheKey();
    if (daemonUrl !== cachedDaemonUrl) {
      cachedResult = null;
      cachedAt = 0;
      cachedDaemonUrl = daemonUrl;
    }

    if (cachedResult && now - cachedAt < CACHE_TTL) {
      return NextResponse.json(cachedResult);
    }

    const daemonStatus = await getDaemonProviderStatuses();
    const response: CachedStatus = {
      providers: daemonStatus.providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        available: provider.available,
        authenticated: provider.authenticated,
      })),
      anyReady: daemonStatus.anyReady,
    };

    cachedResult = response;
    cachedAt = now;

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
