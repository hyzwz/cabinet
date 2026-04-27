import test from "node:test";
import assert from "node:assert/strict";
import os from "os";
import path from "path";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { NextRequest } from "next/server";
import { GET as getCabinetReporting } from "@/app/api/cabinets/[cabinetId]/reporting/route";
import {
  GET as getCabinetReportingLinks,
  PATCH as patchCabinetReportingLinks,
  POST as postCabinetReportingLinks,
} from "@/app/api/cabinets/[cabinetId]/reporting-links/route";
import {
  authorizeUserAction,
  buildAuthorizationSubjectContext,
  buildResourceOwnershipChain,
  canCompanyRoleAccessCabinetAction,
  evaluateUserAction,
  getCabinetMembershipAccess,
  resolveActiveCompanySelection,
  resolveCabinetActionFromAuthorizationAction,
  resolveCabinetMappingForPath,
  resolveCabinetContextForRequest,
  resolveCabinetContextForResource,
  resolveCompanyContextForRequest,
  resolveOwnershipChainFromPageResource,
  resolveOwnershipChainFromVirtualPath,
  resolvePageDerivedResourceContext,
  resolvePageResourceContext,
  resetCabinetMembershipProvider,
  resetCabinetResourceMappingProvider,
  resetCompanyMembershipProvider,
  setCabinetMembershipProvider,
  setCabinetResourceMappingProvider,
  setCompanyMembershipProvider,
  validateResourceOwnershipAlignment,
  type Actor,
  type CabinetContext,
  type CompanyContext,
  type PageResourceContext,
} from "@/lib/auth/page-authorization";
import {
  createFileReportingRelationProvider,
  createFileReportingSnapshotProvider,
  createInMemoryReportingRelationProvider,
  createInMemoryReportingSnapshotProvider,
  buildReportingLinkScope,
  buildReportingSnapshotSchema,
  buildReportingSnapshotSummary,
  createReportingReadService,
  createReportingSnapshotRefreshService,
  getReportingReadService,
  createReportingRelationService,
  getReportingRelationService,
  ReportingRelationValidationError,
  resetCabinetOwnershipProvider,
  resetReportingReadService,
  resetReportingRelationProvider,
  resetReportingSnapshotProvider,
  setCabinetOwnershipProvider,
  setReportingReadService,
  setReportingRelationProvider,
  setReportingSnapshotProvider,
  validateReportingScopeAlignment,
  type CabinetOwnershipProvider,
} from "@/lib/auth/reporting";

const baseResource: PageResourceContext = {
  resourceType: "page",
  virtualPath: "notes/example",
  pageId: null,
  ownerUsername: null,
  visibility: "public",
  requiresPageContext: false,
};

const editorActor: Actor = {
  kind: "user",
  userId: "editor-1",
  username: "editor",
  role: "editor",
};

function createActor(userId: string, overrides: Partial<Actor> = {}): Actor {
  return {
    kind: "user",
    userId,
    username: userId,
    role: "editor",
    ...overrides,
  };
}

const baseCompanyContext: CompanyContext = {
  companyId: null,
  source: "none" as const,
  requestCompanyId: null,
  workspaceCompanyId: null,
  membershipCompanyIds: [],
  membershipDefaultCompanyId: null,
  membershipRoleByCompanyId: {},
};

const baseCabinetContext: CabinetContext = {
  cabinetId: null,
  companyId: null,
  source: "none",
  requestCabinetId: null,
  membershipCabinetIds: [],
  membershipDefaultCabinetId: null,
  roleByCabinetId: {},
  resourceCabinetId: null,
};

test.afterEach(() => {
  resetCompanyMembershipProvider();
  resetCabinetMembershipProvider();
  resetCabinetResourceMappingProvider();
  resetCabinetOwnershipProvider();
  resetReportingRelationProvider();
  resetReportingSnapshotProvider();
  resetReportingReadService();
});

const companyAdminContext: CompanyContext = {
  ...baseCompanyContext,
  companyId: "company-1",
  membershipCompanyIds: ["company-1"],
  membershipRoleByCompanyId: { "company-1": "company_admin" },
};

const parentCabinetAdminContext: CabinetContext = {
  ...baseCabinetContext,
  cabinetId: "cab-parent",
  companyId: "company-1",
  roleByCabinetId: { "cab-parent": "cabinet_admin" },
};

test("cabinet membership access matrix exposes role capabilities", () => {
  assert.deepEqual(getCabinetMembershipAccess("cabinet_admin"), {
    canRead: true,
    canWrite: true,
    canAdmin: true,
    canReadReporting: true,
    canManageReporting: true,
  });
  assert.deepEqual(getCabinetMembershipAccess("cabinet_editor"), {
    canRead: true,
    canWrite: true,
    canAdmin: false,
    canReadReporting: false,
    canManageReporting: false,
  });
  assert.deepEqual(getCabinetMembershipAccess("cabinet_viewer"), {
    canRead: true,
    canWrite: false,
    canAdmin: false,
    canReadReporting: false,
    canManageReporting: false,
  });
});

test("company admin cabinet action helper only grants admin and reporting actions", () => {
  assert.equal(canCompanyRoleAccessCabinetAction("company_admin", "cabinet_admin"), true);
  assert.equal(canCompanyRoleAccessCabinetAction("company_admin", "cabinet_reporting_read"), true);
  assert.equal(canCompanyRoleAccessCabinetAction("company_admin", "cabinet_reporting_manage"), true);
  assert.equal(canCompanyRoleAccessCabinetAction("company_admin", "cabinet_write"), false);
  assert.equal(canCompanyRoleAccessCabinetAction("company_member", "cabinet_admin"), false);
});

test("authorization action mapping keeps reporting actions distinct from raw cabinet actions", () => {
  assert.equal(resolveCabinetActionFromAuthorizationAction("read_raw"), "cabinet_read");
  assert.equal(resolveCabinetActionFromAuthorizationAction("write_raw"), "cabinet_write");
  assert.equal(resolveCabinetActionFromAuthorizationAction("read_reporting"), "cabinet_reporting_read");
  assert.equal(resolveCabinetActionFromAuthorizationAction("manage_reporting"), "cabinet_reporting_manage");
});

test("resolveActiveCompanySelection prefers membership default over unrelated workspace default for authenticated users", () => {
  const companyContext = resolveActiveCompanySelection({
    actor: { kind: "user", id: "user-1" },
    requestCompanyId: null,
    workspaceCompanyId: "company-workspace",
    membershipCompanyIds: ["company-a", "company-b"],
    membershipDefaultCompanyId: "company-b",
    membershipRoleByCompanyId: {
      "company-a": "company_member",
      "company-b": "company_admin",
    },
  });

  assert.equal(companyContext.companyId, "company-b");
  assert.equal(companyContext.source, "membership_default");
  assert.equal(companyContext.workspaceCompanyId, "company-workspace");
});

test("resolveActiveCompanySelection keeps workspace default for anonymous actors", () => {
  const companyContext = resolveActiveCompanySelection({
    actor: { kind: "anonymous" },
    requestCompanyId: null,
    workspaceCompanyId: "company-workspace",
    membershipCompanyIds: [],
    membershipDefaultCompanyId: null,
    membershipRoleByCompanyId: {},
  });

  assert.equal(companyContext.companyId, "company-workspace");
  assert.equal(companyContext.source, "workspace_default");
});

test("resolveActiveCompanySelection returns none when authenticated users have no memberships", () => {
  const companyContext = resolveActiveCompanySelection({
    actor: { kind: "user", id: "user-1" },
    requestCompanyId: null,
    workspaceCompanyId: "company-workspace",
    membershipCompanyIds: [],
    membershipDefaultCompanyId: null,
    membershipRoleByCompanyId: {},
  });

  assert.equal(companyContext.companyId, null);
  assert.equal(companyContext.source, "none");
});

test("resolveActiveCompanySelection keeps workspace default for admin users without memberships", () => {
  const companyContext = resolveActiveCompanySelection({
    actor: { kind: "user", userId: "user-1", username: "admin", role: "admin" },
    requestCompanyId: null,
    workspaceCompanyId: "company-workspace",
    membershipCompanyIds: [],
    membershipDefaultCompanyId: null,
    membershipRoleByCompanyId: {},
  });

  assert.equal(companyContext.companyId, "company-workspace");
  assert.equal(companyContext.source, "workspace_default");
});

test("authorization subject context exposes resolved company and cabinet memberships", () => {
  const subjectContext = buildAuthorizationSubjectContext({
    actor: { kind: "user", id: "user-1", email: "user@example.com" },
    companyContext: {
      companyId: "company-1",
      source: "membership_default",
      requestCompanyId: null,
      workspaceCompanyId: null,
      membershipCompanyIds: ["company-1", "company-2"],
      membershipDefaultCompanyId: "company-1",
      membershipRoleByCompanyId: {
        "company-1": "company_admin",
        "company-2": "member",
      },
    },
    cabinetContext: {
      cabinetId: "cabinet-1",
      companyId: "company-1",
      source: "membership_default",
      cabinetPath: "company-1/root",
      membershipCabinetIds: ["cabinet-1", "cabinet-2"],
      membershipDefaultCabinetId: "cabinet-1",
      roleByCabinetId: {
        "cabinet-1": "cabinet_admin",
        "cabinet-2": "cabinet_editor",
      },
    },
  });

  assert.equal(subjectContext.company.companyId, "company-1");
  assert.equal(subjectContext.company.source, "membership_default");
  assert.equal(subjectContext.cabinet.cabinetId, "cabinet-1");
  assert.equal(subjectContext.cabinet.companyId, "company-1");
  assert.deepEqual(subjectContext.companyMemberships, [
    {
      companyId: "company-1",
      isDefault: true,
      role: "company_admin",
    },
    {
      companyId: "company-2",
      isDefault: false,
      role: "member",
    },
  ]);
  assert.deepEqual(subjectContext.cabinetMemberships, [
    {
      cabinetId: "cabinet-1",
      companyId: "company-1",
      role: "cabinet_admin",
      isDefault: true,
    },
    {
      cabinetId: "cabinet-2",
      companyId: "company-1",
      role: "cabinet_editor",
      isDefault: false,
    },
  ]);
});

test("authorization subject context keeps cabinet membership list when active cabinet is outside memberships", () => {
  const subjectContext = buildAuthorizationSubjectContext({
    actor: { kind: "user", id: "user-1" },
    companyContext: {
      companyId: "company-1",
      source: "membership_default",
      requestCompanyId: null,
      workspaceCompanyId: null,
      membershipCompanyIds: ["company-1"],
      membershipDefaultCompanyId: "company-1",
      membershipRoleByCompanyId: { "company-1": "member" },
    },
    cabinetContext: {
      cabinetId: "cabinet-unknown",
      companyId: "company-1",
      source: "request",
      cabinetPath: "company-1/unknown",
      membershipCabinetIds: ["cabinet-1"],
      membershipDefaultCabinetId: "cabinet-1",
      roleByCabinetId: {
        "cabinet-1": "cabinet_viewer",
      },
    },
  });

  assert.equal(subjectContext.cabinet.cabinetId, "cabinet-unknown");
  assert.equal(subjectContext.cabinet.source, "request");
  assert.equal(subjectContext.cabinetMemberships.length, 1);
  assert.deepEqual(subjectContext.cabinetMemberships[0], {
    cabinetId: "cabinet-1",
    companyId: "company-1",
    role: "cabinet_viewer",
    isDefault: true,
  });
});

test("authorization subject context preserves anonymous actors without memberships", () => {
  const subjectContext = buildAuthorizationSubjectContext({
    actor: { kind: "anonymous" },
    companyContext: {
      companyId: null,
      source: "none",
      requestCompanyId: null,
      workspaceCompanyId: null,
      membershipCompanyIds: [],
      membershipDefaultCompanyId: null,
      membershipRoleByCompanyId: {},
    },
    cabinetContext: {
      cabinetId: null,
      companyId: null,
      source: "none",
      requestCabinetId: null,
      membershipCabinetIds: [],
      membershipDefaultCabinetId: null,
      roleByCabinetId: {},
      resourceCabinetId: null,
    },
  });

  assert.equal(subjectContext.actor.kind, "anonymous");
  assert.equal(subjectContext.company.companyId, null);
  assert.equal(subjectContext.cabinet.cabinetId, null);
  assert.equal(subjectContext.companyMemberships.length, 0);
  assert.equal(subjectContext.cabinetMemberships.length, 0);
});

test("authorization subject context uses membership default cabinet when request and resource cabinets are absent", () => {
  const subjectContext = buildAuthorizationSubjectContext({
    actor: { kind: "user", id: "user-1" },
    companyContext: {
      companyId: "company-1",
      source: "membership_default",
      requestCompanyId: null,
      workspaceCompanyId: null,
      membershipCompanyIds: ["company-1"],
      membershipDefaultCompanyId: "company-1",
      membershipRoleByCompanyId: { "company-1": "member" },
    },
    cabinetContext: {
      cabinetId: "cabinet-b",
      companyId: "company-1",
      source: "membership_default",
      requestCabinetId: null,
      membershipCabinetIds: ["cabinet-a", "cabinet-b"],
      membershipDefaultCabinetId: "cabinet-b",
      roleByCabinetId: {
        "cabinet-a": "cabinet_viewer",
        "cabinet-b": "cabinet_admin",
      },
      resourceCabinetId: null,
    },
  });

  assert.equal(subjectContext.cabinet.cabinetId, "cabinet-b");
  assert.equal(subjectContext.cabinet.source, "membership_default");
  assert.deepEqual(
    subjectContext.cabinetMemberships.map((membership) => membership.cabinetId),
    ["cabinet-a", "cabinet-b"],
  );
});



test("cabinet context resolves membership default cabinet when request and resource cabinets are absent", async () => {
  const req = new NextRequest("http://localhost/api/cabinets");
  const actor = createActor("cabinet-default-user");
  const companyContext = {
    companyId: "company-1",
    source: "membership_default" as const,
    requestCompanyId: null,
    workspaceCompanyId: null,
    membershipCompanyIds: ["company-1"],
    membershipDefaultCompanyId: "company-1",
    membershipRoleByCompanyId: { "company-1": "member" },
  };

  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [
          { cabinetId: "cabinet-a", companyId: "company-1", role: "cabinet_viewer", isDefault: false },
          { cabinetId: "cabinet-b", companyId: "company-1", role: "cabinet_admin", isDefault: true },
        ],
        defaultCabinetId: null,
      };
    },
  });

  const cabinetContext = await resolveCabinetContextForRequest({
    req,
    actor,
    companyContext,
    resourceContext: null,
  });

  assert.equal(cabinetContext.cabinetId, "cabinet-b");
  assert.equal(cabinetContext.source, "membership_default");
  assert.deepEqual(cabinetContext.membershipCabinetIds, ["cabinet-a", "cabinet-b"]);
  assert.equal(cabinetContext.membershipDefaultCabinetId, "cabinet-b");
});

test("cabinet context keeps request cabinet active even when it is outside memberships", async () => {
  const req = new NextRequest("http://localhost/api/cabinets?cabinetId=cabinet-external");
  const actor = createActor("cabinet-request-mismatch-user");
  const companyContext = {
    companyId: "company-1",
    source: "membership_default" as const,
    requestCompanyId: null,
    workspaceCompanyId: null,
    membershipCompanyIds: ["company-1"],
    membershipDefaultCompanyId: "company-1",
    membershipRoleByCompanyId: { "company-1": "member" },
  };

  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [
          { cabinetId: "cabinet-a", companyId: "company-1", role: "cabinet_viewer", isDefault: false },
          { cabinetId: "cabinet-b", companyId: "company-1", role: "cabinet_admin", isDefault: true },
        ],
        defaultCabinetId: "cabinet-b",
      };
    },
  });

  const cabinetContext = await resolveCabinetContextForRequest({
    req,
    actor,
    companyContext,
    resourceContext: null,
  });

  assert.equal(cabinetContext.cabinetId, null);
  assert.equal(cabinetContext.source, "none");
  assert.equal(cabinetContext.denyReason, "cabinet_mismatch");
  assert.deepEqual(cabinetContext.membershipCabinetIds, ["cabinet-a", "cabinet-b"]);
  assert.equal(cabinetContext.membershipDefaultCabinetId, "cabinet-b");
});



test("authorization subject context falls back to unresolved cabinet when membership default is missing", () => {
  const subjectContext = buildAuthorizationSubjectContext({
    actor: { kind: "user", id: "user-no-cabinet-default" },
    companyContext: {
      companyId: "company-1",
      source: "membership_default",
      requestCompanyId: null,
      workspaceCompanyId: null,
      membershipCompanyIds: ["company-1"],
      membershipDefaultCompanyId: "company-1",
      membershipRoleByCompanyId: { "company-1": "member" },
    },
    cabinetContext: {
      cabinetId: null,
      companyId: "company-1",
      source: "none",
      requestCabinetId: null,
      membershipCabinetIds: ["cabinet-a", "cabinet-b"],
      membershipDefaultCabinetId: null,
      roleByCabinetId: {
        "cabinet-a": "cabinet_viewer",
        "cabinet-b": "cabinet_admin",
      },
      resourceCabinetId: null,
    },
  });

  assert.equal(subjectContext.cabinet.cabinetId, null);
  assert.equal(subjectContext.cabinet.source, "none");
  assert.deepEqual(
    subjectContext.cabinetMemberships.map((membership) => membership.cabinetId),
    ["cabinet-a", "cabinet-b"],
  );
});

test("resource ownership chain resolves page to cabinet and company", () => {
  const ownership = buildResourceOwnershipChain({
    virtualPath: "company-a/parent/page-a",
    mapping: {
      companyId: "company-a",
      cabinetId: "cab-parent",
    },
  });

  assert.deepEqual(ownership, {
    resourceType: "page",
    virtualPath: "company-a/parent/page-a",
    companyId: "company-a",
    cabinetId: "cab-parent",
    source: "resource_mapping",
  });
});

test("cabinet mapping resolution exposes provider-backed mapping metadata", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath !== "company-a/parent/page-a") {
        return null;
      }
      return {
        companyId: "company-a",
        cabinetId: "cab-parent",
      };
    },
  });

  const resolution = await resolveCabinetMappingForPath("company-a/parent/page-a");

  assert.deepEqual(resolution, {
    virtualPath: "company-a/parent/page-a",
    mapping: {
      companyId: "company-a",
      cabinetId: "cab-parent",
    },
    source: "provider",
  });
});

test("cabinet mapping resolution normalizes wrapped paths before provider lookup", async () => {
  let receivedPath: string | null = null;
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      receivedPath = virtualPath;
      return {
        companyId: "company-a",
        cabinetId: "cab-parent",
      };
    },
  });

  const resolution = await resolveCabinetMappingForPath("/company-a/parent/page-a/");

  assert.equal(receivedPath, "company-a/parent/page-a");
  assert.deepEqual(resolution, {
    virtualPath: "company-a/parent/page-a",
    mapping: {
      companyId: "company-a",
      cabinetId: "cab-parent",
    },
    source: "provider",
  });
});

test("cabinet mapping resolution reports none when provider cannot map path", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage() {
      return null;
    },
  });

  const resolution = await resolveCabinetMappingForPath("company-a/unmapped/page-a");

  assert.deepEqual(resolution, {
    virtualPath: "company-a/unmapped/page-a",
    mapping: null,
    source: "none",
  });
});

test("ownership chain can be reconstructed directly from virtual path mapping", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "company-a/parent/page-a") {
        return {
          companyId: "company-a",
          cabinetId: "cab-parent",
        };
      }
      return null;
    },
  });

  const ownership = await resolveOwnershipChainFromVirtualPath("/company-a/parent/page-a/");

  assert.deepEqual(ownership, {
    resourceType: "page",
    virtualPath: "company-a/parent/page-a",
    companyId: "company-a",
    cabinetId: "cab-parent",
    source: "resource_mapping",
  });
});

test("ownership chain can be reconstructed from page resource context", () => {
  const ownership = resolveOwnershipChainFromPageResource({
    resourceType: "page",
    virtualPath: "company-a/parent/page-a",
    companyId: "company-a",
    cabinetId: "cab-parent",
  });

  assert.deepEqual(ownership, {
    resourceType: "page",
    virtualPath: "company-a/parent/page-a",
    companyId: "company-a",
    cabinetId: "cab-parent",
    source: "resource_mapping",
  });
});

test("derived resource context reuses unified cabinet mapping resolution when ancestor page is absent", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "company-a/parent/assets/diagram.png") {
        return {
          companyId: "company-a",
          cabinetId: "cab-parent",
        };
      }
      return null;
    },
  });

  const resource = await resolvePageDerivedResourceContext("company-a/parent/assets/diagram.png");

  assert.equal(resource.sourcePath, "company-a/parent/assets/diagram.png");
  assert.equal(resource.companyId, "company-a");
  assert.equal(resource.cabinetId, "cab-parent");
});

test("ownership validation rejects company mismatches before cabinet checks", () => {
  const result = validateResourceOwnershipAlignment({
    ownership: buildResourceOwnershipChain({
      virtualPath: "company-a/parent/page-a",
      mapping: {
        companyId: "company-a",
        cabinetId: "cab-parent",
      },
    }),
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-b",
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-parent",
      companyId: "company-b",
    },
  });

  assert.equal(result.companyMatchesActiveCompany, false);
  assert.equal(result.cabinetMatchesActiveCabinet, true);
  assert.equal(result.mismatchReason, "company_mismatch");
});

test("ownership validation rejects cabinet mismatches inside the same company", () => {
  const result = validateResourceOwnershipAlignment({
    ownership: buildResourceOwnershipChain({
      virtualPath: "company-a/parent/page-a",
      mapping: {
        companyId: "company-a",
        cabinetId: "cab-parent",
      },
    }),
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-a",
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-other",
      companyId: "company-a",
    },
  });

  assert.equal(result.companyMatchesActiveCompany, true);
  assert.equal(result.cabinetMatchesActiveCabinet, false);
  assert.equal(result.mismatchReason, "cabinet_mismatch");
});

test("resource access is denied when ownership chain points to another company", async () => {
  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-b",
      membershipCompanyIds: ["company-b"],
    },
    resourceContext: {
      ...baseResource,
      virtualPath: "company-a/parent/page-a",
      companyId: "company-a",
      cabinetId: "cab-parent",
      requiresCabinetContext: false,
    },
    cabinetContext: {
      ...baseCabinetContext,
      companyId: "company-b",
      cabinetId: "cab-parent",
    },
    action: "read_raw",
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "company_mismatch");
  assert.equal(decision.status, 403);
});

test("resource access is denied when ownership chain points to another cabinet", async () => {
  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-a",
      membershipCompanyIds: ["company-a"],
    },
    resourceContext: {
      ...baseResource,
      virtualPath: "company-a/parent/page-a",
      companyId: "company-a",
      cabinetId: "cab-parent",
      requiresCabinetContext: true,
    },
    cabinetContext: {
      ...baseCabinetContext,
      companyId: "company-a",
      cabinetId: "cab-other",
    },
    action: "read_raw",
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "cabinet_mismatch");
  assert.equal(decision.status, 403);
});

test("anonymous actor can read when anonymous read policy is enabled", async () => {
  const decision = await authorizeUserAction({
    actor: { kind: "anonymous" },
    companyContext: baseCompanyContext,
    resourceContext: baseResource,
    action: "read_raw",
    cabinetContext: baseCabinetContext,
  });

  assert.equal(decision.allowed, true);
});

test("anonymous actor is rejected for write", async () => {
  const decision = await authorizeUserAction({
    actor: { kind: "anonymous" },
    companyContext: baseCompanyContext,
    resourceContext: baseResource,
    action: "write_raw",
    cabinetContext: baseCabinetContext,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "unauthenticated");
  assert.equal(decision.status, 401);
});

test("viewer can read but cannot write", async () => {
  const viewer: Actor = {
    kind: "user",
    userId: "viewer-1",
    username: "viewer",
    role: "viewer",
  };

  const readDecision = await authorizeUserAction({
    actor: viewer,
    companyContext: baseCompanyContext,
    resourceContext: baseResource,
    action: "read_raw",
    cabinetContext: baseCabinetContext,
  });
  const writeDecision = await authorizeUserAction({
    actor: viewer,
    companyContext: baseCompanyContext,
    resourceContext: baseResource,
    action: "write_raw",
    cabinetContext: baseCabinetContext,
  });

  assert.equal(readDecision.allowed, true);
  assert.equal(writeDecision.allowed, false);
  assert.equal(writeDecision.reason, "read_only_role");
});

test("admin can access admin and delete actions", async () => {
  const admin: Actor = {
    kind: "user",
    userId: "admin-1",
    username: "admin",
    role: "admin",
  };

  const adminDecision = await authorizeUserAction({
    actor: admin,
    companyContext: baseCompanyContext,
    resourceContext: baseResource,
    action: "admin_raw",
    cabinetContext: baseCabinetContext,
  });
  const deleteDecision = await authorizeUserAction({
    actor: admin,
    companyContext: baseCompanyContext,
    resourceContext: baseResource,
    action: "delete_raw",
    cabinetContext: baseCabinetContext,
  });

  assert.equal(adminDecision.allowed, true);
  assert.equal(deleteDecision.allowed, true);
});

test("private page owner is allowed but non-owner is denied", async () => {
  const ownerResource: PageResourceContext = {
    ...baseResource,
    ownerUsername: "alice",
    visibility: "private",
  };

  const owner: Actor = {
    kind: "user",
    userId: "user-1",
    username: "alice",
    role: "editor",
  };
  const otherUser: Actor = {
    kind: "user",
    userId: "user-2",
    username: "bob",
    role: "editor",
  };

  const ownerDecision = await authorizeUserAction({
    actor: owner,
    companyContext: baseCompanyContext,
    resourceContext: ownerResource,
    action: "read_raw",
    cabinetContext: baseCabinetContext,
  });
  const otherDecision = await authorizeUserAction({
    actor: otherUser,
    companyContext: baseCompanyContext,
    resourceContext: ownerResource,
    action: "read_raw",
    cabinetContext: baseCabinetContext,
  });

  assert.equal(ownerDecision.allowed, true);
  assert.equal(otherDecision.allowed, false);
  assert.equal(otherDecision.reason, "private_page");
});

test("private page without owner is rejected as misconfigured", async () => {
  const decision = await authorizeUserAction({
    actor: {
      kind: "user",
      userId: "user-3",
      username: "charlie",
      role: "editor",
    },
    companyContext: baseCompanyContext,
    resourceContext: {
      ...baseResource,
      ownerUsername: null,
      visibility: "private",
    },
    action: "read_raw",
    cabinetContext: baseCabinetContext,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "misconfigured_private_page");
});

test("page-derived resource without ancestor page context is rejected", async () => {
  const decision = await authorizeUserAction({
    actor: {
      kind: "user",
      userId: "user-5",
      username: "eve",
      role: "editor",
    },
    companyContext: baseCompanyContext,
    resourceContext: {
      ...baseResource,
      virtualPath: "docs/orphan-asset/image.png",
      sourcePath: "docs/orphan-asset/image.png",
      visibility: null,
      ownerUsername: null,
      requiresPageContext: true,
    },
    action: "read_raw",
    cabinetContext: baseCabinetContext,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "missing_page_context");
  assert.equal(decision.status, 403);
});

test("page-derived resource context keeps source path when ancestor page metadata exists", async () => {
  const resourceContext = await resolvePageDerivedResourceContext("docs/intro/diagram.png");

  assert.equal(resourceContext.resourceType, "page");
  assert.equal(resourceContext.sourcePath, "docs/intro/diagram.png");
  assert.equal(resourceContext.visibility, "public");
  assert.equal(resourceContext.requiresPageContext, false);
});

test("cabinet write decision allows text-asset style updates when cabinet context resolves", async () => {
  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      virtualPath: "orphan-assets",
      sourcePath: "orphan-assets/image.png",
      visibility: "public",
      requiresCabinetContext: true,
      cabinetId: "cab-assets",
      companyId: "company-1",
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-assets",
      companyId: "company-1",
      source: "resource_mapping",
      membershipCabinetIds: ["cab-assets"],
      roleByCabinetId: { "cab-assets": "cabinet_editor" },
      resourceCabinetId: "cab-assets",
    },
    action: "write_raw",
  });

  assert.equal(decision.allowed, true);
});

test("page-derived private resource is denied for non-owner", async () => {
  const decision = await authorizeUserAction({
    actor: {
      kind: "user",
      userId: "user-4",
      username: "mallory",
      role: "editor",
    },
    companyContext: baseCompanyContext,
    resourceContext: {
      ...baseResource,
      virtualPath: "docs/private-page",
      sourcePath: "docs/private-page/image.png",
      ownerUsername: "alice",
      visibility: "private",
    },
    action: "read_raw",
    cabinetContext: baseCabinetContext,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "private_page");
});

test("company context prefers request override over workspace and membership defaults", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [
          { companyId: "company-request" },
          { companyId: "company-membership-default", isDefault: true },
        ],
        defaultCompanyId: null,
      };
    },
  });

  const req = new NextRequest("http://localhost/api/pages/notes/example?companyId=company-request");
  const companyContext = await resolveCompanyContextForRequest(req, editorActor);

  assert.equal(companyContext.companyId, "company-request");
  assert.equal(companyContext.source, "request");
  assert.deepEqual(companyContext.membershipCompanyIds, [
    "company-request",
    "company-membership-default",
  ]);
  assert.equal(companyContext.membershipDefaultCompanyId, "company-membership-default");
});

test("company context falls back to membership default when no request or workspace default exists", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [
          { companyId: "company-a" },
          { companyId: "company-membership-default", isDefault: true },
        ],
        defaultCompanyId: null,
      };
    },
  });

  const req = new NextRequest("http://localhost/api/pages/notes/example");
  const companyContext = await resolveCompanyContextForRequest(req, editorActor);

  assert.equal(companyContext.companyId, "company-membership-default");
  assert.equal(companyContext.source, "membership_default");
  assert.equal(companyContext.requestCompanyId, null);
});

test("company context returns explicit mismatch deny metadata when request company is not in memberships", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-member", isDefault: true }],
        defaultCompanyId: null,
      };
    },
  });

  const req = new NextRequest("http://localhost/api/pages/notes/example?companyId=company-other");
  const companyContext = await resolveCompanyContextForRequest(req, editorActor);

  assert.equal(companyContext.companyId, null);
  assert.equal(companyContext.denyReason, "company_mismatch");
  assert.match(companyContext.denyMessage ?? "", /company-other/);

  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext,
    resourceContext: baseResource,
    action: "read_raw",
    cabinetContext: baseCabinetContext,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "company_mismatch");
  assert.equal(decision.status, 403);
});

test("cabinet viewer is denied write operations", async () => {
  const cabinetContext: CabinetContext = {
    ...baseCabinetContext,
    cabinetId: "cab-1",
    companyId: "company-1",
    roleByCabinetId: { "cab-1": "cabinet_viewer" },
  };

  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-1",
    },
    action: "write_raw",
    cabinetContext,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "read_only_role");
  assert.equal(decision.status, 403);
});

test("cabinet editor is allowed write operations", async () => {
  const cabinetContext: CabinetContext = {
    ...baseCabinetContext,
    cabinetId: "cab-1",
    companyId: "company-1",
    roleByCabinetId: { "cab-1": "cabinet_editor" },
  };

  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-1",
    },
    action: "write_raw",
    cabinetContext,
  });

  assert.equal(decision.allowed, true);
});

test("cabinet admin is allowed cabinet management actions", async () => {
  const cabinetContext: CabinetContext = {
    ...baseCabinetContext,
    cabinetId: "cab-1",
    companyId: "company-1",
    roleByCabinetId: { "cab-1": "cabinet_admin" },
  };

  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-1",
    },
    action: "admin_raw",
    cabinetContext,
  });

  assert.equal(decision.allowed, true);
});

test("company admin has minimal override for cabinet management only", async () => {
  const cabinetContext: CabinetContext = {
    ...baseCabinetContext,
    cabinetId: "cab-1",
    companyId: "company-1",
    roleByCabinetId: { "cab-1": "cabinet_viewer" },
  };
  const companyContext: CompanyContext = {
    ...baseCompanyContext,
    companyId: "company-1",
    membershipCompanyIds: ["company-1"],
    membershipRoleByCompanyId: { "company-1": "company_admin" },
  };

  const adminDecision = await authorizeUserAction({
    actor: editorActor,
    companyContext,
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-1",
    },
    action: "admin_raw",
    cabinetContext,
  });
  const writeDecision = await authorizeUserAction({
    actor: editorActor,
    companyContext,
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-1",
    },
    action: "write_raw",
    cabinetContext,
  });

  assert.equal(adminDecision.allowed, true);
  assert.equal(writeDecision.allowed, false);
  assert.equal(writeDecision.reason, "read_only_role");
});

test("cabinet context falls back to membership default when request and resource cabinet are absent", async () => {
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [
          { cabinetId: "cab-a", companyId: "company-1", role: "cabinet_viewer" },
          { cabinetId: "cab-b", companyId: "company-1", role: "cabinet_admin", isDefault: true },
        ],
        defaultCabinetId: "cab-b",
      };
    },
  });

  const cabinetContext = await resolveCabinetContextForRequest({
    req: new NextRequest("http://localhost/api/pages/notes/example"),
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
  });

  assert.equal(cabinetContext.cabinetId, "cab-b");
  assert.equal(cabinetContext.source, "membership_default");
  assert.equal(cabinetContext.membershipDefaultCabinetId, "cab-b");
  assert.deepEqual(cabinetContext.membershipCabinetIds, ["cab-a", "cab-b"]);
  assert.equal(cabinetContext.roleByCabinetId["cab-b"], "cabinet_admin");
});

test("cabinet context reports mismatch when request cabinet is outside active company memberships", async () => {
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [
          { cabinetId: "cab-a", companyId: "company-1", role: "cabinet_viewer" },
          { cabinetId: "cab-external", companyId: "company-2", role: "cabinet_admin" },
        ],
        defaultCabinetId: "cab-a",
      };
    },
  });

  const cabinetContext = await resolveCabinetContextForRequest({
    req: new NextRequest("http://localhost/api/pages/notes/example?cabinetId=cab-external"),
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
  });

  assert.equal(cabinetContext.cabinetId, null);
  assert.equal(cabinetContext.source, "none");
  assert.equal(cabinetContext.denyReason, "cabinet_mismatch");
  assert.equal(cabinetContext.membershipDefaultCabinetId, "cab-a");
  assert.deepEqual(cabinetContext.membershipCabinetIds, ["cab-a"]);
  assert.deepEqual(cabinetContext.roleByCabinetId, { "cab-a": "cabinet_viewer" });
});

test("cabinet context resolves request cabinet and membership roles", async () => {
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [
          { cabinetId: "cab-request", companyId: "company-1", role: "cabinet_editor" },
          { cabinetId: "cab-default", companyId: "company-1", role: "cabinet_viewer", isDefault: true },
          { cabinetId: "cab-other-company", companyId: "company-2", role: "cabinet_admin" },
        ],
        defaultCabinetId: null,
      };
    },
  });

  const cabinetContext = await resolveCabinetContextForRequest({
    req: new NextRequest("http://localhost/api/pages/notes/example?cabinetId=cab-request"),
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
  });

  assert.equal(cabinetContext.cabinetId, "cab-request");
  assert.equal(cabinetContext.source, "request");
  assert.deepEqual(cabinetContext.membershipCabinetIds, ["cab-request", "cab-default"]);
  assert.equal(cabinetContext.roleByCabinetId["cab-request"], "cabinet_editor");
});

test("cabinet context uses resource mapping fallback for future resource to cabinet wiring", async () => {
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-resource", companyId: "company-1", role: "cabinet_viewer" }],
        defaultCabinetId: null,
      };
    },
  });

  const cabinetContext = await resolveCabinetContextForRequest({
    req: new NextRequest("http://localhost/api/pages/notes/example"),
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: { cabinetId: "cab-resource" },
  });

  assert.equal(cabinetContext.cabinetId, "cab-resource");
  assert.equal(cabinetContext.source, "resource_mapping");
  assert.equal(cabinetContext.resourceCabinetId, "cab-resource");
});

test("resource mapping provider resolves cabinet context for page resources", async () => {
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-page", companyId: "company-1", role: "cabinet_editor" }],
        defaultCabinetId: null,
      };
    },
  });
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "notes/example") {
        return { cabinetId: "cab-page", companyId: "company-1" };
      }
      return null;
    },
  });

  const resourceContext: PageResourceContext = {
    ...baseResource,
    virtualPath: "notes/example",
    visibility: "public",
    requiresCabinetContext: true,
    cabinetId: "cab-page",
    companyId: "company-1",
  };
  const cabinetContext = await resolveCabinetContextForResource({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext,
  });

  assert.equal(resourceContext.cabinetId, "cab-page");
  assert.equal(resourceContext.companyId, "company-1");
  assert.equal(resourceContext.requiresCabinetContext, true);
  assert.equal(cabinetContext.cabinetId, "cab-page");
  assert.equal(cabinetContext.source, "resource_mapping");
});

test("page-derived resource inherits cabinet mapping from ancestor page", async () => {
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-docs", companyId: "company-1", role: "cabinet_viewer" }],
        defaultCabinetId: null,
      };
    },
  });
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "docs/intro") {
        return { cabinetId: "cab-docs", companyId: "company-1" };
      }
      return null;
    },
  });

  const resourceContext: PageResourceContext = {
    ...baseResource,
    virtualPath: "docs/intro",
    sourcePath: "docs/intro/diagram.png",
    visibility: "public",
    requiresPageContext: false,
    requiresCabinetContext: true,
    cabinetId: "cab-docs",
    companyId: "company-1",
  };
  const cabinetContext = await resolveCabinetContextForResource({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext,
  });

  assert.equal(resourceContext.cabinetId, "cab-docs");
  assert.equal(resourceContext.companyId, "company-1");
  assert.equal(resourceContext.requiresCabinetContext, true);
  assert.equal(cabinetContext.cabinetId, "cab-docs");
  assert.equal(cabinetContext.source, "resource_mapping");
});

test("missing cabinet context is rejected when page resolves but cabinet mapping is absent", async () => {
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-other", companyId: "company-1", role: "cabinet_editor" }],
        defaultCabinetId: null,
      };
    },
  });

  const resourceContext: PageResourceContext = {
    ...baseResource,
    virtualPath: "docs/intro",
    visibility: "public",
    requiresCabinetContext: true,
    cabinetId: null,
    companyId: "company-1",
  };

  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext,
    cabinetContext: baseCabinetContext,
    action: "read_raw",
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "missing_cabinet_context");
  assert.equal(decision.status, 404);
});

test("company admin can manage reporting", async () => {
  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext: companyAdminContext,
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
    action: "manage_reporting",
  });

  assert.equal(decision.allowed, true);
});

test("non company admin cannot manage reporting by default", async () => {
  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-parent",
      companyId: "company-1",
      roleByCabinetId: { "cab-parent": "cabinet_viewer" },
    },
    action: "manage_reporting",
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "forbidden");
});

test("cabinet admin can manage reporting without company admin override", async () => {
  const decision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
    action: "manage_reporting",
  });

  assert.equal(decision.allowed, true);
});


test("cabinet viewer receives reporting-specific denial messages for read and manage actions", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-parent",
      companyId: "company-1",
      roleByCabinetId: { "cab-parent": "cabinet_viewer" },
    },
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, false);
  assert.equal(readDecision.reason, "forbidden");
  assert.equal(readDecision.status, 403);
  assert.equal(readDecision.message, "Cabinet admin access required for reporting reads");
  assert.equal(manageDecision.allowed, false);
  assert.equal(manageDecision.reason, "forbidden");
  assert.equal(manageDecision.status, 403);
  assert.equal(
    manageDecision.message,
    "Cabinet admin access required for reporting management",
  );
});

test("company admin reporting override does not bypass cabinet mismatch", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: companyAdminContext,
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-other",
      companyId: "company-1",
      roleByCabinetId: { "cab-other": "cabinet_viewer" },
    },
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, false);
  assert.equal(readDecision.reason, "cabinet_mismatch");
  assert.equal(readDecision.status, 403);
  assert.equal(manageDecision.allowed, false);
  assert.equal(manageDecision.reason, "cabinet_mismatch");
  assert.equal(manageDecision.status, 403);
});

test("company admin reporting override does not bypass company mismatch", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: companyAdminContext,
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-2",
      requiresCabinetContext: true,
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-parent",
      companyId: "company-1",
      roleByCabinetId: { "cab-parent": "cabinet_admin" },
    },
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, false);
  assert.equal(readDecision.reason, "company_mismatch");
  assert.equal(readDecision.status, 403);
  assert.equal(manageDecision.allowed, false);
  assert.equal(manageDecision.reason, "company_mismatch");
  assert.equal(manageDecision.status, 403);
});

test("cabinet admin reporting access does not bypass company mismatch", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-2",
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, false);
  assert.equal(readDecision.reason, "company_mismatch");
  assert.equal(readDecision.status, 403);
  assert.equal(manageDecision.allowed, false);
  assert.equal(manageDecision.reason, "company_mismatch");
  assert.equal(manageDecision.status, 403);
});

test("cabinet editor cannot read or manage reporting for cabinet resources", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-parent",
      companyId: "company-1",
      roleByCabinetId: { "cab-parent": "cabinet_editor" },
    },
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, false);
  assert.equal(readDecision.message, "Cabinet admin access required for reporting reads");
  assert.equal(manageDecision.allowed, false);
  assert.equal(manageDecision.message, "Cabinet admin access required for reporting management");
});

test("parent cabinet admin can read reporting but cannot derive child raw write", async () => {
  const readDecision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
    action: "read_reporting",
  });

  const childWriteDecision = await authorizeUserAction({
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-child",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-child",
      companyId: "company-1",
      roleByCabinetId: {},
    },
    action: "write_raw",
  });

  assert.equal(readDecision.allowed, true);
  assert.equal(childWriteDecision.allowed, false);
  assert.equal(childWriteDecision.reason, "cabinet_mismatch");
});

test("cabinet admin reporting access requires parent cabinet context for read and manage", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    cabinetContext: null,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    cabinetContext: null,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, false);
  assert.equal(readDecision.reason, "missing_cabinet_context");
  assert.equal(readDecision.status, 400);
  assert.equal(manageDecision.allowed, false);
  assert.equal(manageDecision.reason, "missing_cabinet_context");
  assert.equal(manageDecision.status, 400);
});

test("reporting actions still allow company admin override without active membership resolution", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-2"],
      roleByCompanyId: { "company-1": "company_admin" },
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, true);
  assert.equal(manageDecision.allowed, true);
});

test("reporting actions still allow company admin override without active company context", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: null,
      membershipCompanyIds: ["company-1"],
      roleByCompanyId: { "company-1": "company_admin" },
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, true);
  assert.equal(manageDecision.allowed, true);
});

test("reporting actions can still resolve through cabinet admin context when resource cabinet id is absent", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: null,
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, true);
  assert.equal(manageDecision.allowed, true);
});

test("company admin reporting override still requires cabinet context when resource cabinet id is absent", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
      roleByCompanyId: { "company-1": "company_admin" },
    },
    resourceContext: {
      ...baseResource,
      cabinetId: null,
      companyId: "company-1",
      requiresCabinetContext: true,
    },
    cabinetContext: null,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, false);
  assert.equal(readDecision.reason, "missing_cabinet_context");
  assert.equal(readDecision.status, 400);
  assert.equal(manageDecision.allowed, false);
  assert.equal(manageDecision.reason, "missing_cabinet_context");
  assert.equal(manageDecision.status, 400);
});

test("cabinet admin reporting access still rejects company mismatch when cabinet context is present", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: "company-2",
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, false);
  assert.equal(readDecision.reason, "company_mismatch");
  assert.equal(readDecision.status, 403);
  assert.equal(manageDecision.allowed, false);
  assert.equal(manageDecision.reason, "company_mismatch");
  assert.equal(manageDecision.status, 403);
});

test("cabinet admin reporting access still allows missing resource company id when cabinet context is present", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: null,
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, true);
  assert.equal(manageDecision.allowed, true);
});

test("company admin reporting override still allows missing resource company id when cabinet context is present", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
      roleByCompanyId: { "company-1": "company_admin" },
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-parent",
      companyId: null,
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, true);
  assert.equal(manageDecision.allowed, true);
});

test("reporting actions still reject known company mismatch when resource cabinet id is absent", async () => {
  const cabinetAdminInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: null,
      companyId: "company-2",
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const companyAdminInput = {
    ...cabinetAdminInput,
    companyContext: {
      ...cabinetAdminInput.companyContext,
      roleByCompanyId: { "company-1": "company_admin" },
    },
  };

  const cabinetReadDecision = await authorizeUserAction({
    ...cabinetAdminInput,
    action: "read_reporting",
  });
  const cabinetManageDecision = await authorizeUserAction({
    ...cabinetAdminInput,
    action: "manage_reporting",
  });
  const companyReadDecision = await authorizeUserAction({
    ...companyAdminInput,
    action: "read_reporting",
  });
  const companyManageDecision = await authorizeUserAction({
    ...companyAdminInput,
    action: "manage_reporting",
  });

  assert.equal(cabinetReadDecision.allowed, false);
  assert.equal(cabinetReadDecision.reason, "company_mismatch");
  assert.equal(cabinetReadDecision.status, 403);
  assert.equal(cabinetManageDecision.allowed, false);
  assert.equal(cabinetManageDecision.reason, "company_mismatch");
  assert.equal(cabinetManageDecision.status, 403);

  assert.equal(companyReadDecision.allowed, false);
  assert.equal(companyReadDecision.reason, "company_mismatch");
  assert.equal(companyReadDecision.status, 403);
  assert.equal(companyManageDecision.allowed, false);
  assert.equal(companyManageDecision.reason, "company_mismatch");
  assert.equal(companyManageDecision.status, 403);
});

test("reporting fallback does not bypass known resource cabinet mismatches when company id is missing", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
      roleByCompanyId: { "company-1": "company_admin" },
    },
    resourceContext: {
      ...baseResource,
      cabinetId: "cab-other",
      companyId: null,
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, false);
  assert.equal(readDecision.reason, "cabinet_mismatch");
  assert.equal(readDecision.status, 403);
  assert.equal(manageDecision.allowed, false);
  assert.equal(manageDecision.reason, "cabinet_mismatch");
  assert.equal(manageDecision.status, 403);
});

test("cabinet admin reporting access still allows missing resource company and cabinet ids when cabinet context is present", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    resourceContext: {
      ...baseResource,
      cabinetId: null,
      companyId: null,
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, true);
  assert.equal(manageDecision.allowed, true);
});

test("company admin reporting override still allows missing resource company and cabinet ids when cabinet context is present", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
      roleByCompanyId: { "company-1": "company_admin" },
    },
    resourceContext: {
      ...baseResource,
      cabinetId: null,
      companyId: null,
      requiresCabinetContext: true,
    },
    cabinetContext: parentCabinetAdminContext,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, true);
  assert.equal(manageDecision.allowed, true);
});

test("company admin unresolved ownership override still requires concrete cabinet context", async () => {
  const sharedInput = {
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
      roleByCompanyId: { "company-1": "company_admin" },
    },
    resourceContext: {
      ...baseResource,
      cabinetId: null,
      companyId: null,
      requiresCabinetContext: true,
    },
    cabinetContext: null,
  };

  const readDecision = await authorizeUserAction({
    ...sharedInput,
    action: "read_reporting",
  });
  const manageDecision = await authorizeUserAction({
    ...sharedInput,
    action: "manage_reporting",
  });

  assert.equal(readDecision.allowed, false);
  assert.equal(readDecision.reason, "missing_cabinet_context");
  assert.equal(readDecision.status, 400);
  assert.equal(manageDecision.allowed, false);
  assert.equal(manageDecision.reason, "missing_cabinet_context");
  assert.equal(manageDecision.status, 400);
});

test("reporting relation service rejects self link", async () => {
  const relationService = createReportingRelationService({
    provider: createInMemoryReportingRelationProvider(),
  });

  await assert.rejects(
    () =>
      relationService.createLink({
        companyId: "company-1",
        parentCabinetId: "cab-1",
        childCabinetId: "cab-1",
        actor: editorActor,
      }),
    (error: unknown) => error instanceof ReportingRelationValidationError && error.code === "self_link",
  );
});

test("reporting relation service rejects unresolved cabinets", async () => {
  const relationService = createReportingRelationService({
    provider: createInMemoryReportingRelationProvider(),
    cabinetOwnershipProvider: {
      async getCabinet({ cabinetId }) {
        if (cabinetId === "cab-parent") {
          return { cabinetId, companyId: "company-1" };
        }
        return null;
      },
    },
  });

  await assert.rejects(
    () =>
      relationService.createLink({
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child",
        actor: editorActor,
      }),
    (error: unknown) => error instanceof ReportingRelationValidationError && error.code === "invalid_cabinet",
  );
});

test("reporting relation service resolves child ownership from cabinet mapping path fallback", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "company-1/child-cabinet") {
        return {
          companyId: "company-1",
          cabinetId: "cab-child",
        };
      }
      return null;
    },
  });

  const relationService = createReportingRelationService({
    provider: createInMemoryReportingRelationProvider(),
    cabinetOwnershipProvider: {
      async getCabinet({ cabinetId }) {
        if (cabinetId === "cab-parent") {
          return { cabinetId, companyId: "company-1" };
        }
        return null;
      },
    },
  });

  const link = await relationService.createLink({
    companyId: "company-1",
    parentCabinetId: "cab-parent",
    childCabinetId: "cab-child",
    childCabinetPath: "company-1/child-cabinet",
    actor: editorActor,
  });

  assert.equal(link.parentCabinetId, "cab-parent");
  assert.equal(link.childCabinetId, "cab-child");
  assert.equal(link.companyId, "company-1");
  assert.equal(link.status, "active");
});

test("reporting relation service resolves both parent and child ownership from cabinet mapping path fallback", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "company-1/parent-cabinet") {
        return {
          companyId: "company-1",
          cabinetId: "cab-parent",
        };
      }
      if (virtualPath === "company-1/child-cabinet") {
        return {
          companyId: "company-1",
          cabinetId: "cab-child",
        };
      }
      return null;
    },
  });

  const relationService = createReportingRelationService({
    provider: createInMemoryReportingRelationProvider(),
    cabinetOwnershipProvider: {
      async getCabinet() {
        return null;
      },
    },
  });

  const link = await relationService.createLink({
    companyId: "company-1",
    parentCabinetId: "cab-parent",
    parentCabinetPath: "company-1/parent-cabinet",
    childCabinetId: "cab-child",
    childCabinetPath: "company-1/child-cabinet",
    actor: editorActor,
  });

  assert.equal(link.parentCabinetId, "cab-parent");
  assert.equal(link.childCabinetId, "cab-child");
  assert.equal(link.companyId, "company-1");
  assert.equal(link.status, "active");
});

test("reporting relation service rejects duplicate active parent", async () => {
  const ownershipProvider: CabinetOwnershipProvider = {
    async getCabinet({ cabinetId }) {
      return {
        cabinetId,
        companyId: cabinetId === "cab-child" ? "company-1" : "company-1",
      };
    },
  };
  const relationService = createReportingRelationService({
    provider: createInMemoryReportingRelationProvider([
      {
        id: "link-1",
        companyId: "company-1",
        parentCabinetId: "cab-parent-a",
        childCabinetId: "cab-child",
        status: "active",
        createdBy: "seed",
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z",
      },
    ]),
    cabinetOwnershipProvider: ownershipProvider,
  });

  await assert.rejects(
    () =>
      relationService.createLink({
        companyId: "company-1",
        parentCabinetId: "cab-parent-b",
        childCabinetId: "cab-child",
        actor: editorActor,
      }),
    (error: unknown) =>
      error instanceof ReportingRelationValidationError && error.code === "duplicate_active_parent",
  );
});

test("reporting relation service rejects cross company links", async () => {
  const relationService = createReportingRelationService({
    provider: createInMemoryReportingRelationProvider(),
    cabinetOwnershipProvider: {
      async getCabinet({ cabinetId }) {
        if (cabinetId === "cab-parent") {
          return { cabinetId, companyId: "company-1" };
        }
        if (cabinetId === "cab-child") {
          return { cabinetId, companyId: "company-2" };
        }
        return null;
      },
    },
  });

  await assert.rejects(
    () =>
      relationService.createLink({
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child",
        actor: editorActor,
      }),
    (error: unknown) => error instanceof ReportingRelationValidationError && error.code === "cross_company",
  );
});

test("reporting relation service rejects reporting cycles", async () => {
  const relationService = createReportingRelationService({
    provider: createInMemoryReportingRelationProvider([
      {
        id: "link-1",
        companyId: "company-1",
        parentCabinetId: "cab-a",
        childCabinetId: "cab-b",
        status: "active",
        createdBy: "seed",
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z",
      },
      {
        id: "link-2",
        companyId: "company-1",
        parentCabinetId: "cab-b",
        childCabinetId: "cab-c",
        status: "active",
        createdBy: "seed",
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z",
      },
    ]),
    cabinetOwnershipProvider: {
      async getCabinet({ cabinetId }) {
        if (["cab-a", "cab-b", "cab-c"].includes(cabinetId)) {
          return { cabinetId, companyId: "company-1" };
        }
        return null;
      },
    },
  });

  await assert.rejects(
    () =>
      relationService.createLink({
        companyId: "company-1",
        parentCabinetId: "cab-c",
        childCabinetId: "cab-a",
        actor: editorActor,
      }),
    (error: unknown) => error instanceof ReportingRelationValidationError && error.code === "reporting_cycle",
  );
});

test("reporting snapshot schema builder freezes normalized payload", () => {
  const schema = buildReportingSnapshotSchema({
    generatedAt: "2026-04-22T10:00:00.000Z",
    summary: {
      cabinetPath: "cab-child",
      visibility: "children-1",
      pages: 4,
      childCabinetPaths: ["child-a", 42 as unknown as string, "child-b"],
      visibleCabinetNames: ["Visible A", null as unknown as string, "Visible B"],
    },
  });

  assert.equal(schema.version, 1);
  assert.equal(schema.generatedAt, "2026-04-22T10:00:00.000Z");
  assert.deepEqual(schema.summary, buildReportingSnapshotSummary({
    cabinetPath: "cab-child",
    visibility: "children-1",
    itemCount: 4,
    visibleChildrenCount: 0,
    totalChildrenCount: 0,
    activeAgentCount: 0,
    enabledJobCount: 0,
    inheritedAgentCount: 0,
    inheritedJobCount: 0,
    childCabinetPaths: ["child-a", "child-b"],
    childCabinetNames: [],
    visibleCabinetPaths: [],
    visibleCabinetNames: ["Visible A", "Visible B"],
  }));
  assert.deepEqual(Object.keys(schema.summary), [
    "cabinetPath",
    "visibility",
    "itemCount",
    "visibleChildrenCount",
    "totalChildrenCount",
    "activeAgentCount",
    "enabledJobCount",
    "inheritedAgentCount",
    "inheritedJobCount",
    "childCabinetPaths",
    "childCabinetNames",
    "visibleCabinetPaths",
    "visibleCabinetNames",
  ]);
});

test("reporting snapshot schema builder returns frozen defaults when summary is omitted", () => {
  const schema = buildReportingSnapshotSchema({
    generatedAt: "2026-04-22T10:30:00.000Z",
  });

  assert.equal(schema.version, 1);
  assert.equal(schema.generatedAt, "2026-04-22T10:30:00.000Z");
  assert.deepEqual(schema.summary, buildReportingSnapshotSummary({}));
  assert.deepEqual(Object.keys(schema.summary), [
    "cabinetPath",
    "visibility",
    "itemCount",
    "visibleChildrenCount",
    "totalChildrenCount",
    "activeAgentCount",
    "enabledJobCount",
    "inheritedAgentCount",
    "inheritedJobCount",
    "childCabinetPaths",
    "childCabinetNames",
    "visibleCabinetPaths",
    "visibleCabinetNames",
  ]);
});


test("reporting snapshot normalization preserves schema defaults and legacy item counts", async () => {
  const provider = createInMemoryReportingSnapshotProvider([
    {
      companyId: "company-1",
      parentCabinetId: "cab-parent",
      childCabinetId: "cab-child",
      summary: {
        pages: 7,
        childCabinetPaths: ["nested-a", 123 as unknown as string],
      },
      generatedAt: "2026-04-22T11:00:00.000Z",
    },
  ]);

  const snapshots = await provider.listSnapshotsForParent({
    companyId: "company-1",
    parentCabinetId: "cab-parent",
    childCabinetIds: ["cab-child"],
  });

  assert.equal(snapshots.length, 1);
  assert.deepEqual(snapshots[0]?.summary, buildReportingSnapshotSummary({
    cabinetPath: "cab-child",
    visibility: "private",
    itemCount: 7,
    childCabinetPaths: ["nested-a"],
  }));
});

test("reporting read service denies access without parent cabinet reporting permission", async () => {
  const readService = createReportingReadService({
    relationService: createReportingRelationService({
      provider: createInMemoryReportingRelationProvider([
        {
          id: "link-1",
          companyId: "company-1",
          parentCabinetId: "cab-parent",
          childCabinetId: "cab-child",
          status: "active",
          createdBy: "seed",
          createdAt: "2026-04-21T00:00:00.000Z",
          updatedAt: "2026-04-21T00:00:00.000Z",
        },
      ]),
    }),
    snapshotProvider: createInMemoryReportingSnapshotProvider([
      {
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child",
        summary: { pages: 2 },
        generatedAt: "2026-04-21T00:00:00.000Z",
      },
    ]),
  });

  await assert.rejects(
    () =>
      readService.getReportingForParent({
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        actor: editorActor,
        companyContext: {
          ...baseCompanyContext,
          companyId: "company-1",
          membershipCompanyIds: ["company-1"],
        },
        cabinetContext: {
          ...baseCabinetContext,
          cabinetId: "cab-parent",
          companyId: "company-1",
          roleByCabinetId: { "cab-parent": "cabinet_editor" },
        },
      }),
    (error: unknown) => {
      const decision = error instanceof Error && "decision" in error
        ? (error as Error & { decision?: { reason?: string; status?: number } }).decision
        : undefined;
      return decision?.reason === "forbidden" && decision.status === 403;
    },
  );
});

test("reporting API services expose active linked snapshots", async () => {
  setReportingRelationProvider(
    createInMemoryReportingRelationProvider([
      {
        id: "link-api-1",
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child-active",
        status: "active",
        createdBy: "seed",
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z",
      },
    ]),
  );
  setReportingSnapshotProvider(
    createInMemoryReportingSnapshotProvider([
      {
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child-active",
        summary: { pages: 5 },
        generatedAt: "2026-04-21T00:00:00.000Z",
      },
    ]),
  );
  resetReportingReadService();

  const relationService = getReportingRelationService();
  const readService = getReportingReadService();

  const links = await relationService.listLinksForCabinet({
    companyId: "company-1",
    cabinetId: "cab-parent",
  });
  const reporting = await readService.getReportingForParent({
    companyId: "company-1",
    parentCabinetId: "cab-parent",
    actor: editorActor,
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    cabinetContext: parentCabinetAdminContext,
  });

  assert.equal(links.length, 1);
  assert.equal(links[0]?.id, "link-api-1");
  assert.equal(reporting.scope.activeChildCabinetIds.length, 1);
  assert.equal(reporting.snapshots.length, 1);
  assert.deepEqual(reporting.snapshots[0]?.summary, {
    cabinetPath: "cab-child-active",
    visibility: "private",
    itemCount: 5,
    visibleChildrenCount: 0,
    totalChildrenCount: 0,
    activeAgentCount: 0,
    enabledJobCount: 0,
    inheritedAgentCount: 0,
    inheritedJobCount: 0,
    childCabinetPaths: [],
    childCabinetNames: [],
    visibleCabinetPaths: [],
    visibleCabinetNames: [],
  });
});


test("reporting scope validation rejects company mismatches before cabinet checks", async () => {
  const decision = await validateReportingScopeAlignment({
    companyId: "company-b",
    parentCabinetId: "cab-parent",
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-a",
      membershipCompanyIds: ["company-a"],
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-parent",
      companyId: "company-a",
    },
  });

  assert.equal(decision?.allowed, false);
  assert.equal(decision?.reason, "company_mismatch");
});

test("reporting scope validation rejects cabinet mismatches for parent cabinet", async () => {
  const decision = await validateReportingScopeAlignment({
    companyId: "company-a",
    parentCabinetId: "cab-parent",
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-a",
      membershipCompanyIds: ["company-a"],
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-other",
      companyId: "company-a",
    },
  });

  assert.equal(decision?.allowed, false);
  assert.equal(decision?.reason, "cabinet_mismatch");
});

test("reporting scope validation ignores unresolved company mismatches inferred from parent cabinet path mapping", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage() {
      return null;
    },
  });

  const decision = await validateReportingScopeAlignment({
    companyId: "company-a",
    parentCabinetId: "cab-parent",
    parentCabinetPath: "company-b/parent-cabinet",
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-a",
      membershipCompanyIds: ["company-a"],
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-parent",
      companyId: "company-a",
    },
  });

  assert.equal(decision, null);
});

test("reporting scope validation ignores unresolved cabinet mismatches inferred from parent cabinet path mapping", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage() {
      return null;
    },
  });

  const decision = await validateReportingScopeAlignment({
    companyId: "company-a",
    parentCabinetId: "cab-parent",
    parentCabinetPath: "company-a/other-cabinet",
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-a",
      membershipCompanyIds: ["company-a"],
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-parent",
      companyId: "company-a",
    },
  });

  assert.equal(decision, null);
});

test("reporting relation service updates link status", async () => {
  setReportingRelationProvider(
    createInMemoryReportingRelationProvider([
      {
        id: "link-update-1",
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child",
        status: "active",
        createdBy: "seed",
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z",
      },
    ]),
  );

  const relationService = getReportingRelationService();
  const updated = await relationService.updateLinkStatus({
    linkId: "link-update-1",
    status: "paused",
    actor: editorActor,
  });

  assert.equal(updated.status, "paused");
});

test("reporting read service rejects reporting scope company mismatch inferred from parent cabinet path mapping", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "company-2/parent-cabinet") {
        return {
          companyId: "company-2",
          cabinetId: "cab-parent",
        };
      }
      return null;
    },
  });

  const readService = createReportingReadService({
    relationService: createReportingRelationService({
      provider: createInMemoryReportingRelationProvider(),
    }),
    snapshotProvider: createInMemoryReportingSnapshotProvider(),
  });

  await assert.rejects(
    () =>
      readService.getReportingForParent({
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        parentCabinetPath: "company-2/parent-cabinet",
        actor: editorActor,
        companyContext: {
          ...baseCompanyContext,
          companyId: "company-1",
          membershipCompanyIds: ["company-1"],
        },
        cabinetContext: {
          ...baseCabinetContext,
          cabinetId: "cab-parent",
          companyId: "company-1",
          roleByCabinetId: { "cab-parent": "cabinet_admin" },
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      "decision" in error &&
      (error as Error & { decision?: { reason?: string } }).decision?.reason === "company_mismatch",
  );
});

test("reporting read service rejects reporting scope cabinet mismatch inferred from parent cabinet path mapping", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "company-1/other-parent") {
        return {
          companyId: "company-1",
          cabinetId: "cab-other",
        };
      }
      return null;
    },
  });

  const readService = createReportingReadService({
    relationService: createReportingRelationService({
      provider: createInMemoryReportingRelationProvider(),
    }),
    snapshotProvider: createInMemoryReportingSnapshotProvider(),
  });

  await assert.rejects(
    () =>
      readService.getReportingForParent({
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        parentCabinetPath: "company-1/other-parent",
        actor: editorActor,
        companyContext: {
          ...baseCompanyContext,
          companyId: "company-1",
          membershipCompanyIds: ["company-1"],
        },
        cabinetContext: {
          ...baseCabinetContext,
          cabinetId: "cab-parent",
          companyId: "company-1",
          roleByCabinetId: { "cab-parent": "cabinet_admin" },
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      "decision" in error &&
      (error as Error & { decision?: { reason?: string } }).decision?.reason === "cabinet_mismatch",
  );
});

test("reporting refresh service rejects reporting scope company mismatch inferred from parent cabinet path mapping", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "company-2/parent-cabinet") {
        return {
          companyId: "company-2",
          cabinetId: "cab-parent",
        };
      }
      return null;
    },
  });

  const refreshService = createReportingSnapshotRefreshService({
    relationService: createReportingRelationService({
      provider: createInMemoryReportingRelationProvider(),
    }),
    snapshotProvider: createInMemoryReportingSnapshotProvider(),
  });

  await assert.rejects(
    () =>
      refreshService.refreshSnapshotsForParent({
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        parentCabinetPath: "company-2/parent-cabinet",
      }),
    (error: unknown) =>
      error instanceof Error &&
      "decision" in error &&
      (error as Error & { decision?: { reason?: string } }).decision?.reason === "company_mismatch",
  );
});

test("reporting refresh service rejects reporting scope cabinet mismatch inferred from parent cabinet path mapping", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "company-1/other-parent") {
        return {
          companyId: "company-1",
          cabinetId: "cab-other",
        };
      }
      return null;
    },
  });

  const refreshService = createReportingSnapshotRefreshService({
    relationService: createReportingRelationService({
      provider: createInMemoryReportingRelationProvider(),
    }),
    snapshotProvider: createInMemoryReportingSnapshotProvider(),
  });

  await assert.rejects(
    () =>
      refreshService.refreshSnapshotsForParent({
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        parentCabinetPath: "company-1/other-parent",
      }),
    (error: unknown) =>
      error instanceof Error &&
      "decision" in error &&
      (error as Error & { decision?: { reason?: string } }).decision?.reason === "cabinet_mismatch",
  );
});

test("reporting route returns snapshots for authorized parent cabinet admin", async () => {
  const delegatedReadService = createReportingReadService({
    relationService: createReportingRelationService({
      provider: createInMemoryReportingRelationProvider([
        {
          id: "link-overview",
          companyId: "company-1",
          parentCabinetId: "cab-parent",
          childCabinetId: "cab-child",
          status: "active",
          createdAt: "2026-04-22T09:00:00.000Z",
          updatedAt: "2026-04-22T09:00:00.000Z",
          createdBy: "system",
        },
      ]),
    }),
    snapshotProvider: createInMemoryReportingSnapshotProvider([
      {
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child",
        generatedAt: "2026-04-22T09:05:00.000Z",
        summary: {
          cabinetPath: "cab-child",
          visibility: "own",
          itemCount: 5,
          activeAgentCount: 2,
          enabledJobCount: 1,
          totalChildrenCount: 0,
          visibleChildrenCount: 0,
        },
      },
    ]),
  });

  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_member" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });

  const response = await delegatedReadService.getReportingForParent({
    companyId: "company-1",
    parentCabinetId: "cab-parent",
    actor: editorActor,
    companyContext: companyAdminContext,
    cabinetContext: parentCabinetAdminContext,
  });

  assert.equal(Array.isArray(response.snapshots), true);
  assert.equal(response.scope.companyId, "company-1");
  assert.equal(response.scope.parentCabinetId, "cab-parent");
  assert.equal(response.scope.activeChildCabinetIds.length, 1);
  assert.equal(response.snapshots.length, 1);
  assert.equal(response.snapshots[0]?.childCabinetId, "cab-child");
  assert.equal(response.snapshots[0]?.summary.itemCount, 5);
  assert.equal(typeof response.snapshots[0]?.generatedAt, "string");
});


test("reporting read service rejects reporting scope company mismatch", async () => {
  const readService = createReportingReadService({
    relationService: createReportingRelationService({
      provider: createInMemoryReportingRelationProvider(),
    }),
    snapshotProvider: createInMemoryReportingSnapshotProvider(),
  });

  await assert.rejects(
    () =>
      readService.getReportingForParent({
        companyId: "company-b",
        parentCabinetId: "cab-parent",
        actor: editorActor,
        companyContext: {
          ...baseCompanyContext,
          companyId: "company-a",
          membershipCompanyIds: ["company-a"],
        },
        cabinetContext: {
          ...baseCabinetContext,
          cabinetId: "cab-parent",
          companyId: "company-a",
          roleByCabinetId: { "cab-parent": "cabinet_admin" },
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      "decision" in error &&
      (error as Error & { decision?: { reason?: string } }).decision?.reason === "company_mismatch",
  );
});

test("reporting route accepts mapped cabinetPath when it resolves to the requested company and cabinet", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_member" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage(virtualPath) {
      if (virtualPath === "company-1/parent-cabinet") {
        return {
          companyId: "company-1",
          cabinetId: "cab-parent",
        };
      }
      return null;
    },
  });
  setReportingRelationProvider(createInMemoryReportingRelationProvider());
  setReportingSnapshotProvider(createInMemoryReportingSnapshotProvider());

  const req = new NextRequest(
    "http://localhost/api/cabinets/cab-parent/reporting?companyId=company-1&cabinetPath=company-1/parent-cabinet",
    {
      method: "GET",
      headers: {
        "x-user-id": "editor-1",
        "x-user-name": "editor",
        "x-user-role": "editor",
        "x-company-id": "company-1",
        "x-cabinet-id": "cab-parent",
      },
    },
  );

  const response = await getCabinetReporting(req, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.scope?.companyId, "company-1");
  assert.equal(payload.scope?.parentCabinetId, "cab-parent");
});

test("validateReportingScopeAlignment ignores unresolved company mappings from cabinetPath", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage() {
      return null;
    },
  });

  const decision = await validateReportingScopeAlignment({
    companyId: "company-1",
    parentCabinetId: "cab-parent",
    parentCabinetPath: "company-2/parent-cabinet",
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-parent",
      companyId: "company-1",
      roleByCabinetId: { "cab-parent": "cabinet_admin" },
    },
  });

  assert.equal(decision, null);
});

test("validateReportingScopeAlignment ignores cabinetPath mappings that cannot be resolved", async () => {
  setCabinetResourceMappingProvider({
    async resolveCabinetForPage() {
      return null;
    },
  });

  const decision = await validateReportingScopeAlignment({
    companyId: "company-1",
    parentCabinetId: "cab-parent",
    parentCabinetPath: "company-1/unmapped-parent",
    companyContext: {
      ...baseCompanyContext,
      companyId: "company-1",
      membershipCompanyIds: ["company-1"],
    },
    cabinetContext: {
      ...baseCabinetContext,
      cabinetId: "cab-parent",
      companyId: "company-1",
      roleByCabinetId: { "cab-parent": "cabinet_admin" },
    },
  });

  assert.equal(decision, null);
});

test("reporting route rejects cabinet mismatch before refresh", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_member" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-other", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });

  const req = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting?companyId=company-1", {
    method: "GET",
    headers: {
      "x-user-id": "editor-1",
      "x-user-name": "editor",
      "x-user-role": "editor",
      "x-company-id": "company-1",
      "x-cabinet-id": "cab-other",
    },
  });

  const response = await getCabinetReporting(req, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(payload.error, "Requested reporting scope belongs to a different cabinet than the active cabinet");
});

test("reporting-links GET rejects company mismatch from active context", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_admin" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });

  const req = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting-links", {
    headers: {
      "x-user-id": "user-company-admin",
      "x-user-name": "company-admin",
      "x-user-role": "admin",
      "x-company-id": "company-2",
      "x-cabinet-id": "cab-parent",
    },
  });

  const response = await getCabinetReportingLinks(req, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(payload.error, "Access denied — requested company company-2 is not part of the actor's memberships");
});

test("reporting link scope isolates active children for a parent cabinet", () => {
  const scope = buildReportingLinkScope({
    companyId: "company-1",
    parentCabinetId: "cab-parent",
    links: [
      {
        id: "active-parent",
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child-a",
        status: "active",
        createdBy: "seed",
        createdAt: "2026-04-22T10:00:00.000Z",
        updatedAt: "2026-04-22T10:00:00.000Z",
      },
      {
        id: "paused-parent",
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child-b",
        status: "paused",
        createdBy: "seed",
        createdAt: "2026-04-22T10:00:00.000Z",
        updatedAt: "2026-04-22T10:00:00.000Z",
      },
      {
        id: "other-parent",
        companyId: "company-1",
        parentCabinetId: "cab-other",
        childCabinetId: "cab-child-c",
        status: "active",
        createdBy: "seed",
        createdAt: "2026-04-22T10:00:00.000Z",
        updatedAt: "2026-04-22T10:00:00.000Z",
      },
      {
        id: "other-company",
        companyId: "company-2",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child-d",
        status: "active",
        createdBy: "seed",
        createdAt: "2026-04-22T10:00:00.000Z",
        updatedAt: "2026-04-22T10:00:00.000Z",
      },
    ],
  });

  assert.equal(scope.links.length, 3);
  assert.equal(scope.activeLinks.length, 1);
  assert.deepEqual(scope.activeChildCabinetIds, ["cab-child-a"]);
});

test("reporting-links POST rejects non company admin", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_member" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });

  const req = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting-links", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-id": "editor-1",
      "x-user-name": "editor",
      "x-user-role": "editor",
      "x-company-id": "company-1",
    },
    body: JSON.stringify({ childCabinetId: "cab-child" }),
  });

  const response = await postCabinetReportingLinks(req, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, "Reporting links require both cabinets to resolve ownership (cab-parent -> cab-child)");
});

test("reporting route uses configured relation and snapshot providers", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_member" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });
  setReportingRelationProvider(
    createInMemoryReportingRelationProvider([
      {
        id: "link-route-service",
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child-from-service",
        status: "active",
        createdBy: "seed",
        createdAt: "2026-04-22T10:00:00.000Z",
        updatedAt: "2026-04-22T10:00:00.000Z",
      },
    ]),
  );
  setReportingSnapshotProvider(
    createInMemoryReportingSnapshotProvider([
      {
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child-from-service",
        generatedAt: "2026-04-22T10:00:00.000Z",
        summary: {
          cabinetId: "cab-child-from-service",
          cabinetPath: "cab-child-from-service",
          cabinetName: "Service Child",
          visibility: "all",
          itemCount: 9,
          activeAgentCount: 3,
          enabledJobCount: 2,
          totalChildrenCount: 4,
          visibleChildrenCount: 4,
        },
      },
    ]),
  );
  resetReportingReadService();

  const req = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting?companyId=company-1&cabinetPath=company-1/root-parent", {
    method: "GET",
    headers: {
      "x-user-id": "user-company-admin",
      "x-user-name": "company-admin",
      "x-user-role": "admin",
      "x-company-id": "company-1",
      "x-cabinet-id": "cab-parent",
    },
  });

  const response = await getCabinetReporting(req, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.scope?.companyId, "company-1");
  assert.equal(payload.scope?.parentCabinetId, "cab-parent");
  assert.equal(payload.scope?.parentCabinetPath, "company-1/root-parent");
  assert.deepEqual(payload.scope?.activeChildCabinetIds, ["cab-child-from-service"]);
  assert.equal(payload.snapshots?.length, 1);
  assert.equal(payload.snapshots?.[0]?.childCabinetId, "cab-child-from-service");
  assert.equal(payload.snapshots?.[0]?.summary.itemCount, 9);
});

test("reporting-links GET returns configured links for company admin", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_admin" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });
  setReportingRelationProvider(
    createInMemoryReportingRelationProvider([
      {
        id: "link-list-1",
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child-a",
        status: "active",
        createdBy: "seed",
        createdAt: "2026-04-22T10:00:00.000Z",
        updatedAt: "2026-04-22T10:00:00.000Z",
      },
      {
        id: "link-list-2",
        companyId: "company-1",
        parentCabinetId: "cab-parent",
        childCabinetId: "cab-child-b",
        status: "paused",
        createdBy: "seed",
        createdAt: "2026-04-22T10:05:00.000Z",
        updatedAt: "2026-04-22T10:06:00.000Z",
      },
    ]),
  );

  const req = new NextRequest(
    "http://localhost/api/cabinets/cab-parent/reporting-links?cabinetPath=company-1/root-parent",
    {
      headers: {
        "x-user-id": "user-company-admin",
        "x-user-name": "company-admin",
        "x-user-role": "admin",
        "x-company-id": "company-1",
        "x-cabinet-id": "cab-parent",
      },
    },
  );

  const response = await getCabinetReportingLinks(req, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.scope?.companyId, "company-1");
  assert.equal(payload.scope?.parentCabinetId, "cab-parent");
  assert.equal(payload.scope?.parentCabinetPath, "company-1/root-parent");
  assert.deepEqual(payload.scope?.activeChildCabinetIds, ["cab-child-a"]);
  assert.equal(payload.links.length, 2);
  assert.equal(payload.links[0]?.childCabinetId, "cab-child-a");
  assert.equal(payload.links[1]?.status, "paused");
});

test("reporting-links POST validates required child cabinet id", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_admin" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });
  setReportingRelationProvider(createInMemoryReportingRelationProvider());

  const req = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting-links", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-id": "editor-1",
      "x-user-name": "editor",
      "x-user-role": "editor",
      "x-company-id": "company-1",
    },
    body: JSON.stringify({ childCabinetId: "   " }),
  });

  const response = await postCabinetReportingLinks(req, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, "childCabinetId is required");
});

test("reporting-links POST returns invalid_cabinet when child ownership cannot be resolved", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_admin" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });
  setReportingRelationProvider(createInMemoryReportingRelationProvider());
  setCabinetOwnershipProvider({
    async getCabinet({ cabinetId }) {
      if (cabinetId === "cab-parent") {
        return { cabinetId, companyId: "company-1" };
      }
      return null;
    },
  });

  const req = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting-links", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-id": "editor-1",
      "x-user-name": "editor",
      "x-user-role": "editor",
      "x-company-id": "company-1",
    },
    body: JSON.stringify({ childCabinetId: "cab-child" }),
  });

  const response = await postCabinetReportingLinks(req, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.code, "invalid_cabinet");
});

test("reporting-links PATCH validates status values", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_admin" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });
  setReportingRelationProvider(createInMemoryReportingRelationProvider());

  const req = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting-links", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user-id": "editor-1",
      "x-user-name": "editor",
      "x-user-role": "editor",
      "x-company-id": "company-1",
    },
    body: JSON.stringify({ linkId: "link-1", status: "disabled" }),
  });

  const response = await patchCabinetReportingLinks(req, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, "Valid status is required");
});

test("reporting-links GET requires company context", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-2", role: "company_admin" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });

  const req = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting-links", {
    headers: {
      "x-user-id": "editor-1",
      "x-user-name": "editor",
      "x-user-role": "editor",
      "x-company-id": "company-2",
      "x-cabinet-id": "cab-parent",
    },
  });

  const response = await getCabinetReportingLinks(req, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(
    payload.error,
    "Access denied — requested cabinet cab-parent is not part of the actor's memberships"
  );
});

test("reporting route derives workspace company context from legacy company config when request company is absent", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "jyutech.cn", role: "company_admin" }],
        defaultCompanyId: null,
      };
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "jyutechcn-root", companyId: "jyutech.cn", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });
  setReportingRelationProvider(createInMemoryReportingRelationProvider());
  setReportingSnapshotProvider(createInMemoryReportingSnapshotProvider());

  const req = new NextRequest("http://localhost/api/cabinets/jyutechcn-root/reporting?cabinetPath=.", {
    headers: {
      "x-user-id": "editor-1",
      "x-user-name": "editor",
      "x-user-role": "editor",
      "x-cabinet-id": "jyutechcn-root",
    },
  });

  const response = await getCabinetReporting(req, {
    params: Promise.resolve({ cabinetId: "jyutechcn-root" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.scope.companyId, "jyutech.cn");
  assert.equal(payload.scope.parentCabinetId, "jyutechcn-root");
});

test("reporting routes derive legacy workspace company context for admin users without membership providers", async () => {
  setReportingRelationProvider(createInMemoryReportingRelationProvider());
  setReportingSnapshotProvider(createInMemoryReportingSnapshotProvider());

  const reportingReq = new NextRequest("http://localhost/api/cabinets/jyutechcn-root/reporting?cabinetPath=.", {
    headers: {
      "x-user-id": "22ee8838-b11d-4723-83ea-41e8233ed4a3",
      "x-user-name": "admin",
      "x-user-role": "admin",
      "x-cabinet-id": "jyutechcn-root",
    },
  });

  const reportingResponse = await getCabinetReporting(reportingReq, {
    params: Promise.resolve({ cabinetId: "jyutechcn-root" }),
  });
  const reportingPayload = await reportingResponse.json();

  assert.equal(reportingResponse.status, 200);
  assert.equal(reportingPayload.scope.companyId, "jyutech.cn");
  assert.equal(reportingPayload.scope.parentCabinetId, "jyutechcn-root");

  const linksReq = new NextRequest("http://localhost/api/cabinets/jyutechcn-root/reporting-links?cabinetPath=.", {
    headers: {
      "x-user-id": "22ee8838-b11d-4723-83ea-41e8233ed4a3",
      "x-user-name": "admin",
      "x-user-role": "admin",
      "x-cabinet-id": "jyutechcn-root",
    },
  });

  const linksResponse = await getCabinetReportingLinks(linksReq, {
    params: Promise.resolve({ cabinetId: "jyutechcn-root" }),
  });
  const linksPayload = await linksResponse.json();

  assert.equal(linksResponse.status, 200);
  assert.equal(linksPayload.scope.companyId, "jyutech.cn");
  assert.equal(linksPayload.scope.parentCabinetId, "jyutechcn-root");
});

test("reporting-links POST and PATCH work for company admin", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_admin" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "cab-parent", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });
  setReportingRelationProvider(createInMemoryReportingRelationProvider());
  setCabinetOwnershipProvider({
    async getCabinet({ cabinetId }) {
      if (cabinetId === "cab-parent" || cabinetId === "cab-child") {
        return { cabinetId, companyId: "company-1" };
      }
      return null;
    },
  });

  const createReq = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting-links", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-id": "editor-1",
      "x-user-name": "editor",
      "x-user-role": "editor",
      "x-company-id": "company-1",
    },
    body: JSON.stringify({
      childCabinetId: "cab-child",
      parentCabinetPath: "company-1/parent-cabinet",
      childCabinetPath: "company-1/child-cabinet",
    }),
  });

  const createResponse = await postCabinetReportingLinks(createReq, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const createPayload = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(createPayload.link.parentCabinetId, "cab-parent");
  assert.equal(createPayload.link.childCabinetId, "cab-child");

  const listReq = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting-links", {
    headers: {
      "x-user-id": "editor-1",
      "x-user-name": "editor",
      "x-user-role": "editor",
      "x-company-id": "company-1",
    },
  });
  const listResponse = await getCabinetReportingLinks(listReq, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const listPayload = await listResponse.json();

  assert.equal(listResponse.status, 200);
  assert.equal(listPayload.links.length, 1);

  const patchReq = new NextRequest("http://localhost/api/cabinets/cab-parent/reporting-links", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user-id": "editor-1",
      "x-user-name": "editor",
      "x-user-role": "editor",
      "x-company-id": "company-1",
    },
    body: JSON.stringify({ linkId: createPayload.link.id, status: "paused" }),
  });
  const patchResponse = await patchCabinetReportingLinks(patchReq, {
    params: Promise.resolve({ cabinetId: "cab-parent" }),
  });
  const patchPayload = await patchResponse.json();

  assert.equal(patchResponse.status, 200);
  assert.equal(patchPayload.link.status, "paused");
});

test("reporting-links POST resolves runtime cabinet ownership from manifest paths without injected providers", async () => {
  setCompanyMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ companyId: "company-1", role: "company_admin" }],
        defaultCompanyId: null,
      };
    },
    async getWorkspaceDefaultCompanyId() {
      return null;
    },
  });
  setCabinetMembershipProvider({
    async getMemberships() {
      return {
        memberships: [{ cabinetId: "jyutechcn-root", companyId: "company-1", role: "cabinet_admin" }],
        defaultCabinetId: null,
      };
    },
  });
  setReportingRelationProvider(createInMemoryReportingRelationProvider());

  const createReq = new NextRequest(
    "http://localhost/api/cabinets/jyutechcn-root/reporting-links?cabinetPath=.",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "editor-1",
        "x-user-name": "editor",
        "x-user-role": "editor",
        "x-company-id": "company-1",
      },
      body: JSON.stringify({
        childCabinetId: "vc-os",
        childCabinetPath: "vc-os",
        parentCabinetPath: ".",
      }),
    },
  );

  const createResponse = await postCabinetReportingLinks(createReq, {
    params: Promise.resolve({ cabinetId: "jyutechcn-root" }),
  });
  const createPayload = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(createPayload.link.parentCabinetId, "jyutechcn-root");
  assert.equal(createPayload.link.childCabinetId, "vc-os-root");
  assert.equal(createPayload.link.companyId, "company-1");
});
