import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { ReportingLinksPanel, ReportingPanel } from "../src/components/cabinets/reporting-containers";
import { useAppStore } from "../src/stores/app-store";
import {
  assertHtmlIncludesAll,
  assertReportingLinksContainerLoaded,
  assertReportingSnapshotsContainerLoaded,
} from "./reporting-assertion-utils";
import {
  mountReactComponent,
  waitForDomAssertion,
  withDomContainer,
} from "./reporting-dom-test-utils";
import {
  createMockFetchResponse,
  createReportingLink,
  createReportingSnapshot,
} from "./reporting-test-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("reporting containers render links panel with fetched groups, refresh-review actions, and child cabinet navigation", async () => {
  await withDomContainer(async (container, window) => {
    const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      return createMockFetchResponse({
        links: [
          createReportingLink({ id: "link-1", childCabinetId: "company/ops", status: "active" }),
          createReportingLink({ id: "link-2", childCabinetId: "company/legal", status: "revoked" }),
        ],
        scope: {
          companyId: "company",
          parentCabinetId: "company/root",
          activeChildCabinetIds: ["company/ops"],
        },
      }) as never;
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        React.createElement(ReportingLinksPanel, {
          cabinetPath: "company/root",
          snapshots: [
            createReportingSnapshot({
              childCabinetId: "company/ops",
              summary: {
                cabinetPath: "company/ops",
                childCabinetPaths: ["company/ops"],
                visibleCabinetPaths: ["company/ops"],
              },
            }),
            createReportingSnapshot({
              childCabinetId: "company/legal",
              generatedAt: "2026-04-20T08:00:00.000Z",
              summary: {
                cabinetPath: "company/legal",
                childCabinetPaths: ["company/legal"],
                visibleCabinetPaths: ["company/legal"],
              },
            }),
          ],
          onRefreshSnapshots: async () => {},
        }),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertReportingLinksContainerLoaded(html, ["company/ops", "Open cabinet"]);
        assert.match(html, /Active reporting links without snapshots|Snapshot freshness watchlist|Reporting health scope/);
        assert.match(html, /Reporting link scope/);
        assert.match(html, /Company company/);
        assert.match(html, /1 active child link/);
        assert.match(html, /Add a child cabinet that should publish reporting snapshots into company\/root\./);
        assert.match(html, /placeholder="company\/root\/child-cabinet"/);
      });

      const input = container.querySelector("input");
      assert.ok(input);
      assert.equal(input.getAttribute("placeholder"), "company/root/child-cabinet");

      const reviewButtons = Array.from(container.querySelectorAll("button")).filter((button) =>
        button.textContent?.includes("Refresh then review"),
      );
      assert.equal(reviewButtons.length, 1);

      await mounted.act(async () => {
        reviewButtons[0]?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertHtmlIncludesAll(html, ["Links refreshed before stale review"]);
      });

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertHtmlIncludesAll(html, [
          "Refresh and open cabinet",
          "Links refreshed before stale review",
        ]);
      });

      const openAfterRefreshButton = Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Refresh and open cabinet"),
      );
      assert.ok(openAfterRefreshButton);

      await mounted.act(async () => {
        openAfterRefreshButton?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertHtmlIncludesAll(html, [
          "Links refreshed before opening stale cabinet",
        ]);
      });

      assert.deepEqual(useAppStore.getState().section, {
        type: "cabinet",
        cabinetPath: "company/legal",
        mode: "cabinet",
      });

      useAppStore.setState({ section: { type: "dashboard" } });

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertHtmlIncludesAll(html, ["Open first stale cabinet"]);
      });

      const openButton = Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Open first stale cabinet"),
      );
      assert.ok(openButton);

      await mounted.act(async () => {
        openButton?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });

      assert.deepEqual(useAppStore.getState().section, {
        type: "cabinet",
        cabinetPath: "company/legal",
        mode: "cabinet",
      });
      assert.equal(String(fetchCalls[0]?.input), "/api/cabinets/company%2Froot/reporting-links");

      await mounted.unmount();
    } finally {
      globalThis.fetch = previousFetch;
      useAppStore.setState({
        section: { type: "dashboard" },
        navigationMenuOpen: false,
        cabinetSidebarOpen: true,
        configSheetOpen: false,
        draftsSidebarOpen: false,
        draftsSheetOpen: false,
        activeCabinetId: null,
      });
    }
  });
});

test("reporting links panel disables create action when scope parent differs from current cabinet", async () => {
  await withDomContainer(async (container) => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return createMockFetchResponse({
        links: [createReportingLink({ id: "link-1", childCabinetId: "company/ops", status: "active" })],
        scope: {
          companyId: "company",
          parentCabinetId: "company/other-root",
          activeChildCabinetIds: ["company/ops"],
        },
      }) as never;
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        React.createElement(ReportingLinksPanel, {
          cabinetPath: "company/root",
          snapshots: [],
          onRefreshSnapshots: async () => {},
        }),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assert.match(html, /Link creation is scoped to company\/other-root\./);
        assert.match(html, /placeholder="company\/other-root\/child-cabinet"/);
      });

      const addButton = Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Add link"),
      );
      assert.ok(addButton);
      assert.equal(addButton.disabled, true);

      await mounted.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting containers register snapshot refresh handler and render snapshot feedback", async () => {
  await withDomContainer(async (container) => {
    const previousFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount += 1;
      if (callCount === 1) {
        return createMockFetchResponse({
          snapshots: [
            createReportingSnapshot({
              childCabinetId: "company/ops",
              summary: {
                cabinetPath: "company/ops",
                childCabinetPaths: ["company/ops"],
                visibleCabinetPaths: ["company/ops"],
              },
            }),
          ],
          scope: {
            companyId: "company",
            parentCabinetId: "company/root",
            activeChildCabinetIds: ["company/ops"],
          },
        }) as never;
      }
      return createMockFetchResponse({
        snapshots: [
          createReportingSnapshot({
            childCabinetId: "company/finance",
            summary: {
              cabinetPath: "company/finance",
              childCabinetPaths: ["company/finance"],
              visibleCabinetPaths: ["company/finance"],
            },
          }),
        ],
        scope: {
          companyId: "company",
          parentCabinetId: "company/root",
          activeChildCabinetIds: ["company/finance"],
        },
      }) as never;
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        React.createElement(ReportingPanel, {
          cabinetPath: "company/root",
          snapshots: [],
          initialError: "Failed to load cabinet reporting",
          refreshToken: 0,
        }),
      );

      let refreshHandler: (() => Promise<void>) | null = null;
      await mounted.render(
        React.createElement(ReportingPanel, {
          cabinetPath: "company/root",
          snapshots: [],
          initialError: "Failed to load cabinet reporting",
          refreshToken: 0,
          onRefreshReady: (handler) => {
            refreshHandler = handler;
          },
        }),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertReportingSnapshotsContainerLoaded(html);
        assert.match(html, /Snapshots refreshed|No reporting snapshots available for this cabinet yet/);
        assert.match(html, /Reporting snapshot scope/);
        assert.match(html, /Cabinet company\/root/);
      });

      assert.ok(refreshHandler);
      await mounted.act(async () => {
        await refreshHandler?.();
      });

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertHtmlIncludesAll(html, ["company/finance"]);
      });

      await mounted.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
