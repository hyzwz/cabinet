import assert from "node:assert/strict";
import test from "node:test";
import { validateRenameTarget } from "@/app/api/pages/[...path]/route";

import { resetApiClientFetch, setApiClientFetch, type ApiFetch } from "../src/lib/api/client";
import { useAppStore } from "../src/stores/app-store";
import { useTreeStore } from "../src/stores/tree-store";

const originalTreeState = useTreeStore.getState();
const originalAppState = useAppStore.getState();

function createJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

test.afterEach(() => {
  resetApiClientFetch();
  useTreeStore.setState({
    ...originalTreeState,
    nodes: [],
    selectedPath: null,
    expandedPaths: new Set<string>(),
    loading: false,
    dragOverPath: null,
    showHiddenFiles: false,
  });
  useAppStore.setState({ ...originalAppState, section: { type: "home" } });
});

test("renamePage syncs selected path and cabinet section when renaming cabinet root", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const loadTreeCalls: string[] = [];

  setApiClientFetch((async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    const url = String(input);
    if (url === "/api/pages/company/old-cabinet" && init?.method === "PATCH") {
      return createJsonResponse({ newPath: "company/renamed-cabinet" });
    }
    if (url === "/api/tree") {
      loadTreeCalls.push(url);
      return createJsonResponse([]);
    }
    throw new Error(`Unexpected request: ${url}`);
  }) as ApiFetch);

  useTreeStore.setState({
    ...useTreeStore.getState(),
    selectedPath: "company/old-cabinet/child-page",
  });
  useAppStore.setState({
    section: {
      type: "cabinet",
      mode: "cabinet",
      cabinetPath: "company/old-cabinet",
    },
  });

  await useTreeStore.getState().renamePage("company/old-cabinet", "Renamed cabinet");

  assert.equal(useTreeStore.getState().selectedPath, "company/renamed-cabinet/child-page");
  assert.deepEqual(useAppStore.getState().section, {
    type: "cabinet",
    mode: "cabinet",
    cabinetPath: "company/renamed-cabinet",
  });
  assert.equal(loadTreeCalls.length, 1);
  assert.equal(String(calls[0]?.input), "/api/pages/company/old-cabinet");
});

test("renamePage syncs cabinet-scoped page section when parent cabinet path changes", async () => {
  setApiClientFetch((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/pages/company/old-cabinet" && init?.method === "PATCH") {
      return createJsonResponse({ newPath: "company/renamed-cabinet" });
    }
    if (url === "/api/tree") {
      return createJsonResponse([]);
    }
    throw new Error(`Unexpected request: ${url}`);
  }) as ApiFetch);

  useTreeStore.setState({
    ...useTreeStore.getState(),
    selectedPath: "company/old-cabinet/page-a",
  });
  useAppStore.setState({
    section: {
      type: "page",
      mode: "cabinet",
      cabinetPath: "company/old-cabinet",
    },
  });

  await useTreeStore.getState().renamePage("company/old-cabinet", "Renamed cabinet");

  assert.equal(useTreeStore.getState().selectedPath, "company/renamed-cabinet/page-a");
  assert.deepEqual(useAppStore.getState().section, {
    type: "page",
    mode: "cabinet",
    cabinetPath: "company/renamed-cabinet",
  });
});

test("renamePage leaves unrelated section paths unchanged", async () => {
  setApiClientFetch((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/pages/company/old-cabinet" && init?.method === "PATCH") {
      return createJsonResponse({ newPath: "company/renamed-cabinet" });
    }
    if (url === "/api/tree") {
      return createJsonResponse([]);
    }
    throw new Error(`Unexpected request: ${url}`);
  }) as ApiFetch);

  useTreeStore.setState({
    ...useTreeStore.getState(),
    selectedPath: "company/another-cabinet/page-b",
  });
  useAppStore.setState({
    section: {
      type: "cabinet",
      mode: "cabinet",
      cabinetPath: "company/another-cabinet",
    },
  });

  await useTreeStore.getState().renamePage("company/old-cabinet", "Renamed cabinet");

  assert.equal(useTreeStore.getState().selectedPath, "company/another-cabinet/page-b");
  assert.deepEqual(useAppStore.getState().section, {
    type: "cabinet",
    mode: "cabinet",
    cabinetPath: "company/another-cabinet",
  });
});

test("validateRenameTarget rejects empty rename target", () => {
  const result = validateRenameTarget("company/root", "   ");

  assert.equal(result.status, 400);
  assert.equal(result.error, "Rename target is required");
  assert.equal(result.normalizedName, null);
});

test("validateRenameTarget rejects unchanged rename target", () => {
  const result = validateRenameTarget("company/root", "root");

  assert.equal(result.status, 409);
  assert.equal(result.error, "Rename target matches current path");
  assert.equal(result.normalizedName, "root");
});
