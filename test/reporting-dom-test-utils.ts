import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// Keys written by installWindowPolyfills that must be captured/restored
// alongside the core DOM globals so tests don't leak them into later tests.
const POLYFILL_KEYS = [
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "ResizeObserver",
  "IntersectionObserver",
  "PointerEvent",
  "DOMRect",
  "DOMRectReadOnly",
  "customElements",
  "CSS",
  "matchMedia",
  "scrollTo",
  "scrollBy",
  "TouchEvent",
] as const;

type PolyfillSnapshot = Partial<Record<(typeof POLYFILL_KEYS)[number], unknown>>;

type PreviousDomEnvironment = {
  window?: typeof globalThis.window;
  document?: Document;
  navigatorDescriptor?: PropertyDescriptor;
  HTMLElement?: typeof HTMLElement;
  Element?: typeof Element;
  Node?: typeof Node;
  DocumentFragment?: typeof DocumentFragment;
  SVGElement?: typeof SVGElement;
  MutationObserver?: typeof MutationObserver;
  getComputedStyle?: typeof getComputedStyle;
  polyfillDescriptors: Partial<Record<(typeof POLYFILL_KEYS)[number], PropertyDescriptor | undefined>>;
};

export async function flushDomEffects() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

export async function waitForDomAssertion(assertion: () => void, attempts = 20) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      if (index === attempts - 1) throw error;
      await flushDomEffects();
    }
  }
}

function capturePreviousDomEnvironment(): PreviousDomEnvironment {
  const polyfillDescriptors: PreviousDomEnvironment["polyfillDescriptors"] = {};
  for (const key of POLYFILL_KEYS) {
    polyfillDescriptors[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  }
  return {
    window: globalThis.window,
    document: globalThis.document,
    navigatorDescriptor: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    HTMLElement: (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement,
    Element: (globalThis as { Element?: typeof Element }).Element,
    Node: (globalThis as { Node?: typeof Node }).Node,
    DocumentFragment: (globalThis as { DocumentFragment?: typeof DocumentFragment }).DocumentFragment,
    SVGElement: (globalThis as { SVGElement?: typeof SVGElement }).SVGElement,
    MutationObserver: (globalThis as { MutationObserver?: typeof MutationObserver }).MutationObserver,
    getComputedStyle: globalThis.getComputedStyle,
    polyfillDescriptors,
  };
}

function restorePreviousDomEnvironment(previous: PreviousDomEnvironment) {
  if (previous.window) globalThis.window = previous.window;
  else delete (globalThis as { window?: Window }).window;

  if (previous.document) globalThis.document = previous.document;
  else delete (globalThis as { document?: Document }).document;

  if (previous.navigatorDescriptor) {
    Object.defineProperty(globalThis, "navigator", previous.navigatorDescriptor);
  } else {
    delete (globalThis as { navigator?: Navigator }).navigator;
  }

  if (previous.HTMLElement) {
    (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement = previous.HTMLElement;
  } else {
    delete (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement;
  }

  if (previous.Element) {
    (globalThis as { Element?: typeof Element }).Element = previous.Element;
  } else {
    delete (globalThis as { Element?: typeof Element }).Element;
  }

  if (previous.Node) {
    (globalThis as { Node?: typeof Node }).Node = previous.Node;
  } else {
    delete (globalThis as { Node?: typeof Node }).Node;
  }

  if (previous.DocumentFragment) {
    (globalThis as { DocumentFragment?: typeof DocumentFragment }).DocumentFragment =
      previous.DocumentFragment;
  } else {
    delete (globalThis as { DocumentFragment?: typeof DocumentFragment }).DocumentFragment;
  }

  if (previous.SVGElement) {
    (globalThis as { SVGElement?: typeof SVGElement }).SVGElement = previous.SVGElement;
  } else {
    delete (globalThis as { SVGElement?: typeof SVGElement }).SVGElement;
  }

  if (previous.MutationObserver) {
    (globalThis as { MutationObserver?: typeof MutationObserver }).MutationObserver =
      previous.MutationObserver;
  } else {
    delete (globalThis as { MutationObserver?: typeof MutationObserver }).MutationObserver;
  }

  if (previous.getComputedStyle) {
    globalThis.getComputedStyle = previous.getComputedStyle;
  } else {
    delete (globalThis as { getComputedStyle?: typeof getComputedStyle }).getComputedStyle;
  }

  // Restore polyfill keys — use the captured descriptor when one existed so
  // we can faithfully reproduce the original value and property flags.
  // If no own descriptor existed before, remove the temporary test-time key.
  const g = globalThis as unknown as Record<string, unknown>;
  for (const key of POLYFILL_KEYS) {
    const descriptor = previous.polyfillDescriptors[key];
    if (descriptor !== undefined) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      delete g[key];
    }
  }
}

/**
 * Install polyfills that Base UI (floating-ui) and React scheduler require
 * in a jsdom environment. Called automatically by withDomContainer — test
 * files should not call this directly; the capture/restore lifecycle in
 * withDomContainer ensures globalThis is cleaned up after each test.
 */
function installWindowPolyfills(win: Window) {
  const domWindow = win as Window & typeof globalThis;
  const w = win as unknown as Record<string, unknown>;
  const g = globalThis as unknown as Record<string, unknown>;

  if (!w["requestAnimationFrame"]) {
    w["requestAnimationFrame"] = (cb: FrameRequestCallback) =>
      setTimeout(() => cb(Date.now()), 16) as unknown as number;
    w["cancelAnimationFrame"] = (id: number) => clearTimeout(id);
  }
  if (!w["ResizeObserver"]) {
    w["ResizeObserver"] = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!w["IntersectionObserver"]) {
    w["IntersectionObserver"] = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds: number[] = [];
    };
  }
  if (!w["PointerEvent"]) {
    w["PointerEvent"] = domWindow.MouseEvent;
  }

  // Propagate to globalThis so bare (non-window.) access also sees them.
  for (const key of ["requestAnimationFrame", "cancelAnimationFrame", "ResizeObserver", "IntersectionObserver", "PointerEvent"] as const) {
    if (!g[key]) g[key] = w[key];
  }

  // DOM globals that Base UI / floating-ui reference without window. prefix.
  for (const key of ["DOMRect", "DOMRectReadOnly", "SVGElement", "customElements", "CSS", "matchMedia", "scrollTo", "scrollBy", "TouchEvent"] as const) {
    if (!g[key] && w[key]) g[key] = w[key];
  }

  if (!g["matchMedia"]) {
    g["matchMedia"] = () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  // Clipboard stub — context menu items call navigator.clipboard.writeText.
  if (!("clipboard" in win.navigator)) {
    Object.defineProperty(win.navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  }
}

export async function withDomContainer<T>(
  run: (container: HTMLDivElement, window: Window) => Promise<T>,
): Promise<T> {
  const previous = capturePreviousDomEnvironment();
  const { window } = new (await import("jsdom")).JSDOM(
    "<!doctype html><html><body></body></html>",
    { url: "http://localhost" },
  );
  const container = window.document.createElement("div");
  window.document.body.appendChild(container);

  globalThis.window = window as unknown as typeof globalThis.window;
  globalThis.document = window.document;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: window.navigator,
  });
  (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement = window.HTMLElement as typeof HTMLElement;
  (globalThis as { Element?: typeof Element }).Element = window.Element as typeof Element;
  (globalThis as { Node?: typeof Node }).Node = window.Node as typeof Node;
  (globalThis as { DocumentFragment?: typeof DocumentFragment }).DocumentFragment =
    window.DocumentFragment as typeof DocumentFragment;
  (globalThis as { SVGElement?: typeof SVGElement }).SVGElement =
    window.SVGElement as typeof SVGElement;
  (globalThis as { MutationObserver?: typeof MutationObserver }).MutationObserver =
    window.MutationObserver as typeof MutationObserver;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  if (!("attachEvent" in window.HTMLElement.prototype)) {
    Object.defineProperty(window.HTMLElement.prototype, "attachEvent", {
      configurable: true,
      value: () => undefined,
    });
  }
  if (!("detachEvent" in window.HTMLElement.prototype)) {
    Object.defineProperty(window.HTMLElement.prototype, "detachEvent", {
      configurable: true,
      value: () => undefined,
    });
  }

  // Install polyfills that Base UI (floating-ui) and React scheduler need
  // in jsdom, and propagate them to globalThis so bare (non-window.) access works.
  installWindowPolyfills(window as unknown as Window);

  try {
    return await run(container, window as unknown as Window);
  } finally {
    window.close();
    restorePreviousDomEnvironment(previous);
  }
}

export async function mountReactComponent(
  container: HTMLDivElement,
  element: React.ReactElement,
): Promise<{
  root: Root;
  html: () => string;
  render: (nextElement: React.ReactElement) => Promise<void>;
  act: (callback: () => void | Promise<void>) => Promise<void>;
  unmount: () => Promise<void>;
}> {
  const root = createRoot(container);

  const render = async (nextElement: React.ReactElement) => {
    await act(async () => {
      root.render(nextElement);
    });
    await flushDomEffects();
  };

  await render(element);

  return {
    root,
    html: () => container.innerHTML,
    render,
    act: async (callback: () => void | Promise<void>) => {
      await act(async () => {
        await callback();
      });
      await flushDomEffects();
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      await flushDomEffects();
    },
  };
}

export async function mountHookHarness<T>(
  container: HTMLDivElement,
  useHook: () => T,
): Promise<{
  current: () => T;
  rerender: (nextUseHook?: () => T) => Promise<void>;
  act: (callback: () => void | Promise<void>) => Promise<void>;
  unmount: () => Promise<void>;
}> {
  let value: T;
  let currentUseHook = useHook;
  const root = createRoot(container);

  function Harness() {
    value = currentUseHook();
    return null;
  }

  const rerender = async (nextUseHook?: () => T) => {
    if (nextUseHook) {
      currentUseHook = nextUseHook;
    }
    await act(async () => {
      root.render(React.createElement(Harness));
    });
    await flushDomEffects();
  };

  await rerender();

  return {
    current: () => value!,
    rerender,
    act: async (callback: () => void | Promise<void>) => {
      await act(async () => {
        await callback();
      });
      await flushDomEffects();
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      await flushDomEffects();
    },
  };
}
