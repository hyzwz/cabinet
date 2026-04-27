import {
  canCompanyRoleAccessCabinetAction,
  canCabinetRoleAccessAction,
  evaluateCabinetAccess,
  isOwnedPageResourceContext,
  resolveCabinetActionFromAuthorizationAction,
  resolveOwnershipChainFromPageResource,
  type Actor,
  type AuthorizationAction,
  type AuthorizationDecision,
  type CabinetContext,
  type CompanyContext,
  type PageResourceContext,
  type ResourceOwnershipChain,
  validateResourceOwnershipAlignment,
} from "../page-authorization";

function createAlignmentDecision(input: {
  reason: Extract<AuthorizationDecision["reason"], "company_mismatch" | "cabinet_mismatch">;
  message?: string;
}): AuthorizationDecision {
  return {
    allowed: false,
    reason: input.reason,
    message:
      input.message ??
      (input.reason === "company_mismatch"
        ? "Access denied — resource belongs to a different company"
        : "Access denied — resource belongs to a different cabinet"),
    status: 403,
  };
}

function resolveOwnershipFromResourceContext(resourceContext: PageResourceContext): ResourceOwnershipChain {
  return isOwnedPageResourceContext(resourceContext)
    ? resourceContext.ownership
    : resolveOwnershipChainFromPageResource(resourceContext);
}

export function evaluateResourceOwnershipDecision(input: {
  resourceContext: PageResourceContext;
  companyContext: CompanyContext;
  cabinetContext: CabinetContext | null;
}): AuthorizationDecision | null {
  const ownershipValidation = validateResourceOwnershipAlignment({
    ownership: resolveOwnershipFromResourceContext(input.resourceContext),
    companyContext: input.companyContext,
    cabinetContext: input.cabinetContext,
  });

  if (ownershipValidation.mismatchReason === "company_mismatch") {
    return createAlignmentDecision({
      reason: "company_mismatch",
      message: ownershipValidation.mismatchMessage,
    });
  }

  if (ownershipValidation.mismatchReason === "cabinet_mismatch") {
    return createAlignmentDecision({
      reason: "cabinet_mismatch",
      message: ownershipValidation.mismatchMessage,
    });
  }

  return null;
}

export function evaluateContextMismatchDecision(input: {
  companyContext: CompanyContext;
  cabinetContext: CabinetContext | null;
}): AuthorizationDecision | null {
  if (input.companyContext.denyReason === "company_mismatch") {
    return {
      allowed: false,
      reason: "company_mismatch",
      message: input.companyContext.denyMessage ?? "Access denied — company context mismatch",
      status: 403,
    };
  }

  if (input.cabinetContext?.denyReason === "cabinet_mismatch") {
    return {
      allowed: false,
      reason: "cabinet_mismatch",
      message: input.cabinetContext.denyMessage ?? "Access denied — cabinet context mismatch",
      status: 403,
    };
  }

  return null;
}

export function evaluatePageResourceRequirements(
  resourceContext: PageResourceContext,
  cabinetContext: CabinetContext | null,
): AuthorizationDecision | null {
  if (resourceContext.requiresPageContext && resourceContext.visibility === null) {
    return {
      allowed: false,
      reason: "missing_page_context",
      message: "Access denied — resource is not associated with a page",
      status: 403,
    };
  }

  if (resourceContext.requiresCabinetContext && !cabinetContext?.cabinetId) {
    return {
      allowed: false,
      reason: "missing_cabinet_context",
      message: "This resource requires cabinet context",
      status: 404,
    };
  }

  return null;
}

export function evaluatePrivatePageDecision(input: {
  actor: Extract<Actor, { kind: "user" }>;
  resourceContext: PageResourceContext;
}): AuthorizationDecision | null {
  if (input.resourceContext.visibility === "private" && !input.resourceContext.ownerUsername) {
    return {
      allowed: false,
      reason: "misconfigured_private_page",
      message: "Access denied — private page is missing an owner",
      status: 403,
    };
  }

  if (
    input.resourceContext.visibility === "private" &&
    input.resourceContext.ownerUsername &&
    input.actor.username !== input.resourceContext.ownerUsername
  ) {
    return {
      allowed: false,
      reason: "private_page",
      message: "Access denied — private page",
      status: 403,
    };
  }

  return null;
}

export function evaluateStandardCabinetDecision(input: {
  actor: Extract<Actor, { kind: "user" }>;
  companyContext: CompanyContext;
  cabinetContext: CabinetContext | null;
  action: AuthorizationAction;
}): AuthorizationDecision | null {
  const cabinetAction = resolveCabinetActionFromAuthorizationAction(input.action);
  if (!cabinetAction) {
    return null;
  }

  return evaluateCabinetAccess({
    actor: input.actor,
    companyContext: input.companyContext,
    cabinetContext: input.cabinetContext,
    action: cabinetAction,
  });
}

function allowReportingWithUnresolvedOwnershipFallback(input: {
  resourceContext: PageResourceContext;
  cabinetContext: CabinetContext | null;
}): boolean {
  if (!input.resourceContext.requiresCabinetContext) {
    return false;
  }

  if (!input.cabinetContext?.cabinetId) {
    return false;
  }

  return input.resourceContext.cabinetId === null && input.resourceContext.companyId === null;
}

function getReportingAccessLabel(action: "read_reporting" | "manage_reporting"): string {
  return action === "manage_reporting" ? "reporting management" : "reporting reads";
}

function createMissingReportingCabinetContextDecision(
  action: "read_reporting" | "manage_reporting",
): AuthorizationDecision {
  return {
    allowed: false,
    reason: "missing_cabinet_context",
    message: `Cabinet context is required for ${getReportingAccessLabel(action)}`,
    status: 400,
  };
}

function createForbiddenReportingDecision(action: "read_reporting" | "manage_reporting"): AuthorizationDecision {
  return {
    allowed: false,
    reason: "forbidden",
    message:
      action === "manage_reporting"
        ? "Reporting management access required"
        : "Cabinet admin access required for reporting reads",
    status: 403,
  };
}

function createReportingAlignmentDecision(input: {
  reason: Extract<AuthorizationDecision["reason"], "company_mismatch" | "cabinet_mismatch">;
  message?: string;
}): AuthorizationDecision {
  return createAlignmentDecision(input);
}

function evaluateReportingOwnershipGate(input: {
  resourceContext: PageResourceContext;
  companyContext: CompanyContext;
  cabinetContext: CabinetContext | null;
  cabinetDecision: AuthorizationDecision | null;
}): AuthorizationDecision | null {
  const ownershipDecision = evaluateResourceOwnershipDecision({
    resourceContext: input.resourceContext,
    companyContext: input.companyContext,
    cabinetContext: input.cabinetContext,
  });

  if (ownershipDecision?.reason === "company_mismatch" || ownershipDecision?.reason === "cabinet_mismatch") {
    return createReportingAlignmentDecision({
      reason: ownershipDecision.reason,
      message: ownershipDecision.message,
    });
  }

  if (
    allowReportingWithUnresolvedOwnershipFallback({
      resourceContext: input.resourceContext,
      cabinetContext: input.cabinetContext,
    }) && input.cabinetDecision?.allowed
  ) {
    return input.cabinetDecision;
  }

  return null;
}

function evaluateReportingCabinetDecision(input: {
  action: "read_reporting" | "manage_reporting";
  actor: Actor;
  companyContext: CompanyContext;
  resourceContext: PageResourceContext;
  cabinetContext: CabinetContext | null;
}): {
  cabinetDecision: AuthorizationDecision | null;
  gateDecision: AuthorizationDecision | null;
} {
  const cabinetDecision = evaluateCabinetAccess({
    actor: input.actor,
    companyContext: input.companyContext,
    cabinetContext: input.cabinetContext,
    action:
      input.action === "manage_reporting"
        ? "cabinet_reporting_manage"
        : "cabinet_reporting_read",
  });

  const gateDecision = evaluateReportingOwnershipGate({
    resourceContext: input.resourceContext,
    companyContext: input.companyContext,
    cabinetContext: input.cabinetContext,
    cabinetDecision,
  });

  return {
    cabinetDecision,
    gateDecision,
  };
}

export function evaluateReportingAuthorizationDecision(input: {
  action: "read_reporting" | "manage_reporting";
  actor: Extract<Actor, { kind: "user" }>;
  companyContext: CompanyContext;
  resourceContext: PageResourceContext;
  cabinetContext: CabinetContext | null;
}): AuthorizationDecision {
  if (input.action === "manage_reporting" && !input.cabinetContext?.cabinetId) {
    return createMissingReportingCabinetContextDecision("manage_reporting");
  }

  const { cabinetDecision, gateDecision } = evaluateReportingCabinetDecision({
    action: input.action,
    actor: input.actor,
    companyContext: input.companyContext,
    resourceContext: input.resourceContext,
    cabinetContext: input.cabinetContext,
  });

  if (gateDecision) {
    return gateDecision;
  }

  if (input.action === "manage_reporting") {
    if (cabinetDecision?.allowed) {
      return cabinetDecision;
    }
    if (cabinetDecision?.reason === "missing_cabinet_context") {
      return createMissingReportingCabinetContextDecision("manage_reporting");
    }

    const companyRole = input.companyContext.companyId
      ? input.companyContext.membershipRoleByCompanyId[input.companyContext.companyId] ?? null
      : null;
    if (canCompanyRoleAccessCabinetAction(companyRole, "cabinet_reporting_manage")) {
      return { allowed: true };
    }

    return cabinetDecision ?? createForbiddenReportingDecision("manage_reporting");
  }

  if (cabinetDecision) {
    return cabinetDecision;
  }

  return createMissingReportingCabinetContextDecision("read_reporting");
}
