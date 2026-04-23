// Must be the very first import so Base UI's useIsoLayoutEffect captures
// React.useLayoutEffect instead of noop — see test/dom-preload.ts for details.
import "./dom-preload";

import assert from "node:assert/strict";
import test from "node:test";
import React from "react";

import { LocaleProvider } from "../src/components/i18n/locale-provider";
import { LOCALE_STORAGE_KEY } from "../src/lib/i18n/messages";
import { TreeNode as TreeNodeComponent } from "../src/components/sidebar/tree-node";
import { useTreeStore } from "../src/stores/tree-store";
import { useEditorStore } from "../src/stores/editor-store";
import { useAppStore } from "../src/stores/app-store";
import type { TreeNode } from "../src/types";
import {
  mountReactComponent,
  waitForDomAssertion,
  withDomContainer,
} from "./reporting-dom-test-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The node under test: slug of last path segment === "current-cabinet"
// so opening rename with title "Current cabinet" triggers the "unchanged" validation
const TEST_NODE: TreeNode = {
  path: "company/current-cabinet",
  name: "current-cabinet",
  type: "file",
  frontmatter: { title: "Current cabinet" },
};

// Node for the successful-rename test: its title slug ("my-page-title") differs
// from the path slug ("my-page"), so the dialog opens with the submit button
// already enabled — no programmatic input change required.
const SUBMIT_READY_NODE: TreeNode = {
  path: "company/my-page",
  name: "my-page",
  type: "file",
  frontmatter: { title: "My Page Title" },
};

function findSubmitButton(doc: Document): HTMLButtonElement {
  const button = doc.querySelector('button[type="submit"]');
  assert.ok(button, "Expected submit button");
  return button as HTMLButtonElement;
}

// Override Zustand store actions with test doubles before each test
function setupStores(renamePage: (path: string, newName: string) => Promise<void>) {
  useTreeStore.setState({
    nodes: [],
    selectedPath: null,
    expandedPaths: new Set(),
    loading: false,
    dragOverPath: null,
    showHiddenFiles: false,
    loadTree: async () => {},
    selectPage: () => {},
    toggleExpand: () => {},
    expandPath: () => {},
    createPage: async () => {},
    deletePage: async () => {},
    movePage: async () => {},
    renamePage,
    setDragOver: () => {},
    setShowHiddenFiles: () => {},
    toggleHiddenFiles: () => {},
  });

  useEditorStore.setState({
    currentPath: null,
    content: "",
    frontmatter: null,
    saveStatus: "idle",
    isDirty: false,
    loadPage: async () => {},
    updateContent: () => {},
    updateFrontmatter: () => {},
    save: async () => {},
    clear: () => {},
  });

  useAppStore.setState({
    section: { type: "home" },
    terminalOpen: false,
    terminalTabs: [],
    activeTerminalTab: null,
    sidebarCollapsed: false,
    aiPanelCollapsed: false,
    cabinetVisibilityModes: {},
    taskPanelConversation: null,
    setSection: () => {},
    toggleTerminal: () => {},
    closeTerminal: () => {},
    addTerminalTab: () => {},
    removeTerminalTab: () => {},
    setActiveTerminalTab: () => {},
    openAgentTab: () => {},
    setSidebarCollapsed: () => {},
    setAiPanelCollapsed: () => {},
    setCabinetVisibilityMode: () => {},
    setTaskPanelConversation: () => {},
  });
}

// Right-click the ContextMenuTrigger, wait for the popup portal, click Rename,
// then wait for the rename dialog input to appear.
async function openRenameDialogViaContextMenu(
  doc: Document,
  mounted: { act: (fn: () => void | Promise<void>) => Promise<void> },
) {
  const trigger = doc.querySelector("[data-slot='context-menu-trigger']");
  assert.ok(trigger, "Expected [data-slot='context-menu-trigger'] in the rendered tree row");

  // Dispatch contextmenu event (right-click) to open the Base UI context menu
  await mounted.act(async () => {
    trigger.dispatchEvent(
      new doc.defaultView!.MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );
  });

  // The context menu popup renders via Base UI Portal to document.body.
  // Find the "Rename" menu item by role and text content.
  let renameItem: HTMLElement | null = null;
  await waitForDomAssertion(() => {
    const items = Array.from(doc.querySelectorAll("[role='menuitem']"));
    const item = items.find((el) => el.textContent?.trim() === "Rename");
    assert.ok(item, "Expected 'Rename' menuitem in context menu portal");
    renameItem = item as HTMLElement;
  }, 30);

  // Click the Rename item to trigger openRenameDialog()
  await mounted.act(async () => {
    renameItem!.click();
  });

  // Wait for the rename dialog (also a portal) input to appear in document.body
  await waitForDomAssertion(() => {
    const input = doc.querySelector("input");
    assert.ok(input, "Expected rename input to appear after clicking Rename");
  }, 30);
}

test("TreeNode rename: unchanged name shows validation guidance and disables submit", async () => {
  await withDomContainer(async (container) => {
    container.ownerDocument.defaultView?.localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    setupStores(async () => {});

    const mounted = await mountReactComponent(
      container,
      React.createElement(
        LocaleProvider,
        null,
        React.createElement(TreeNodeComponent, { node: TEST_NODE, depth: 0 }),
      ),
    );

    try {
      const doc = container.ownerDocument;
      await openRenameDialogViaContextMenu(doc, mounted);

      // Dialog opens pre-filled with the current title "Current cabinet".
      // slugify("Current cabinet") === "current-cabinet" === currentSlug → validation fires.
      await waitForDomAssertion(() => {
        const html = doc.body.innerHTML;
        assert.match(html, /Choose a different name before renaming/);
        const submitButton = findSubmitButton(doc);
        assert.equal(submitButton.disabled, true, "Submit must be disabled when name is unchanged");
      }, 30);
    } finally {
      await mounted.unmount();
    }
  });
});

test("TreeNode rename: valid rename calls renamePage and shows success badge on tree row", async () => {
  await withDomContainer(async (container) => {
    container.ownerDocument.defaultView?.localStorage.setItem(LOCALE_STORAGE_KEY, "en");

    const renameCalls: Array<{ path: string; newName: string }> = [];
    setupStores(async (path, newName) => {
      renameCalls.push({ path, newName });
    });

    // SUBMIT_READY_NODE has title "My Page Title" whose slug ("my-page-title") differs
    // from the path slug ("my-page"), so the dialog opens with submit already enabled.
    const mounted = await mountReactComponent(
      container,
      React.createElement(
        LocaleProvider,
        null,
        React.createElement(TreeNodeComponent, { node: SUBMIT_READY_NODE, depth: 0 }),
      ),
    );

    try {
      const doc = container.ownerDocument;
      await openRenameDialogViaContextMenu(doc, mounted);

      // Confirm submit is already enabled (title slug ≠ path slug → no validation error)
      await waitForDomAssertion(() => {
        const submitButton = findSubmitButton(doc);
        assert.equal(submitButton.disabled, false, "Submit must be enabled when title slug differs from path slug");
      }, 30);

      // Submit the rename form
      await mounted.act(async () => {
        const form = doc.querySelector("form");
        assert.ok(form, "Expected rename form");
        form.dispatchEvent(
          new doc.defaultView!.Event("submit", { bubbles: true, cancelable: true }),
        );
      });

      // renamePage must have been called with the node path and the pre-filled title
      await waitForDomAssertion(() => {
        assert.deepEqual(renameCalls, [
          { path: "company/my-page", newName: "My Page Title" },
        ]);
      }, 30);

      // Success badge must appear on the real tree row (inside the container, not the portal)
      await waitForDomAssertion(() => {
        const html = doc.body.innerHTML;
        assert.match(html, /Renamed successfully/);
      }, 30);
    } finally {
      await mounted.unmount();
    }
  });
});
