import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const queryString = require("query-string");

test("Router query parsing keeps Thai text, repeated values and nested return URLs", () => {
  const source = "name=%E0%B8%95%E0%B8%A5%E0%B8%B2%E0%B8%94&room=14&tag=a&tag=b&returnUrl=locomall%3A%2F%2Fsign-in%3Fcode%3Done-use%252Bcode";
  const parsed = queryString.parse(source);
  assert.equal(parsed.name, "ตลาด");
  assert.equal(parsed.room, "14");
  assert.deepEqual(parsed.tag, ["a", "b"]);
  assert.equal(parsed.returnUrl, "locomall://sign-in?code=one-use%2Bcode");
  assert.deepEqual(queryString.parse(queryString.stringify(parsed)), parsed);
  assert.equal(queryString.parse("text=hello+world").text, "hello world");
});

test("Malformed percent-encoded deep links finish within a bounded process", () => {
  const result = spawnSync(process.execPath, ["-e", `
    const assert = require('node:assert/strict');
    const qs = require('query-string');
    assert.equal(qs.parse('x=%E0%A4%A').x, '%E0%A4%A');
    for (const value of ['%C0'.repeat(20000), '%E0%A4%A'.repeat(5000)]) {
      assert.equal(typeof qs.parse('x=' + value).x, 'string');
    }
  `], { timeout: 5000, encoding: "utf8", windowsHide: true });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});
