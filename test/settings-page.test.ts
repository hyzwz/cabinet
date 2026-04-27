import assert from "node:assert/strict";
import test from "node:test";
import React from "react";

import { SettingsPage } from "../src/components/settings/settings-page";
import { LocaleProvider } from "../src/components/i18n/locale-provider";
import { useAppStore } from "../src/stores/app-store";
import { useTreeStore } from "../src/stores/tree-store";
import { useAuthStore } from "../src/stores/auth-store";
import {
  mountReactComponent,
  waitForDomAssertion,
  withDomContainer,
} from "./reporting-dom-test-utils";

type JsonPayload = Record<string, unknown>;

type MockResponseOptions = {
  status?: number;
};

function jsonResponse(body: JsonPayload, options: MockResponseOptions = {}): Response {
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

function createSettingsConfig() {
  return {
    mcp_servers: {
      github: {
        name: "GitHub MCP",
        command: "npx -y @modelcontextprotocol/server-github",
        enabled: true,
        env: {
          GITHUB_TOKEN: "ghp_secret",
          GITHUB_ORG: "cabinet",
        },
        description: "GitHub issues and pull requests",
      },
      slack: {
        name: "Slack MCP",
        command: "npx -y @modelcontextprotocol/server-slack",
        enabled: false,
        env: {
          SLACK_BOT_TOKEN: "",
        },
        description: "Slack workspace automation",
      },
    },
    notifications: {
      browser_push: true,
      telegram: { enabled: true, bot_token: "123:bot", chat_id: "987654" },
      slack_webhook: { enabled: false, url: "https://hooks.slack.test/services/abc" },
      email: { enabled: true, frequency: "daily" as const, to: "ops@example.com" },
    },
    scheduling: {
      max_concurrent_agents: 4,
      default_heartbeat_interval: "15m",
      active_hours: "08:00-20:00",
      pause_on_error: true,
    },
  };
}

function renderSettingsPage() {
  return React.createElement(LocaleProvider, null, React.createElement(SettingsPage));
}

function createStorageStub(): Storage {
  return {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  } as Storage;
}

function setupSettingsTestEnvironment(tab: "integrations" | "notifications") {
  globalThis.localStorage = createStorageStub();
  useAppStore.setState({ section: { type: "settings", slug: tab } });
}

function findButtonByLabel(container: HTMLDivElement, label: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll("button"));
  const match = buttons.find((button) => button.textContent?.includes(label));
  assert.ok(match, `Expected button with label containing \"${label}\"`);
  return match as HTMLButtonElement;
}

function findInputByLabelText(container: HTMLDivElement, labelText: string): HTMLInputElement {
  const labels = Array.from(container.querySelectorAll("label"));
  const label = labels.find((entry) => entry.textContent?.includes(labelText));
  assert.ok(label, `Expected label containing \"${labelText}\"`);
  const fieldContainer = label!.parentElement;
  const input = fieldContainer?.querySelector("input");
  assert.ok(input, `Expected input for label \"${labelText}\"`);
  return input as HTMLInputElement;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const view = input.ownerDocument.defaultView;
  assert.ok(view, "Expected DOM window for input events");
  input.value = value;
  input.dispatchEvent(new view.Event("input", { bubbles: true }));
  input.dispatchEvent(new view.Event("change", { bubbles: true }));
}

function clickElement(element: HTMLElement) {
  const view = element.ownerDocument.defaultView;
  assert.ok(view, "Expected DOM window for mouse events");
  element.dispatchEvent(new view.MouseEvent("click", { bubbles: true }));
}

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;
const originalTreeState = useTreeStore.getState();
const originalAuthState = useAuthStore.getState();
const originalAppState = useAppStore.getState();

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
  if (typeof window !== "undefined") {
    useTreeStore.setState({
      ...originalTreeState,
      showHiddenFiles: false,
    });
    useAuthStore.setState({
      ...originalAuthState,
      user: null,
      authMode: "none",
    });
    useAppStore.setState({
      ...originalAppState,
      section: { type: "settings", slug: "providers" },
    });
  }
});

test("settings integrations tab renders editable integration summary from config", async () => {
  const config = createSettingsConfig();
  const requests: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push(`${init?.method ?? "GET"} ${url}`);

    if (url === "/api/agents/providers") {
      return jsonResponse({ providers: [], defaultProvider: "", defaultModel: "", defaultEffort: "" });
    }
    if (url === "/api/agents/config/integrations") {
      return jsonResponse(config);
    }
    if (url === "/api/system/data-dir") {
      return jsonResponse({ dataDir: "/tmp/cabinet" });
    }

    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;

  await withDomContainer(async (container) => {
    setupSettingsTestEnvironment("integrations");
    const mounted = await mountReactComponent(container, renderSettingsPage());

    await waitForDomAssertion(() => {
      const html = mounted.html();
      assert.match(html, /Configured servers/);
      assert.match(html, /1\/2/);
      assert.match(html, /Enabled servers/);
      assert.match(html, /GitHub MCP/);
      assert.match(html, /Needs credentials/);
      assert.match(html, /Pause on error enabled/);
      assert.match(html, /15m/);
      assert.match(html, /08:00-20:00/);
    });

    await mounted.unmount();
  });

  assert.ok(requests.includes("GET /api/agents/config/integrations"));
});

test("settings integrations tab surfaces editable scheduling controls", async () => {
  const config = createSettingsConfig();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url === "/api/agents/providers") {
      return jsonResponse({ providers: [], defaultProvider: "", defaultModel: "", defaultEffort: "" });
    }
    if (url === "/api/agents/config/integrations" && method === "GET") {
      return jsonResponse(config);
    }
    if (url === "/api/system/data-dir") {
      return jsonResponse({ dataDir: "/tmp/cabinet" });
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  }) as typeof fetch;

  await withDomContainer(async (container) => {
    setupSettingsTestEnvironment("integrations");
    const mounted = await mountReactComponent(container, renderSettingsPage());

    await waitForDomAssertion(() => {
      assert.ok(container.textContent?.includes("Scheduling posture"));
    });

    const heartbeatInput = findInputByLabelText(container, "Heartbeat interval");
    assert.equal(heartbeatInput.value, "15m");

    const saveButton = findButtonByLabel(container, "Save integrations");
    assert.ok(!saveButton.disabled);

    await mounted.unmount();
  });
});

test("settings integrations tab renders save failure feedback when persistence fails", async () => {
  const config = createSettingsConfig();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url === "/api/agents/providers") {
      return jsonResponse({ providers: [], defaultProvider: "", defaultModel: "", defaultEffort: "" });
    }
    if (url === "/api/agents/config/integrations" && method === "GET") {
      return jsonResponse(config);
    }
    if (url === "/api/agents/config/integrations" && method === "POST") {
      return jsonResponse({ error: "Unable to persist integrations" }, { status: 500 });
    }
    if (url === "/api/system/data-dir") {
      return jsonResponse({ dataDir: "/tmp/cabinet" });
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  }) as typeof fetch;

  await withDomContainer(async (container) => {
    setupSettingsTestEnvironment("integrations");
    const mounted = await mountReactComponent(container, renderSettingsPage());

    await waitForDomAssertion(() => {
      assert.ok(container.textContent?.includes("Save integrations"));
    });

    await mounted.act(async () => {
      clickElement(findButtonByLabel(container, "Save integrations"));
    });

    await waitForDomAssertion(() => {
      assert.ok(container.textContent?.includes("Unable to save integrations right now."));
    });

    await mounted.unmount();
  });
});

test("settings notifications tab renders delivery summary and alert policy from config", async () => {
  const config = createSettingsConfig();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/agents/providers") {
      return jsonResponse({ providers: [], defaultProvider: "", defaultModel: "", defaultEffort: "" });
    }
    if (url === "/api/agents/config/integrations") {
      return jsonResponse(config);
    }
    if (url === "/api/system/data-dir") {
      return jsonResponse({ dataDir: "/tmp/cabinet" });
    }

    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;

  await withDomContainer(async (container) => {
    setupSettingsTestEnvironment("notifications");
    const mounted = await mountReactComponent(container, renderSettingsPage());

    await waitForDomAssertion(() => {
      const html = mounted.html();
      assert.match(html, /Configured channels/);
      assert.match(html, /4\/4/);
      assert.match(html, /Enabled channels/);
      assert.match(html, />3</);
      assert.match(html, /Email digest daily/);
      assert.match(html, /Browser push/);
      assert.match(html, /Telegram/);
      assert.match(html, /Slack webhook/);
      assert.match(html, /Email digest/);
      assert.match(html, /Agent health degradation or paused runs/);
      assert.match(html, /Always on/);
    });

    await mounted.unmount();
  });
});

test("settings notifications tab surfaces save and test controls as available actions", async () => {
  const config = createSettingsConfig();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url === "/api/agents/providers") {
      return jsonResponse({ providers: [], defaultProvider: "", defaultModel: "", defaultEffort: "" });
    }
    if (url === "/api/agents/config/integrations" && method === "GET") {
      return jsonResponse(config);
    }
    if (url === "/api/agents/config/notifications/test" && method === "POST") {
      return jsonResponse({ success: true, message: "Test notification sent" });
    }
    if (url === "/api/system/data-dir") {
      return jsonResponse({ dataDir: "/tmp/cabinet" });
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  }) as typeof fetch;

  await withDomContainer(async (container) => {
    setupSettingsTestEnvironment("notifications");
    const mounted = await mountReactComponent(container, renderSettingsPage());

    await waitForDomAssertion(() => {
      const saveButton = findButtonByLabel(container, "Save notifications");
      const testButton = findButtonByLabel(container, "Send test");
      assert.ok(saveButton);
      assert.equal(saveButton.disabled, false);
      assert.ok(testButton);
      assert.equal(testButton.disabled, false);
    });

    await mounted.unmount();
  });
});

test("settings notifications tab sends test notification and renders feedback", async () => {
  const config = createSettingsConfig();
  const requests: Array<{ method: string; url: string; body?: string }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body =
      typeof init?.body === "string"
        ? init.body
        : init?.body instanceof URLSearchParams
          ? init.body.toString()
          : undefined;
    requests.push({ method, url, body });

    if (url === "/api/agents/providers") {
      return jsonResponse({ providers: [], defaultProvider: "", defaultModel: "", defaultEffort: "" });
    }
    if (url === "/api/agents/config/integrations" && method === "GET") {
      return jsonResponse(config);
    }
    if (url === "/api/agents/config/notifications/test" && method === "POST") {
      return jsonResponse({ success: true, message: "Test notification sent" });
    }
    if (url === "/api/system/data-dir") {
      return jsonResponse({ dataDir: "/tmp/cabinet" });
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  }) as typeof fetch;

  await withDomContainer(async (container) => {
    setupSettingsTestEnvironment("notifications");
    const mounted = await mountReactComponent(container, renderSettingsPage());

    await waitForDomAssertion(() => {
      assert.ok(container.textContent?.includes("Send test"));
    });

    await mounted.act(async () => {
      clickElement(findButtonByLabel(container, "Send test"));
    });

    await waitForDomAssertion(() => {
      assert.ok(container.textContent?.includes("Test notification sent"));
    });

    await mounted.unmount();
  });

  const testRequest = requests.find(
    (request) => request.method === "POST" && request.url === "/api/agents/config/notifications/test",
  );
  assert.ok(testRequest, "Expected notification test request");
});
