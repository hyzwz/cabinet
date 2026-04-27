import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("cabinet view forwards canonical cabinet ids into both reporting panels", async () => {
  const source = await fs.readFile(new URL("../src/components/cabinets/cabinet-view.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /<ReportingPanel[\s\S]*cabinetId=\{overview\?\.cabinet\.id \?\? null\}[\s\S]*cabinetPath=\{cabinetPath\}/,
  );
  assert.match(
    source,
    /<ReportingLinksPanel[\s\S]*cabinetId=\{overview\?\.cabinet\.id \?\? null\}[\s\S]*cabinetPath=\{cabinetPath\}/,
  );
});
