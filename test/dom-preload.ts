/**
 * Pre-populates globalThis.document before any Base UI (or other browser-expecting)
 * modules are evaluated. Base UI's useIsoLayoutEffect captures
 * `typeof document !== 'undefined'` at module-evaluation time; if document is
 * undefined, it falls back to noop, which prevents portal/popup rendering in jsdom.
 *
 * Importing this file as the FIRST import in any test file that mounts Base UI
 * popup/portal components ensures that useIsoLayoutEffect captures
 * React.useLayoutEffect instead of noop, enabling correct store syncing
 * and portal rendering.
 *
 * This is a zero-cost no-op when document is already defined (e.g. in a browser).
 */
if (typeof document === "undefined") {
  // A minimal truthy object is sufficient — only `typeof document !== 'undefined'`
  // is checked at capture time. The real jsdom document is installed per-test
  // by withDomContainer(), which replaces globalThis.document.
  (globalThis as unknown as Record<string, unknown>).document = Object.create(null);
}
