import test from "node:test";
import assert from "node:assert/strict";
import * as reportingHelpers from "../src/components/cabinets/reporting-helpers";

type ReportingHelpersModule = Record<string, unknown> & {
  buildCabinetReportingApiPath?: (input: {
    cabinetId: string;
    cabinetPath?: string | null;
    resource: "reporting" | "reporting-links";
  }) => string;
};

function getBuildCabinetReportingApiPath() {
  const helperModule = reportingHelpers as ReportingHelpersModule;
  assert.equal(
    typeof helperModule.buildCabinetReportingApiPath,
    "function",
    "reporting helpers should export buildCabinetReportingApiPath",
  );

  return helperModule.buildCabinetReportingApiPath;
}

test("buildCabinetReportingApiPath keeps root cabinet path out of the dynamic route segment", () => {
  const buildCabinetReportingApiPath = getBuildCabinetReportingApiPath();

  assert.equal(
    buildCabinetReportingApiPath({
      cabinetId: "jyutechcn-root",
      cabinetPath: ".",
      resource: "reporting",
    }),
    "/api/cabinets/jyutechcn-root/reporting?cabinetPath=.",
  );
});

test("buildCabinetReportingApiPath keeps divergent cabinet paths in query params for reporting links", () => {
  const buildCabinetReportingApiPath = getBuildCabinetReportingApiPath();

  assert.equal(
    buildCabinetReportingApiPath({
      cabinetId: "cab-parent",
      cabinetPath: "company/root",
      resource: "reporting-links",
    }),
    "/api/cabinets/cab-parent/reporting-links?cabinetPath=company%2Froot",
  );
});
