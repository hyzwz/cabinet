import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { LocaleProvider } from "../src/components/i18n/locale-provider";
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

function withLocale(element: React.ReactElement, locale: "en" | "zh" = "en") {
  return React.createElement(LocaleProvider, { initialLocale: locale }, element);
}

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
          parentCabinetPath: "company/root",
          activeChildCabinetIds: ["company/ops"],
        },
      }) as never;
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        withLocale(
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
        ),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertReportingLinksContainerLoaded(html, ["company/ops", "Open cabinet"]);
        assert.match(html, /Active reporting links without snapshots|Snapshot freshness watchlist|Reporting health scope/);
        assert.match(html, /Reporting link scope/);
        assert.match(html, /Cabinet company\/root/);
        assert.match(html, /Company company/);
        assert.match(html, /1 active child link/);
        assert.match(html, /Scope-aligned active children are fully visible in this view\./);
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
        cabinetPath: "company/ops",
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
        cabinetPath: "company/ops",
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

test("reporting links zero state explains setup and focuses the first-link input", async () => {
  await withDomContainer(async (container, window) => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      createMockFetchResponse({
        links: [],
        scope: {
          companyId: "company",
          parentCabinetId: "company/root",
          parentCabinetPath: "company/root",
          activeChildCabinetIds: [],
        },
      }) as never) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        withLocale(
          React.createElement(ReportingLinksPanel, {
            cabinetPath: "company/root",
            snapshots: [],
            onRefreshSnapshots: async () => {},
          }),
        ),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertHtmlIncludesAll(html, [
          "No reporting links configured for this cabinet",
          "Add a child cabinet link below to define which workspaces should publish reporting snapshots here",
          "Add first reporting link",
        ]);
      });

      const ctaButton = Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Add first reporting link"),
      );
      const input = container.querySelector("input");
      assert.ok(ctaButton);
      assert.ok(input instanceof window.HTMLInputElement);

      await mounted.act(async () => {
        ctaButton?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });

      assert.equal(container.ownerDocument.activeElement, input);

      await mounted.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting containers localize reporting chrome and company-context errors", async () => {
  await withDomContainer(async (container) => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      createMockFetchResponse(
        { error: "Company context is required", code: "missing_company_context" },
        false,
      ) as never) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        withLocale(
          React.createElement(ReportingPanel, {
            cabinetPath: ".",
            snapshots: [],
            initialError: null,
            refreshToken: 0,
          }),
          "zh",
        ),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assert.match(html, /汇报/);
        assert.match(html, /刷新汇报/);
        assert.match(html, /需要公司上下文/);
        assert.doesNotMatch(html, /Company context is required/);
        assert.doesNotMatch(html, /Refresh reporting/);
      });

      await mounted.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting links panel forwards canonical cabinet ids for root cabinet requests", async () => {
  await withDomContainer(async (container) => {
    const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      return createMockFetchResponse({ links: [] }) as never;
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        withLocale(
          React.createElement(ReportingLinksPanel, {
            cabinetId: "jyutechcn-root",
            cabinetPath: ".",
            snapshots: [],
            onRefreshSnapshots: async () => {},
          } as React.ComponentProps<typeof ReportingLinksPanel>),
        ),
      );

      await waitForDomAssertion(() => {
        assert.equal(String(fetchCalls[0]?.input), "/api/cabinets/jyutechcn-root/reporting-links?cabinetPath=.");
      });

      await mounted.unmount();
    } finally {
      globalThis.fetch = previousFetch;
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
          parentCabinetPath: "company/other-root",
          activeChildCabinetIds: ["company/ops"],
        },
      }) as never;
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        withLocale(
          React.createElement(ReportingLinksPanel, {
            cabinetPath: "company/root",
            snapshots: [],
            onRefreshSnapshots: async () => {},
          }),
        ),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assert.match(html, /Link creation is scoped to company\/other-root\./);
        assert.match(html, /Cabinet company\/other-root/);
        assert.match(html, /Scope-aligned active children are fully visible in this view\./);
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

test("reporting links panel shows scope-aware status feedback after refresh-review actions and link status updates", async () => {
  await withDomContainer(async (container, window) => {
    const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const previousFetch = globalThis.fetch;
    const linkResponse = () =>
      createMockFetchResponse({
        links: [
          createReportingLink({ id: "link-1", childCabinetId: "company/ops", status: "active" }),
          createReportingLink({ id: "link-2", childCabinetId: "company/legal", status: "paused" }),
        ],
        scope: {
          companyId: "company",
          parentCabinetId: "company/root",
          parentCabinetPath: "company/root",
          activeChildCabinetIds: ["company/ops"],
        },
      }) as never;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      if (init?.method === "PATCH") {
        return createMockFetchResponse({ ok: true }) as never;
      }
      return linkResponse();
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        withLocale(
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
            ],
            onRefreshSnapshots: async () => {},
          }),
        ),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assert.match(html, /company\/legal/);
        assert.match(html, /active|paused/);
      });

      const statusButtons = Array.from(container.querySelectorAll("button")).filter((button) => {
        const label = button.textContent?.trim();
        return label === "active" || label === "paused" || label === "revoked";
      });
      assert.equal(statusButtons.length >= 3, true);

      await mounted.act(async () => {
        statusButtons.find((button) => button.textContent?.trim() === "paused")?.dispatchEvent(
          new window.MouseEvent("click", { bubbles: true }),
        );
      });

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assert.match(html, /Link paused and scope refreshed/);
      });

      const patchBodiesAfterPause = fetchCalls
        .filter((call) => call.init?.method === "PATCH" && typeof call.init.body === "string")
        .map((call) => String(call.init?.body));
      assert.ok(patchBodiesAfterPause.some((body) => body.includes('"status":"paused"')));

      const finalStatusButtons = Array.from(container.querySelectorAll("button")).filter((button) => {
        const label = button.textContent?.trim();
        return label === "active" || label === "paused" || label === "revoked";
      });

      await mounted.act(async () => {
        finalStatusButtons.find((button) => button.textContent?.trim() === "revoked")?.dispatchEvent(
          new window.MouseEvent("click", { bubbles: true }),
        );
      });

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assert.match(html, /Link revoked and scope refreshed/);
      });

      assert.ok(
        fetchCalls.some(
          (call) =>
            call.init?.method === "PATCH" &&
            typeof call.init.body === "string" &&
            call.init.body.includes('"status":"revoked"'),
        ),
      );

      await mounted.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting links panel surfaces state-aware missing-child guidance while refresh review is running", async () => {
  await withDomContainer(async (container) => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return createMockFetchResponse({
        links: [],
        scope: {
          companyId: "company",
          parentCabinetId: "company/root",
          parentCabinetPath: "company/root",
          activeChildCabinetIds: ["company/ops"],
        },
      }) as never;
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        withLocale(
          React.createElement(ReportingLinksPanel, {
            cabinetPath: "company/root",
            snapshots: [],
            onRefreshSnapshots: async () => {},
          }),
        ),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assert.match(html, /Scope tracks 1 active child cabinet not visible in this view yet\. Missing: company\/ops\./);
        assert.match(html, /Lead child cabinet company\/ops · next review scope gaps/);
      });

      await mounted.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting snapshot scope surfaces stale-specific lead child action hints", async () => {
  await withDomContainer(async (container) => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return createMockFetchResponse({
        snapshots: [
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
        scope: {
          companyId: "company",
          parentCabinetId: "company/root",
          parentCabinetPath: "company/root",
          activeChildCabinetIds: ["company/legal", "company/ops"],
        },
      }) as never;
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        withLocale(
          React.createElement(ReportingPanel, {
            cabinetPath: "company/root",
            snapshots: [],
            initialError: null,
            refreshToken: 0,
          }),
        ),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assert.match(html, /Lead child cabinet company\/ops · next use "Open first stale cabinet"/);
        assert.match(html, /Scope tracks 1 active child cabinet without visible snapshots in this view\. Missing: company\/ops\./);
      });

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
            parentCabinetPath: "company/root",
            activeChildCabinetIds: ["company/ops", "company/finance", "company/hr", "company/risk"],
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
          parentCabinetPath: "company/root",
          activeChildCabinetIds: ["company/finance", "company/ops"],
        },
      }) as never;
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        withLocale(
          React.createElement(ReportingPanel, {
            cabinetPath: "company/root",
            snapshots: [],
            initialError: "Failed to load cabinet reporting",
            refreshToken: 0,
          }),
        ),
      );

      let refreshHandler: (() => Promise<void>) | null = null;
      await mounted.render(
        withLocale(
          React.createElement(ReportingPanel, {
            cabinetPath: "company/root",
            snapshots: [],
            initialError: "Failed to load cabinet reporting",
            refreshToken: 0,
            onRefreshReady: (handler) => {
              refreshHandler = handler;
            },
          }),
        ),
      );

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertReportingSnapshotsContainerLoaded(html);
        assert.match(html, /Snapshots refreshed|No reporting snapshots available for this cabinet yet/);
        assert.match(html, /Reporting snapshot scope/);
        assert.match(html, /Cabinet company\/root/);
        assert.match(html, /Scope-aligned active children all have visible snapshots in this view\.|Scope tracks \d+ active child cabinets? without visible snapshots in this view\.( Missing: .+\.)?( Use ".+" or ".+" above after refreshing snapshots to inspect .+\.)?/);
      });

      assert.ok(refreshHandler);
      await mounted.act(async () => {
        await refreshHandler?.();
      });

      await waitForDomAssertion(() => {
        const html = mounted.html();
        assertHtmlIncludesAll(html, ["company/finance"]);
        assert.match(html, /Lead child cabinet company\/ops · next use "Open first stale cabinet"/);
        assert.match(html, /Scope tracks 1 active child cabinet without visible snapshots in this view\. Missing: company\/ops\. Use "Review stale links" or "Open first stale cabinet" above after refreshing snapshots to inspect the affected cabinets\. Start with company\/ops\. Snapshots refreshed; use the review\/open actions above if scope still shows missing active child cabinets\./);
      });

      await mounted.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting panel forwards canonical cabinet ids for root cabinet requests", async () => {
  await withDomContainer(async (container) => {
    const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      return createMockFetchResponse({ snapshots: [] }) as never;
    }) as typeof fetch;

    try {
      const mounted = await mountReactComponent(
        container,
        withLocale(
          React.createElement(ReportingPanel, {
            cabinetId: "jyutechcn-root",
            cabinetPath: ".",
            snapshots: [],
            initialError: null,
            refreshToken: 0,
          } as React.ComponentProps<typeof ReportingPanel>),
        ),
      );

      await waitForDomAssertion(() => {
        assert.equal(String(fetchCalls[0]?.input), "/api/cabinets/jyutechcn-root/reporting?cabinetPath=.");
      });

      await mounted.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
