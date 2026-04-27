import {
  type Actor,
  type CabinetContext,
  type CabinetMembershipProviderResult,
  type CabinetMembershipRef,
  type CabinetRole,
  type CompanyContext,
} from "../page-authorization";

export function normalizeCabinetMemberships(
  result: CabinetMembershipProviderResult,
): CabinetMembershipProviderResult {
  const memberships = result.memberships
    .map((membership) => ({
      cabinetId: membership.cabinetId.trim(),
      companyId: membership.companyId.trim(),
      role: membership.role,
      isDefault: membership.isDefault === true,
    }))
    .filter((membership) => membership.cabinetId.length > 0 && membership.companyId.length > 0);

  const membershipCabinetIds = new Set(memberships.map((membership) => membership.cabinetId));
  let defaultCabinetId =
    typeof result.defaultCabinetId === "string" && result.defaultCabinetId.trim()
      ? result.defaultCabinetId.trim()
      : null;

  if (!defaultCabinetId) {
    defaultCabinetId = memberships.find((membership) => membership.isDefault)?.cabinetId ?? null;
  }

  if (defaultCabinetId && !membershipCabinetIds.has(defaultCabinetId)) {
    defaultCabinetId = null;
  }

  return {
    memberships,
    defaultCabinetId,
  };
}

function buildCabinetRoleIndex(memberships: CabinetMembershipRef[]): Record<string, CabinetRole> {
  return memberships.reduce<Record<string, CabinetRole>>((acc, membership) => {
    acc[membership.cabinetId] = membership.role;
    return acc;
  }, {});
}

function buildCabinetSelectionContext(input: {
  memberships: CabinetMembershipRef[];
  defaultCabinetId: string | null;
  companyId: string | null;
}): {
  membershipCabinetIds: string[];
  membershipCabinetIdSet: Set<string>;
  membershipDefaultCabinetId: string | null;
  roleByCabinetId: Record<string, CabinetRole>;
} {
  const filteredMemberships = input.companyId
    ? input.memberships.filter((membership) => membership.companyId === input.companyId)
    : input.memberships;
  const membershipCabinetIds = filteredMemberships.map((membership) => membership.cabinetId);
  const membershipCabinetIdSet = new Set(membershipCabinetIds);
  const membershipDefaultCabinetId =
    input.defaultCabinetId && membershipCabinetIdSet.has(input.defaultCabinetId) ? input.defaultCabinetId : null;

  return {
    membershipCabinetIds,
    membershipCabinetIdSet,
    membershipDefaultCabinetId,
    roleByCabinetId: buildCabinetRoleIndex(filteredMemberships),
  };
}

function buildCabinetContext(input: {
  cabinetId: string | null;
  companyId: string | null;
  source: CabinetContext["source"];
  requestCabinetId: string | null;
  membershipCabinetIds: string[];
  membershipDefaultCabinetId: string | null;
  roleByCabinetId: Record<string, CabinetRole>;
  resourceCabinetId: string | null;
  denyReason?: CabinetContext["denyReason"];
  denyMessage?: string;
}): CabinetContext {
  return {
    cabinetId: input.cabinetId,
    companyId: input.companyId,
    source: input.source,
    requestCabinetId: input.requestCabinetId,
    membershipCabinetIds: input.membershipCabinetIds,
    membershipDefaultCabinetId: input.membershipDefaultCabinetId,
    roleByCabinetId: input.roleByCabinetId,
    resourceCabinetId: input.resourceCabinetId,
    denyReason: input.denyReason,
    denyMessage: input.denyMessage,
  };
}

function buildCabinetMismatchContext(input: {
  requestCabinetId: string;
  companyId: string | null;
  membershipCabinetIds: string[];
  membershipDefaultCabinetId: string | null;
  roleByCabinetId: Record<string, CabinetRole>;
  resourceCabinetId?: string | null;
}): CabinetContext {
  return buildCabinetContext({
    cabinetId: null,
    companyId: input.companyId,
    source: "none",
    requestCabinetId: input.requestCabinetId,
    membershipCabinetIds: input.membershipCabinetIds,
    membershipDefaultCabinetId: input.membershipDefaultCabinetId,
    roleByCabinetId: input.roleByCabinetId,
    resourceCabinetId: input.resourceCabinetId ?? null,
    denyReason: "cabinet_mismatch",
    denyMessage: `Access denied — requested cabinet ${input.requestCabinetId} is not part of the actor's memberships`,
  });
}

export function buildCabinetContextForResource(input: {
  companyId: string | null;
  resourceCabinetId: string | null;
  memberships: CabinetMembershipRef[];
  defaultCabinetId: string | null;
}): CabinetContext {
  const selectionContext = buildCabinetSelectionContext({
    memberships: input.memberships,
    defaultCabinetId: input.defaultCabinetId,
    companyId: input.companyId,
  });

  if (!input.resourceCabinetId) {
    return buildCabinetContext({
      cabinetId: null,
      companyId: input.companyId,
      source: "none",
      requestCabinetId: null,
      membershipCabinetIds: selectionContext.membershipCabinetIds,
      membershipDefaultCabinetId: selectionContext.membershipDefaultCabinetId,
      roleByCabinetId: selectionContext.roleByCabinetId,
      resourceCabinetId: null,
    });
  }

  return buildCabinetContext({
    cabinetId: input.resourceCabinetId,
    companyId: input.companyId,
    source: "resource_mapping",
    requestCabinetId: null,
    membershipCabinetIds: selectionContext.membershipCabinetIds,
    membershipDefaultCabinetId: selectionContext.membershipDefaultCabinetId,
    roleByCabinetId: selectionContext.roleByCabinetId,
    resourceCabinetId: input.resourceCabinetId,
  });
}

export function buildCabinetContextForRequest(input: {
  actor: Actor;
  companyContext: CompanyContext;
  requestCabinetId: string | null;
  resourceCabinetId: string | null;
  memberships: CabinetMembershipRef[];
  defaultCabinetId: string | null;
}): CabinetContext {
  const selectionContext = buildCabinetSelectionContext({
    memberships: input.memberships,
    defaultCabinetId: input.defaultCabinetId,
    companyId: input.companyContext.companyId,
  });

  if (input.requestCabinetId) {
    if (
      input.actor.kind === "anonymous" ||
      (input.actor.kind === "user" &&
        (input.actor.role === "admin" || input.actor.systemRole === "platform_admin") &&
        selectionContext.membershipCabinetIds.length === 0)
    ) {
      return buildCabinetContext({
        cabinetId: input.requestCabinetId,
        companyId: input.companyContext.companyId,
        source: "request",
        requestCabinetId: input.requestCabinetId,
        membershipCabinetIds: [],
        membershipDefaultCabinetId: null,
        roleByCabinetId: {},
        resourceCabinetId: input.resourceCabinetId,
      });
    }

    if (!selectionContext.membershipCabinetIdSet.has(input.requestCabinetId)) {
      return buildCabinetMismatchContext({
        requestCabinetId: input.requestCabinetId,
        companyId: input.companyContext.companyId,
        membershipCabinetIds: selectionContext.membershipCabinetIds,
        membershipDefaultCabinetId: selectionContext.membershipDefaultCabinetId,
        roleByCabinetId: selectionContext.roleByCabinetId,
        resourceCabinetId: input.resourceCabinetId,
      });
    }

    return buildCabinetContext({
      cabinetId: input.requestCabinetId,
      companyId: input.companyContext.companyId,
      source: "request",
      requestCabinetId: input.requestCabinetId,
      membershipCabinetIds: selectionContext.membershipCabinetIds,
      membershipDefaultCabinetId: selectionContext.membershipDefaultCabinetId,
      roleByCabinetId: selectionContext.roleByCabinetId,
      resourceCabinetId: input.resourceCabinetId,
    });
  }

  if (input.resourceCabinetId) {
    return buildCabinetContext({
      cabinetId: input.resourceCabinetId,
      companyId: input.companyContext.companyId,
      source: "resource_mapping",
      requestCabinetId: null,
      membershipCabinetIds: selectionContext.membershipCabinetIds,
      membershipDefaultCabinetId: selectionContext.membershipDefaultCabinetId,
      roleByCabinetId: selectionContext.roleByCabinetId,
      resourceCabinetId: input.resourceCabinetId,
    });
  }

  if (selectionContext.membershipDefaultCabinetId) {
    return buildCabinetContext({
      cabinetId: selectionContext.membershipDefaultCabinetId,
      companyId: input.companyContext.companyId,
      source: "membership_default",
      requestCabinetId: null,
      membershipCabinetIds: selectionContext.membershipCabinetIds,
      membershipDefaultCabinetId: selectionContext.membershipDefaultCabinetId,
      roleByCabinetId: selectionContext.roleByCabinetId,
      resourceCabinetId: input.resourceCabinetId,
    });
  }

  return buildCabinetContext({
    cabinetId: null,
    companyId: input.companyContext.companyId,
    source: "none",
    requestCabinetId: null,
    membershipCabinetIds: selectionContext.membershipCabinetIds,
    membershipDefaultCabinetId: selectionContext.membershipDefaultCabinetId,
    roleByCabinetId: selectionContext.roleByCabinetId,
    resourceCabinetId: input.resourceCabinetId,
  });
}
