import { NextResponse } from "next/server";
import { providerRegistry } from "@/lib/agents/provider-registry";
import { getDaemonProviders } from "@/lib/agents/daemon-client";
import {
  ProviderSettingsConflictError,
  updateProviderSettingsWithMigrations,
} from "@/lib/agents/provider-management";

export async function GET() {
  try {
    return NextResponse.json(await getDaemonProviders());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const result = await updateProviderSettingsWithMigrations({
      defaultProvider:
        typeof body.defaultProvider === "string"
          ? body.defaultProvider
          : providerRegistry.defaultProvider,
      defaultModel:
        typeof body.defaultModel === "string"
          ? body.defaultModel
          : undefined,
      defaultEffort:
        typeof body.defaultEffort === "string"
          ? body.defaultEffort
          : undefined,
      disabledProviderIds: Array.isArray(body.disabledProviderIds)
        ? body.disabledProviderIds.filter((value: unknown): value is string => typeof value === "string")
        : [],
      migrations: Array.isArray(body.migrations)
        ? body.migrations.flatMap((value: unknown) => {
            if (!value || typeof value !== "object") return [];
            const migration = value as Record<string, unknown>;
            if (
              typeof migration.fromProviderId !== "string" ||
              typeof migration.toProviderId !== "string"
            ) {
              return [];
            }
            return [{
              fromProviderId: migration.fromProviderId,
              toProviderId: migration.toProviderId,
            }];
          })
        : [],
    });

    return NextResponse.json({
      ok: true,
      settings: result.settings,
      usage: result.usage,
      migrationsApplied: result.migrationsApplied,
    });
  } catch (error) {
    if (error instanceof ProviderSettingsConflictError) {
      return NextResponse.json({
        error: error.message,
        conflicts: error.conflicts,
      }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
