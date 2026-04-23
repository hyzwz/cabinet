// Must be the very first import so Base UI's useIsoLayoutEffect captures
// React.useLayoutEffect instead of noop — see test/dom-preload.ts for details.
import "./dom-preload";

import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getRenameValidationMessage,
  RenameSuccessBadge,
  type RenameValidationMessageKey,
} from "../src/components/sidebar/tree-node";

const messages: Record<RenameValidationMessageKey, string> = {
  "sidebar.renameEmpty": "Name is required",
  "sidebar.renameInvalidPrompt": "Use letters, numbers, spaces, dashes, or underscores",
  "sidebar.renameUnchangedPrompt": "Choose a different name before renaming",
};

function t(key: RenameValidationMessageKey): string {
  return messages[key];
}

test("getRenameValidationMessage rejects empty rename title", () => {
  const result = getRenameValidationMessage({
    currentSlug: "current-cabinet",
    nextTitle: "   ",
    t,
  });

  assert.equal(result, "Name is required");
});

test("getRenameValidationMessage rejects invalid rename characters", () => {
  const result = getRenameValidationMessage({
    currentSlug: "current-cabinet",
    nextTitle: "bad/name",
    t,
  });

  assert.equal(result, "Use letters, numbers, spaces, dashes, or underscores");
});

test("getRenameValidationMessage rejects unchanged slug-equivalent rename", () => {
  const result = getRenameValidationMessage({
    currentSlug: "current-cabinet",
    nextTitle: "Current cabinet",
    t,
  });

  assert.equal(result, "Choose a different name before renaming");
});

test("getRenameValidationMessage allows a distinct rename title", () => {
  const result = getRenameValidationMessage({
    currentSlug: "current-cabinet",
    nextTitle: "Renamed cabinet",
    t,
  });

  assert.equal(result, null);
});

test("RenameSuccessBadge renders nothing without a message", () => {
  const html = renderToStaticMarkup(
    React.createElement(RenameSuccessBadge, { message: null }),
  );

  assert.equal(html, "");
});

test("RenameSuccessBadge renders visible success feedback when provided", () => {
  const html = renderToStaticMarkup(
    React.createElement(RenameSuccessBadge, {
      message: "Cabinet renamed successfully",
    }),
  );

  assert.match(html, /Cabinet renamed successfully/);
  assert.match(html, /text-emerald-600/);
});
