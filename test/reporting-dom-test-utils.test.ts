import assert from "node:assert/strict";
import test from "node:test";

import { withDomContainer } from "./reporting-dom-test-utils";

test("withDomContainer restores absent global polyfill keys by removing them", async () => {
  const key = "requestAnimationFrame";
  const hadOwnPropertyBefore = Object.prototype.hasOwnProperty.call(globalThis, key);

  assert.equal(hadOwnPropertyBefore, false, "Expected test to start without own requestAnimationFrame");

  await withDomContainer(async () => undefined);

  const hadOwnPropertyAfter = Object.prototype.hasOwnProperty.call(globalThis, key);
  assert.equal(hadOwnPropertyAfter, false, "Expected requestAnimationFrame to be removed after restore");
});

test("withDomContainer restores falsy polyfill values via the original descriptor", async () => {
  const key = "requestAnimationFrame";
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, key);

  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    enumerable: false,
    value: null,
  });

  try {
    await withDomContainer(async () => undefined);

    const restoredDescriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    assert.ok(restoredDescriptor, "Expected requestAnimationFrame descriptor to be restored");
    assert.equal(restoredDescriptor.value, null, "Expected requestAnimationFrame to be restored to null");
    assert.equal(restoredDescriptor.enumerable, false, "Expected original descriptor flags to be preserved");
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, key, originalDescriptor);
    } else {
      delete (globalThis as Record<string, unknown>)[key];
    }
  }
});
