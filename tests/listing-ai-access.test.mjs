import assert from "node:assert/strict";
import test from "node:test";
import { authorizedStoreImage, ownedStoreImagePath } from "../supabase/functions/suggest-listing/access.ts";
function client(rows) {
  return { from(table) {
    const filters = []; const builder = { select() { return builder; }, eq(key,value) { filters.push([key,value]); return builder; },
      async maybeSingle() { return { data: rows[table]?.find((row) => filters.every(([key,value]) => row[key] === value)) ?? null, error: null }; } };
    return builder;
  } };
}
test("AI draft access is limited to the store manager, not a buyer or another seller", async () => {
  const db = client({ stores: [{ store_id: 1, manager_id: "owner", image_url: "image" }] });
  assert.equal(await authorizedStoreImage(db,{storeId:1},"owner"), "image");
  for (const userId of ["buyer", "co-seller", "other-owner"]) await assert.rejects(authorizedStoreImage(db,{storeId:1},userId), (e) => e.code === "forbidden");
  await assert.rejects(authorizedStoreImage(db,{storeId:99},"owner"), (e) => e.code === "forbidden");
});
test("new-store AI requires an approved market and the user's saved subdistrict", async () => {
  const rows = { markets: [{ market_id: 1, approval_status: "approved", subdistrict_code: "A" }, { market_id: 2, approval_status: "pending", subdistrict_code: "A" }],
    user_locations: [{ user_id: "local", subdistrict_code: "A" }, { user_id: "distant", subdistrict_code: "B" }] };
  assert.equal(await authorizedStoreImage(client(rows),{marketId:1},"local"),null);
  for (const [marketId,userId] of [[2,"local"],[1,"distant"],[1,"no-location"]]) await assert.rejects(authorizedStoreImage(client(rows),{marketId},userId),(e)=>e.code === "forbidden");
});
test("AI cannot fetch external URLs, private evidence, another store's image, or encoded traversal", () => {
  const host = "https://project.supabase.co";
  assert.equal(ownedStoreImagePath(`${host}/storage/v1/object/public/store-images/1/cover.png`,host,1), "1/cover.png");
  for (const path of ["https://evil.example/storage/v1/object/public/store-images/1/a.png", `${host}/storage/v1/object/public/store-images/2/a.png`, `${host}/storage/v1/object/public/seller-evidence/1/a.png`, `${host}/storage/v1/object/public/store-images/1/%2e%2e%2f2/a.png`, "file:///secret", "invalid url"]) assert.throws(()=>ownedStoreImagePath(path,host,1),(e)=>e.code === "invalid_image");
});
