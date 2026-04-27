import test from "node:test";
import assert from "node:assert/strict";
import type { SelectedSection } from "@/stores/app-store";
import React from "react";
import { openArtifactPath } from "@/lib/navigation/open-artifact-path";
import {
  getArtifactLabel,
  normalizeArtifactRecordPath,
  resolveArtifactTargetPath,
} from "@/lib/navigation/artifact-path";
import { buildRouteHash, pushRouteHash, replaceRouteHash } from "@/lib/navigation/hash-route";
import { useHashRoute } from "@/hooks/use-hash-route";
import { useAppStore } from "@/stores/app-store";
import { useEditorStore } from "@/stores/editor-store";
import { useTreeStore } from "@/stores/tree-store";
import {
  mountReactComponent,
  waitForDomAssertion,
  withDomContainer,
} from "./reporting-dom-test-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("normalizeArtifactRecordPath hides markdown implementation filenames", () => {
  assert.equal(normalizeArtifactRecordPath("每日摘要/index.md"), "每日摘要");
  assert.equal(normalizeArtifactRecordPath("./每日摘要/2026-04-23.md"), "每日摘要/2026-04-23");
  assert.equal(getArtifactLabel("每日摘要/index.md"), "每日摘要");
  assert.equal(getArtifactLabel("每日摘要/2026-04-23.md"), "2026-04-23");
});

test("resolveArtifactTargetPath scopes cabinet-relative artifacts to the active cabinet", () => {
  const section: SelectedSection = {
    type: "page",
    mode: "cabinet",
    cabinetPath: "x-每日资讯",
  };

  assert.equal(
    resolveArtifactTargetPath("每日摘要/2026-04-23.md", section),
    "x-每日资讯/每日摘要/2026-04-23"
  );
  assert.equal(
    resolveArtifactTargetPath("每日摘要/index.md", section),
    "x-每日资讯/每日摘要"
  );
});

test("pushRouteHash appends an entry for artifact navigation instead of replacing history", () => {
  const previousWindow = globalThis.window;
  const storage = new Map<string, string>();
  const pushCalls: string[] = [];
  const history = {
    pushState: (_state: unknown, _title: string, url?: string | URL | null) => {
      const next = String(url ?? "");
      pushCalls.push(next);
      window.location.hash = next;
    },
  };

  globalThis.window = {
    location: { hash: "#/ops/agents" },
    history,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
  } as Window & typeof globalThis;

  try {
    const section: SelectedSection = {
      type: "page",
      mode: "cabinet",
      cabinetPath: "x-每日资讯",
    };
    const targetPath = "x-每日资讯/每日摘要/2026-04-23";

    pushRouteHash(section, targetPath);

    const expectedHash = buildRouteHash(section, targetPath);
    assert.deepEqual(pushCalls, [expectedHash]);
    assert.equal(storage.get("cabinet.last-route"), expectedHash);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("openArtifactPath preserves a back-stack entry when hash sync subscribers are active", async () => {
  const previousWindow = globalThis.window;
  const storage = new Map<string, string>();
  const historyCalls: string[] = [];
  const history = {
    pushState: (_state: unknown, _title: string, url?: string | URL | null) => {
      const next = String(url ?? "");
      historyCalls.push(`push:${next}`);
      window.location.hash = next;
    },
    replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
      const next = String(url ?? "");
      historyCalls.push(`replace:${next}`);
      window.location.hash = next;
    },
  };
  const section: SelectedSection = {
    type: "page",
    mode: "cabinet",
    cabinetPath: "x-每日资讯",
  };
  const targetPath = "x-每日资讯/每日摘要/2026-04-23";
  const expectedHash = buildRouteHash(section, targetPath);
  const originalApp = useAppStore.getState();
  const originalTree = useTreeStore.getState();
  const originalEditor = useEditorStore.getState();

  globalThis.window = {
    location: { hash: "#/ops/agents" },
    history,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
  } as Window & typeof globalThis;

  useTreeStore.setState({
    selectedPath: null,
    expandedPaths: new Set(),
    loadTree: async () => {},
    selectPage: (path) => useTreeStore.setState({ selectedPath: path }),
    expandPath: () => {},
  });
  useEditorStore.setState({
    currentPath: null,
    loadPage: async (path) => {
      useEditorStore.setState({ currentPath: path });
    },
  });

  const unsubApp = useAppStore.subscribe((state, prev) => {
    if (
      state.section.type !== prev.section.type ||
      state.section.slug !== prev.section.slug ||
      state.section.mode !== prev.section.mode ||
      state.section.cabinetPath !== prev.section.cabinetPath
    ) {
      const selectedPath = useTreeStore.getState().selectedPath;
      if (state.section.type === "page" && !selectedPath) {
        return;
      }
      const hash = buildRouteHash(state.section, selectedPath);
      if (window.location.hash !== hash) {
        replaceRouteHash(state.section, selectedPath);
      }
    }
  });

  const unsubTree = useTreeStore.subscribe((state, prev) => {
    if (state.selectedPath !== prev.selectedPath && state.selectedPath) {
      const hash = buildRouteHash(useAppStore.getState().section, state.selectedPath);
      if (window.location.hash !== hash) {
        replaceRouteHash(useAppStore.getState().section, state.selectedPath);
      }
    }
  });

  try {
    await openArtifactPath("每日摘要/2026-04-23.md", section);

    assert.equal(historyCalls[0], `push:${expectedHash}`);
    assert.ok(!historyCalls.includes(`replace:${expectedHash}`));
    assert.equal(useTreeStore.getState().selectedPath, targetPath);
    assert.equal(useEditorStore.getState().currentPath, targetPath);
  } finally {
    unsubApp();
    unsubTree();
    useAppStore.setState(originalApp);
    useTreeStore.setState(originalTree);
    useEditorStore.setState(originalEditor);
    globalThis.window = previousWindow;
  }
});

test("useHashRoute pushes a new history entry when switching between regular pages", async () => {
  await withDomContainer(async (container, window) => {
    const previousApp = useAppStore.getState();
    const previousTree = useTreeStore.getState();
    const previousEditor = useEditorStore.getState();
    const previousPushState = window.history.pushState;
    const previousReplaceState = window.history.replaceState;
    const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const historyCalls: string[] = [];

    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 0)) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((handle: number) =>
      clearTimeout(handle)) as typeof cancelAnimationFrame;

    window.history.pushState = ((state, title, url) => {
      historyCalls.push(`push:${String(url ?? "")}`);
      window.location.hash = String(url ?? "");
    }) as History["pushState"];
    window.history.replaceState = ((state, title, url) => {
      historyCalls.push(`replace:${String(url ?? "")}`);
      window.location.hash = String(url ?? "");
    }) as History["replaceState"];

    useAppStore.setState({ section: { type: "home" } });
    useTreeStore.setState({
      selectedPath: null,
      expandedPaths: new Set(),
      loadTree: async () => {},
      selectPage: (path) => useTreeStore.setState({ selectedPath: path }),
      expandPath: () => {},
    });
    useEditorStore.setState({
      currentPath: null,
      loadPage: async (path) => {
        useEditorStore.setState({ currentPath: path });
      },
      clear: () => {
        useEditorStore.setState({ currentPath: null, content: "", frontmatter: null });
      },
    });

    window.location.hash = "#/page/notes/one";

    function Harness() {
      useHashRoute();
      return null;
    }

    const mounted = await mountReactComponent(container, React.createElement(Harness));

    try {
      await waitForDomAssertion(() => {
        assert.equal(useAppStore.getState().section.type, "page");
        assert.equal(useTreeStore.getState().selectedPath, "notes/one");
        assert.equal(useEditorStore.getState().currentPath, "notes/one");
      });

      historyCalls.length = 0;

      await mounted.act(async () => {
        useTreeStore.getState().selectPage("notes/two");
        await useEditorStore.getState().loadPage("notes/two");
      });

      const expectedHash = "#/page/notes%2Ftwo";
      assert.ok(
        historyCalls.includes(`push:${expectedHash}`),
        `Expected pushState for ${expectedHash}, saw ${historyCalls.join(", ")}`
      );
      assert.ok(
        !historyCalls.includes(`replace:${expectedHash}`),
        `Did not expect replaceState for ${expectedHash}, saw ${historyCalls.join(", ")}`
      );
    } finally {
      await mounted.unmount();
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
      window.history.pushState = previousPushState;
      window.history.replaceState = previousReplaceState;
      useAppStore.setState(previousApp);
      useTreeStore.setState(previousTree);
      useEditorStore.setState(previousEditor);
    }
  });
});
