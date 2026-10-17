import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("cold startup defaults to session gate, not the saved-account picker", () => {
  const root = read("app/_layout.tsx");
  const auth = read("app/(auth)/_layout.tsx");
  assert.match(root, /initialRouteName="index"/);
  assert.ok(root.indexOf('<Stack.Screen name="index"') < root.indexOf('<Stack.Screen name="(auth)"'));
  assert.match(auth, /initialRouteName="splash"/);
  assert.ok(auth.indexOf('<Stack.Screen name="splash"') < auth.indexOf('<Stack.Screen name="switch-account"'));
  const entry = read("app/index.tsx");
  for (const destination of ["splash", "phone-onboarding", "location-onboarding", "/admin", "/(tabs)"]) assert.ok(entry.includes(destination));
  assert.ok(!entry.includes("switch-account"));
  assert.ok(read("src/lib/settingsMenu.ts").includes("/(auth)/switch-account"));
});

test("notification actions wrap outside the header and grow with text size", () => {
  const source = read("app/(tabs)/notification.tsx");
  const header = source.slice(source.indexOf('<View style={[styles.head'), source.indexOf('<View style={styles.content}>'));
  assert.ok(!header.includes("TouchableOpacity"));
  assert.match(source, /actions: \{[^}]*flexWrap: "wrap"/);
  const button = source.match(/actionButton: \{([^}]+)\}/)[1];
  for (const rule of ['flexGrow: 1', 'minWidth: 0', 'maxWidth: "100%"', 'minHeight: 44']) assert.ok(button.includes(rule));
  assert.doesNotMatch(button, /(?:^|, )height:/);
  assert.match(source, /unreadToggleText: \{[^}]*minWidth: 0/);
  assert.match(source, /count: \{[^}]*minHeight: 24/);
  assert.ok(!source.includes("allowFontScaling={false}"));
});
