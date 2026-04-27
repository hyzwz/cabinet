import test from "node:test";
import assert from "node:assert/strict";
import { act } from "react";
import { useReportingLinksData, useReportingSnapshotsData } from "../src/components/cabinets/use-reporting-data";
import {
  mountHookHarness,
  waitForDomAssertion,
  withDomContainer,
} from "./reporting-dom-test-utils";
import {
  createMockFetchResponse,
  createReportingLink,
  createReportingSnapshot,
} from "./reporting-test-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type FetchCall = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

type MockFetchResponse = ReturnType<typeof createMockFetchResponse>;

test("reporting hooks refresh links after create, review, and patch while refreshing snapshots", async () => {
  await withDomContainer(async (container) => {
    const now = Date.now();
    const freshTime = new Date(now - 60 * 60 * 1000).toISOString();
    const snapshots = [createReportingSnapshot({ childCabinetId: "company/ops", generatedAt: freshTime })];
    const initialLinks = [createReportingLink({ id: "link-1", childCabinetId: "company/ops", status: "active" })];
    const refreshedLinks = [
      ...initialLinks,
      createReportingLink({ id: "link-2", childCabinetId: "company/finance", status: "paused" }),
    ];

    const fetchCalls: FetchCall[] = [];
    const refreshSnapshotsCalls: string[] = [];
    const fetchQueue: MockFetchResponse[] = [
      createMockFetchResponse({ links: initialLinks }),
      createMockFetchResponse({ links: initialLinks }),
      createMockFetchResponse({ links: initialLinks }),
      createMockFetchResponse({ ok: true }),
      createMockFetchResponse({ links: refreshedLinks }),
      createMockFetchResponse({ ok: true }),
      createMockFetchResponse({ links: initialLinks }),
    ];

    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      const nextResponse = fetchQueue.shift();
      if (!nextResponse) {
        throw new Error("Unexpected fetch call");
      }
      return nextResponse as never;
    }) as typeof fetch;

    try {
      const hook = await mountHookHarness(container, () =>
        useReportingLinksData({
          cabinetPath: "company/root",
          snapshots,
          onRefreshSnapshots: async () => {
            refreshSnapshotsCalls.push("refresh");
          },
        }),
      );

      await waitForDomAssertion(() => {
        assert.equal(hook.current().links.length, 1);
        assert.equal(hook.current().links[0]?.id, "link-1");
      });

      await act(async () => {
        await hook.current().refreshLinks("review-missing");
      });

      await waitForDomAssertion(() => {
        assert.equal(hook.current().refreshNotice, "Links refreshed before missing review");
      });

      await act(async () => {
        await hook.current().refreshLinks("open-stale");
      });

      await waitForDomAssertion(() => {
        assert.equal(hook.current().refreshNotice, "Links refreshed before opening stale cabinet");
      });

      await act(async () => {
        hook.current().setNewChildCabinetId(" company/finance ");
      });
      await act(async () => {
        await hook.current().createLink();
      });

      await waitForDomAssertion(() => {
        assert.equal(hook.current().newChildCabinetId, "");
        assert.equal(hook.current().refreshNotice, "Links synced after create");
      });

      const createRequest = fetchCalls.find((call) => call.init?.method === "POST");
      assert.equal(String(createRequest?.input), "/api/cabinets/company%2Froot/reporting-links");
      assert.equal(createRequest?.init?.method, "POST");
      assert.match(String(createRequest?.init?.body), /"childCabinetId":"company\/finance"/);
      assert.equal(refreshSnapshotsCalls.length, 1);

      await act(async () => {
        await hook.current().updateLinkStatus("link-2", "revoked");
      });

      await waitForDomAssertion(() => {
        assert.ok(["Links synced after create", "Links synced after update"].includes(hook.current().refreshNotice ?? ""));
      });

      const patchRequest = fetchCalls.find((call) => call.init?.method === "PATCH");
      assert.equal(String(patchRequest?.input), "/api/cabinets/company%2Froot/reporting-links");
      assert.equal(patchRequest?.init?.method, "PATCH");
      assert.match(String(patchRequest?.init?.body), /"linkId":"link-2"/);
      assert.match(String(patchRequest?.init?.body), /"status":"revoked"/);
      assert.equal(refreshSnapshotsCalls.length, 2);

      await hook.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting hooks use canonical cabinet ids for root-cabinet links requests", async () => {
  await withDomContainer(async (container) => {
    const snapshots: CabinetReportingSnapshotView[] = [];
    const fetchCalls: FetchCall[] = [];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      return createMockFetchResponse({ links: [] }) as never;
    }) as typeof fetch;

    try {
      const hook = await mountHookHarness(container, () =>
        useReportingLinksData({
          cabinetPath: ".",
          cabinetId: "jyutechcn-root",
          snapshots,
        } as Parameters<typeof useReportingLinksData>[0]),
      );

      await waitForDomAssertion(() => {
        assert.equal(hook.current().links.length, 0);
      });

      assert.equal(
        String(fetchCalls[0]?.input),
        "/api/cabinets/jyutechcn-root/reporting-links?cabinetPath=.",
      );

      await hook.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting hooks include parent and child cabinet paths when creating root-cabinet links", async () => {
  await withDomContainer(async (container) => {
    const snapshots: CabinetReportingSnapshotView[] = [];
    const fetchCalls: FetchCall[] = [];
    const fetchQueue: MockFetchResponse[] = [
      createMockFetchResponse({ links: [] }),
      createMockFetchResponse({ ok: true }),
      createMockFetchResponse({ links: [] }),
    ];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      const nextResponse = fetchQueue.shift();
      if (!nextResponse) {
        throw new Error("Unexpected fetch call");
      }
      return nextResponse as never;
    }) as typeof fetch;

    try {
      const hook = await mountHookHarness(container, () =>
        useReportingLinksData({
          cabinetPath: ".",
          cabinetId: "jyutechcn-root",
          snapshots,
          onRefreshSnapshots: async () => {},
        } as Parameters<typeof useReportingLinksData>[0]),
      );

      await waitForDomAssertion(() => {
        assert.equal(hook.current().links.length, 0);
      });

      await act(async () => {
        hook.current().setNewChildCabinetId("company/finance");
      });
      await act(async () => {
        await hook.current().createLink();
      });

      const createRequest = fetchCalls.find((call) => call.init?.method === "POST");
      assert.equal(
        String(createRequest?.input),
        "/api/cabinets/jyutechcn-root/reporting-links?cabinetPath=.",
      );
      assert.match(String(createRequest?.init?.body), /"childCabinetId":"company\/finance"/);
      assert.match(String(createRequest?.init?.body), /"childCabinetPath":"company\/finance"/);
      assert.match(String(createRequest?.init?.body), /"parentCabinetPath":"\."/);

      await hook.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting hooks keep prior link state when create and patch requests fail", async () => {
  await withDomContainer(async (container) => {
    const now = Date.now();
    const freshTime = new Date(now - 60 * 60 * 1000).toISOString();
    const snapshots = [createReportingSnapshot({ childCabinetId: "company/ops", generatedAt: freshTime })];
    const initialLinks = [
      createReportingLink({ id: "link-1", childCabinetId: "company/ops", status: "active" }),
      createReportingLink({ id: "link-2", childCabinetId: "company/finance", status: "paused" }),
    ];

    const refreshSnapshotsCalls: string[] = [];
    const fetchQueue: MockFetchResponse[] = [
      createMockFetchResponse({ links: initialLinks }),
      createMockFetchResponse({ error: "Create denied" }, false),
      createMockFetchResponse({ error: "Patch denied" }, false),
    ];

    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      const nextResponse = fetchQueue.shift();
      if (!nextResponse) {
        throw new Error("Unexpected fetch call");
      }
      return nextResponse as never;
    }) as typeof fetch;

    try {
      const hook = await mountHookHarness(container, () =>
        useReportingLinksData({
          cabinetPath: "company/root",
          snapshots,
          onRefreshSnapshots: async () => {
            refreshSnapshotsCalls.push("refresh");
          },
        }),
      );

      await waitForDomAssertion(() => {
        assert.equal(hook.current().links.length, 2);
        assert.equal(hook.current().links[0]?.id, "link-1");
        assert.equal(hook.current().links[1]?.id, "link-2");
      });

      await act(async () => {
        hook.current().setNewChildCabinetId("company/legal");
      });
      await act(async () => {
        await hook.current().createLink();
      });

      await waitForDomAssertion(() => {
        assert.equal(hook.current().error, "Create denied");
        assert.deepEqual(
          hook.current().links.map((link) => link.id),
          ["link-1", "link-2"],
        );
        assert.equal(hook.current().newChildCabinetId, "company/legal");
        assert.equal(hook.current().isSaving, false);
      });

      await act(async () => {
        await hook.current().updateLinkStatus("link-2", "revoked");
      });

      await waitForDomAssertion(() => {
        assert.equal(hook.current().error, "Patch denied");
        assert.deepEqual(
          hook.current().links.map((link) => link.id),
          ["link-1", "link-2"],
        );
        assert.equal(hook.current().isSaving, false);
      });

      assert.equal(refreshSnapshotsCalls.length, 0);

      await hook.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting hooks preserve prior snapshots when refresh fails after initial error", async () => {
  await withDomContainer(async (container) => {
    const now = Date.now();
    const staleTime = new Date(now - 30 * 60 * 60 * 1000).toISOString();
    const freshTime = new Date(now - 90 * 60 * 1000).toISOString();
    const initialSnapshots = [createReportingSnapshot({ childCabinetId: "company/ops", generatedAt: staleTime })];
    const refreshedSnapshots = [createReportingSnapshot({ childCabinetId: "company/ops", generatedAt: freshTime })];

    const fetchQueue: MockFetchResponse[] = [
      createMockFetchResponse({ error: "Boot error" }, false),
      createMockFetchResponse({ snapshots: refreshedSnapshots }),
      createMockFetchResponse({ snapshots: refreshedSnapshots }),
      createMockFetchResponse({ error: "Refresh failed" }, false),
    ];

    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      const nextResponse = fetchQueue.shift();
      if (!nextResponse) {
        throw new Error("Unexpected fetch call");
      }
      return nextResponse as never;
    }) as typeof fetch;

    try {
      const hook = await mountHookHarness(container, () =>
        useReportingSnapshotsData({
          cabinetPath: "company/root",
          initialSnapshots,
          initialError: null,
          refreshToken: 0,
        }),
      );

      await waitForDomAssertion(() => {
        assert.equal(hook.current().error, "Boot error");
        assert.equal(hook.current().snapshots[0]?.generatedAt, staleTime);
      });

      await act(async () => {
        await hook.current().refreshSnapshots("review-stale");
      });

      await waitForDomAssertion(() => {
        assert.equal(hook.current().refreshNotice, "Snapshots refreshed before stale review");
      });

      await act(async () => {
        await hook.current().refreshSnapshots("open-missing");
      });

      await waitForDomAssertion(() => {
        assert.equal(hook.current().refreshNotice, "Snapshots refreshed before opening missing cabinet");
      });

      await act(async () => {
        await hook.current().refreshSnapshots("manual");
      });

      await waitForDomAssertion(() => {
        assert.ok([
          "Snapshots refreshed before opening missing cabinet",
          "Snapshots refreshed manually",
          null,
        ].includes(hook.current().refreshNotice));
      });

      await hook.rerender(() =>
        useReportingSnapshotsData({
          cabinetPath: "company/root",
          initialSnapshots,
          initialError: null,
          refreshToken: 2,
        }),
      );

      await waitForDomAssertion(() => {
        assert.equal(hook.current().snapshots[0]?.generatedAt, freshTime);
        assert.equal(hook.current().staleSnapshotCount, 0);
      });

      await hook.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("reporting hooks use canonical cabinet ids for root-cabinet snapshot requests", async () => {
  await withDomContainer(async (container) => {
    const initialSnapshots: CabinetReportingSnapshotView[] = [];
    const fetchCalls: FetchCall[] = [];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      return createMockFetchResponse({ snapshots: [] }) as never;
    }) as typeof fetch;

    try {
      const hook = await mountHookHarness(container, () =>
        useReportingSnapshotsData({
          cabinetPath: ".",
          cabinetId: "jyutechcn-root",
          initialSnapshots,
          initialError: null,
          refreshToken: 0,
        } as Parameters<typeof useReportingSnapshotsData>[0]),
      );

      await waitForDomAssertion(() => {
        assert.equal(hook.current().snapshots.length, 0);
      });

      assert.equal(
        String(fetchCalls[0]?.input),
        "/api/cabinets/jyutechcn-root/reporting?cabinetPath=.",
      );

      await hook.unmount();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
