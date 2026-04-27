import test from "node:test";
import assert from "node:assert/strict";
import { isMissingAlertMessage } from "../src/lib/agents/missing-alerts";

test("isMissingAlertMessage accepts explicit missing status formats in alerts channel", () => {
  assert.equal(
    isMissingAlertMessage({ channel: "alerts", type: "alert", content: "status: missing" }),
    true
  );
  assert.equal(
    isMissingAlertMessage({ channel: "alerts", type: "alert", content: "health = missing" }),
    true
  );
  assert.equal(
    isMissingAlertMessage({ channel: "alerts", type: "alert", content: "state-missing" }),
    true
  );
});

test("isMissingAlertMessage rejects non-matching or out-of-scope messages", () => {
  assert.equal(
    isMissingAlertMessage({ channel: "general", type: "alert", content: "status: missing" }),
    false
  );
  assert.equal(
    isMissingAlertMessage({ channel: "alerts", type: "message", content: "status: missing" }),
    false
  );
  assert.equal(
    isMissingAlertMessage({ channel: "alerts", type: "alert", content: "missing context but no status field" }),
    false
  );
  assert.equal(
    isMissingAlertMessage({ channel: "alerts", type: "alert", content: "missing alert for weekly report" }),
    false
  );
  assert.equal(
    isMissingAlertMessage({ channel: "alerts", type: "alert", content: "all systems healthy" }),
    false
  );
});
