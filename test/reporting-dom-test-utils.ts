import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

type PreviousDomEnvironment = {
  window?: typeof globalThis.window;
  document?: Document;
  navigatorDescriptor?: PropertyDescriptor;
  HTMLElement?: typeof HTMLElement;
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
  return {
    window: globalThis.window,
    document: globalThis.document,
    navigatorDescriptor: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    HTMLElement: (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement,
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
}

export async function withDomContainer<T>(
  run: (container: HTMLDivElement, window: Window) => Promise<T>,
): Promise<T> {
  const previous = capturePreviousDomEnvironment();
  const { window } = new (await import("jsdom")).JSDOM("<!doctype html><html><body></body></html>");
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
