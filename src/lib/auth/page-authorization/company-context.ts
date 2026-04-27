import { type Actor, type CompanyContext, type CompanyMembershipProviderResult, type CompanyMembershipRef } from "../page-authorization";

export function normalizeCompanyMemberships(
  result: CompanyMembershipProviderResult,
): CompanyMembershipProviderResult {
  const memberships = result.memberships
    .map((membership) => ({
      companyId: membership.companyId.trim(),
      isDefault: membership.isDefault === true,
      role: typeof membership.role === "string" ? membership.role.trim() : undefined,
    }))
    .filter((membership) => membership.companyId.length > 0);

  const membershipCompanyIds = new Set(memberships.map((membership) => membership.companyId));
  let defaultCompanyId =
    typeof result.defaultCompanyId === "string" && result.defaultCompanyId.trim()
      ? result.defaultCompanyId.trim()
      : null;

  if (!defaultCompanyId) {
    defaultCompanyId = memberships.find((membership) => membership.isDefault)?.companyId ?? null;
  }

  if (defaultCompanyId && !membershipCompanyIds.has(defaultCompanyId)) {
    defaultCompanyId = null;
  }

  return {
    memberships,
    defaultCompanyId,
  };
}

function buildCompanyRoleIndex(memberships: CompanyMembershipRef[]): Record<string, string> {
  return memberships.reduce<Record<string, string>>((acc, membership) => {
    if (membership.role) {
      acc[membership.companyId] = membership.role;
    }
    return acc;
  }, {});
}

function buildCompanySelectionContext(input: {
  memberships: CompanyMembershipRef[];
  defaultCompanyId: string | null;
}): {
  membershipCompanyIds: string[];
  membershipRoleByCompanyId: Record<string, string>;
  membershipDefaultCompanyId: string | null;
} {
  return {
    membershipCompanyIds: input.memberships.map((membership) => membership.companyId),
    membershipRoleByCompanyId: buildCompanyRoleIndex(input.memberships),
    membershipDefaultCompanyId: input.defaultCompanyId,
  };
}

function buildCompanyContext(input: {
  companyId: string | null;
  source: CompanyContext["source"];
  requestCompanyId: string | null;
  workspaceCompanyId: string | null;
  membershipCompanyIds: string[];
  membershipDefaultCompanyId: string | null;
  membershipRoleByCompanyId: Record<string, string>;
  denyReason?: CompanyContext["denyReason"];
  denyMessage?: string;
}): CompanyContext {
  return {
    companyId: input.companyId,
    source: input.source,
    requestCompanyId: input.requestCompanyId,
    workspaceCompanyId: input.workspaceCompanyId,
    membershipCompanyIds: input.membershipCompanyIds,
    membershipDefaultCompanyId: input.membershipDefaultCompanyId,
    membershipRoleByCompanyId: input.membershipRoleByCompanyId,
    denyReason: input.denyReason,
    denyMessage: input.denyMessage,
  };
}

function buildCompanyMismatchContext(input: {
  requestCompanyId: string;
  workspaceCompanyId: string | null;
  membershipCompanyIds: string[];
  membershipDefaultCompanyId: string | null;
  membershipRoleByCompanyId: Record<string, string>;
}): CompanyContext {
  return buildCompanyContext({
    companyId: null,
    source: "none",
    requestCompanyId: input.requestCompanyId,
    workspaceCompanyId: input.workspaceCompanyId,
    membershipCompanyIds: input.membershipCompanyIds,
    membershipDefaultCompanyId: input.membershipDefaultCompanyId,
    membershipRoleByCompanyId: input.membershipRoleByCompanyId,
    denyReason: "company_mismatch",
    denyMessage: `Access denied — requested company ${input.requestCompanyId} is not part of the actor's memberships`,
  });
}

export function resolveActiveCompanySelection(input: {
  actor: Actor;
  requestCompanyId: string | null;
  workspaceCompanyId: string | null;
  membershipCompanyIds: string[];
  membershipDefaultCompanyId: string | null;
  membershipRoleByCompanyId: Record<string, string>;
}): CompanyContext {
  const membershipCompanyIdSet = new Set(input.membershipCompanyIds);

  if (input.requestCompanyId) {
    if (input.actor.kind === "anonymous") {
      return buildCompanyContext({
        companyId: input.requestCompanyId,
        source: "request",
        requestCompanyId: input.requestCompanyId,
        workspaceCompanyId: input.workspaceCompanyId,
        membershipCompanyIds: [],
        membershipDefaultCompanyId: null,
        membershipRoleByCompanyId: {},
      });
    }

    if (!membershipCompanyIdSet.has(input.requestCompanyId)) {
      return buildCompanyMismatchContext({
        requestCompanyId: input.requestCompanyId,
        workspaceCompanyId: input.workspaceCompanyId,
        membershipCompanyIds: input.membershipCompanyIds,
        membershipDefaultCompanyId: input.membershipDefaultCompanyId,
        membershipRoleByCompanyId: input.membershipRoleByCompanyId,
      });
    }

    return buildCompanyContext({
      companyId: input.requestCompanyId,
      source: "request",
      requestCompanyId: input.requestCompanyId,
      workspaceCompanyId: input.workspaceCompanyId,
      membershipCompanyIds: input.membershipCompanyIds,
      membershipDefaultCompanyId: input.membershipDefaultCompanyId,
      membershipRoleByCompanyId: input.membershipRoleByCompanyId,
    });
  }

  if (input.workspaceCompanyId) {
    if (
      input.actor.kind === "anonymous" ||
      membershipCompanyIdSet.has(input.workspaceCompanyId) ||
      (input.actor.kind === "user" &&
        (input.actor.role === "admin" || input.actor.systemRole === "platform_admin") &&
        input.membershipCompanyIds.length === 0)
    ) {
      return buildCompanyContext({
        companyId: input.workspaceCompanyId,
        source: "workspace_default",
        requestCompanyId: null,
        workspaceCompanyId: input.workspaceCompanyId,
        membershipCompanyIds: input.membershipCompanyIds,
        membershipDefaultCompanyId: input.membershipDefaultCompanyId,
        membershipRoleByCompanyId: input.membershipRoleByCompanyId,
      });
    }
  }

  if (input.membershipDefaultCompanyId) {
    return buildCompanyContext({
      companyId: input.membershipDefaultCompanyId,
      source: "membership_default",
      requestCompanyId: null,
      workspaceCompanyId: input.workspaceCompanyId,
      membershipCompanyIds: input.membershipCompanyIds,
      membershipDefaultCompanyId: input.membershipDefaultCompanyId,
      membershipRoleByCompanyId: input.membershipRoleByCompanyId,
    });
  }

  return buildCompanyContext({
    companyId: null,
    source: "none",
    requestCompanyId: null,
    workspaceCompanyId: input.workspaceCompanyId,
    membershipCompanyIds: input.membershipCompanyIds,
    membershipDefaultCompanyId: input.membershipDefaultCompanyId,
    membershipRoleByCompanyId: input.membershipRoleByCompanyId,
  });
}

export function buildResolvedCompanySelection(input: {
  actor: Actor;
  memberships: CompanyMembershipRef[];
  defaultCompanyId: string | null;
  requestCompanyId: string | null;
  workspaceCompanyId: string | null;
}): CompanyContext {
  return resolveActiveCompanySelection({
    actor: input.actor,
    requestCompanyId: input.requestCompanyId,
    workspaceCompanyId: input.workspaceCompanyId,
    ...buildCompanySelectionContext({
      memberships: input.memberships,
      defaultCompanyId: input.defaultCompanyId,
    }),
  });
}
