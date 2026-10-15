import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bottomTabSpacing } from "../src/lib/bottomTabSpacing.ts";

test("bottom tabs reserve system insets plus breathing room without shrinking menu content", () => {
  for (const inset of [0,16,24,34,48]) {
    const layout = bottomTabSpacing(inset);
    assert.equal(layout.paddingBottom,inset+12);
    assert.equal(layout.height-layout.paddingBottom,56);
    assert.equal(layout.paddingTop,8);
  }
  for (const inset of [-1,NaN,Infinity]) assert.deepEqual(bottomTabSpacing(inset),bottomTabSpacing(0));
});

test("main and admin tabs use the same safe area rule; main tabs still hide for keyboard", () => {
  const main = readFileSync(new URL("../app/(tabs)/_layout.tsx",import.meta.url),"utf8");
  const admin = readFileSync(new URL("../app/admin/_layout.tsx",import.meta.url),"utf8");
  for(const source of [main,admin]) {
    assert.match(source,/bottomTabSpacing\(insets.bottom\)/);
    assert.doesNotMatch(source,/Platform.OS === "ios"/);
  }
  assert.match(main,/tabBarHideOnKeyboard: true/);
});
