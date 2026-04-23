import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

export function renderMarkup(element: React.ReactElement) {
  return renderToStaticMarkup(element);
}

export function assertHtmlIncludesAll(html: string, expectedSnippets: string[]) {
  for (const snippet of expectedSnippets) {
    assert.match(html, new RegExp(escapeForRegExp(snippet)));
  }
}

export function assertHtmlExcludes(html: string, unexpectedSnippets: string[]) {
  for (const snippet of unexpectedSnippets) {
    assert.doesNotMatch(html, new RegExp(escapeForRegExp(snippet)));
  }
}

export function assertEmptyMarkup(html: string) {
  assert.equal(html, "");
}

export function assertReportingLinkGroup(html: string, status: string, snippets: string[] = []) {
  assertHtmlIncludesAll(html, [status, ...snippets]);
}

export function assertReportingSnapshotSummary(html: string, snippets: string[]) {
  assertHtmlIncludesAll(html, snippets);
}

export function assertReportingLinksContainerLoaded(html: string, snippets: string[] = []) {
  assertHtmlIncludesAll(html, ["Reporting links", ...snippets]);
}

export function assertReportingSnapshotsContainerLoaded(html: string, snippets: string[] = []) {
  assertHtmlIncludesAll(html, [
    "Reporting",
    "Read-only child cabinet reporting snapshots linked to this workspace.",
    ...snippets,
  ]);
}

export function assertReportingAlert(html: string, heading: string, snippets: string[] = []) {
  assertHtmlIncludesAll(html, [heading, ...snippets]);
}

export function assertReportingFeedback(html: string, snippets: string[]) {
  assertHtmlIncludesAll(html, snippets);
}

export function assertReportingHeader(html: string, snippets: string[]) {
  assertHtmlIncludesAll(html, snippets);
}

export function assertReportingFiltersInvestigation(html: string, snippets: string[]) {
  assertHtmlIncludesAll(html, snippets);
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
