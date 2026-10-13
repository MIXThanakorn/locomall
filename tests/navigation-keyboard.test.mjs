import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { backFallback } from "../src/lib/backNavigation.ts";
const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");

test("all destination screens share an accessible back button, with safe deep-link fallbacks", () => {
  const scan = (dir) => {
    for (const entry of readdirSync(new URL(`${dir}/`, root), { withFileTypes: true })) {
      const file = join(dir, entry.name).replaceAll("\\", "/");
      if (entry.isDirectory()) { scan(file); continue; }
      if (!file.endsWith(".tsx") || file.includes("_layout") || file.startsWith("app/(tabs)/") || ["app/index.tsx", "app/(auth)/splash.tsx"].includes(file)) continue;
      const source = read(file);
      // Redirect-only routes render no destination screen of their own.
      if (!/<(?:View|ScrollView|KeyboardAware|HeaderGradient|FlatList)/.test(source)) continue;
      assert.match(source, /ScreenHeader|HeaderGradient/, file);
      assert.doesNotMatch(source, /<BackButton(?![^>]*floating)[^>]*\/>/, file);
      assert.doesNotMatch(source, /name="arrow-back"|← กลับ/, file);
    }
  };
  scan("app");
  const back = read("src/components/BackButton.tsx");
  assert.match(back, /router.canGoBack/);
  assert.match(back, /Keyboard.dismiss/);
  assert.match(back, /accessibilityRole="button"/);
  assert.match(back, /minHeight: 44/);
  assert.equal(backFallback(["(auth)", "sign-in"]), "/(auth)/splash");
  assert.equal(backFallback(["(auth)", "phone-onboarding"]), "/(auth)/switch-account");
  assert.equal(backFallback(["order", "cart"]), "/(tabs)");
  assert.equal(backFallback(["store", "[id]"]), "/(tabs)");
  assert.equal(backFallback(["market", "manage", "edit"]), "/(tabs)/setting");
});

test("root tabs have no back controls and destination headers share one safe-area origin and title row", () => {
  for (const route of ["index", "chat", "orders", "notification", "setting"]) {
    assert.doesNotMatch(read(`app/(tabs)/${route}.tsx`), /BackButton|ScreenHeader|showBack/, route);
  }
  const header = read("src/components/ScreenHeader.tsx");
  assert.match(header, /SCREEN_HEADER_GUTTER = 24/);
  assert.match(header, /SCREEN_HEADER_TOP = 8/);
  assert.match(header, /paddingTop: insets.top \+ SCREEN_HEADER_TOP/);
  assert.match(header, /flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44/);
  assert.match(header, /<View style=\{styles.row\}>[\s\S]*<BackButton[\s\S]*accessibilityRole="header"/);
  assert.match(header, /titleSpacing: \{ margin: 0, marginTop: 0, marginBottom: 0, padding: 0, flex: 0 \}/);
  assert.match(read("src/components/HeaderGradient.tsx"), /<ScreenHeader contentInset=\{0\}/);
});

test("shared keyboard handling enables both native platforms and accounts for custom headers", () => {
  const aware = read("src/components/KeyboardAware.tsx");
  assert.match(aware, /Platform.OS === "web" \? undefined : "padding"/);
  assert.match(aware, /measureInWindow/);
  assert.match(aware, /keyboardVerticalOffset \?\? screenTop/);
  assert.match(aware, /automaticallyAdjustKeyboardInsets=\{false\}/);
  assert.match(aware, /onLayout.*revealFocused/);
  assert.match(aware, /!Keyboard.isVisible\(\)/);
  assert.match(read("src/components/AppTextInput.tsx"), /onBlur.*event.nativeEvent.target, false/);
  assert.match(read("src/components/SearchableDropdown.tsx"), /KeyboardAwareView/);
  assert.match(read("src/components/ListingAssistant.tsx"), /KeyboardAwareScrollView/);
  const chat = read("app/chat/[id].tsx");
  assert.match(chat, /<KeyboardAwareView>/);
  assert.match(chat, /onContentSizeChange=\{\(_, height\)/);
  assert.match(chat, /anchor.offset \+ height - anchor.height/);
  assert.match(chat, /if \(nearBottom.current\)/);
  assert.match(chat, /maxHeight: 120/);
  assert.match(chat, /insets.bottom/);
  assert.match(chat, /multiline maxLength=\{2000\}/);
});
