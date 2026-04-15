import test from "node:test";
import assert from "node:assert/strict";
import { getMessage, isLocale, normalizeLocale, type Locale } from "../src/lib/i18n/messages";

test("normalizeLocale defaults to zh for unsupported input", () => {
  assert.equal(normalizeLocale(undefined), "zh");
  assert.equal(normalizeLocale("fr"), "zh");
});

test("isLocale only accepts zh and en", () => {
  assert.equal(isLocale("zh"), true);
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("jp"), false);
});

test("getMessage returns locale-specific value when present", () => {
  assert.equal(getMessage("login.helper", "zh"), "输入密码以继续");
  assert.equal(getMessage("login.helper", "en"), "Enter password to continue");
  assert.equal(getMessage("login.passwordPlaceholder", "zh"), "密码");
  assert.equal(getMessage("login.signIn", "zh"), "登录");
  assert.equal(getMessage("login.wrongPassword", "zh"), "密码错误");
  assert.equal(getMessage("login.connectionError", "en"), "Connection error");
  assert.equal(getMessage("login.loading", "en"), "...");
});

test("getMessage falls back to English when zh translation is missing", () => {
  assert.equal(getMessage("header.productName", "zh"), "Cabinet");
  assert.equal(getMessage("header.productName", "en"), "Cabinet");
});

test("getMessage returns key when missing from all locales", () => {
  assert.equal(getMessage("missing.key" as never, "zh" satisfies Locale), "missing.key");
});
