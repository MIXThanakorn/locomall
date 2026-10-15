import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sql = read("supabase/migrations/20261004061208_demo_wallet_reviews_social_v1.sql");

test("demo checkout shares the COD stock transaction and debits with a nonnegative guard", () => {
  assert.match(sql, /create_demo_wallet_order/);
  assert.match(sql, /public\.create_cod_order\(/);
  assert.match(sql, /wallet_balance=wallet_balance-charge/);
  assert.match(sql, /wallet_balance>=charge/);
  assert.match(sql, /primary key \(user_id,request_id\)/);
  assert.match(sql, /demo_ledger_one_order_event/);
  assert.match(read("app/order/checkout.tsx"), /create_demo_wallet_order/);
});

test("demo requests, refunds and seller settlement remain server-authorized", () => {
  assert.match(sql, /private\.is_admin\(\)/);
  assert.match(sql, /request_row\.status <> 'pending'/);
  assert.match(sql, /new\.status='cancelled' and new\.payment_method='demo_wallet'/);
  assert.match(sql, /new\.status='delivered'/);
  assert.match(sql, /demo_ledger_immutable/);
  assert.match(sql, /revoke all on public\.demo_accounts/);
  assert.match(sql, /record_demo_settlement/);
  assert.doesNotMatch(read("app/profile/wallet.tsx"), /PromptPay.*โอนเงินจริงได้/);
});

test("reviews require delivered purchase and public DTO hides buyer and order identifiers", () => {
  assert.match(sql, /status='delivered'/);
  assert.match(sql, /buyer_id=auth\.uid\(\)/);
  assert.match(sql, /purchase_reviews_market_once/);
  assert.match(sql, /purchase_reviews_store_item_once/);
  const publicDto = sql.split("create or replace function public.get_catalog_reviews")[1].split("create or replace function private.refresh_purchase_rating")[0];
  assert.doesNotMatch(publicDto, /'buyer_id'|'order_id'/);
  assert.match(sql, /moderation reason required/);
});

test("favorite and follow are owner-scoped and only approved entities can be saved", () => {
  assert.match(sql, /catalog_links_self_read/);
  assert.match(sql, /set_catalog_link/);
  assert.match(sql, /approval_status='approved'/);
  assert.match(sql, /old\.stock_quantity-old\.reserved_quantity<=0/);
  assert.doesNotMatch(read("src/components/CatalogActions.tsx"), /Share\.share|share-social-outline/);
});

test("wallet subscribes to owner-scoped realtime tables and supports manual refresh", () => {
  const publication = read("supabase/migrations/20261004072602_demo_wallet_realtime.sql");
  const wallet = read("app/profile/wallet.tsx");
  for (const table of ["demo_accounts", "demo_topup_requests", "demo_ledger"]) {
    assert.match(publication, new RegExp(table));
    assert.match(wallet, new RegExp(`table: "${table}"`));
  }
  assert.match(wallet, /user_id=eq\.\$\{userId\}/);
  assert.match(wallet, /RefreshControl/);
});

test("market and store cards show price, distance, rating and sales without description", () => {
  const card = read("src/components/CommerceCard.tsx");
  const hook = read("src/hooks/useCommerce.ts");
  assert.match(card, /item\.unit_price/);
  assert.match(card, /item\.distance_km/);
  assert.match(card, /item\.rating_average/);
  assert.match(card, /item\.sold_quantity/);
  assert.doesNotMatch(card, /item\.description/);
  assert.match(hook, /unit_price: "unit_price" in item \? item\.unit_price : metric\?\.min_price/);
  assert.match(sql, /get_catalog_card_metrics/);
});
