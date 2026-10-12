import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
const uid = "00000000-0000-0000-0000-000000000001";
test("AI quota is atomic across requests, server-only, bounded per user and project", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema private; create schema auth;
      create table auth.users(id uuid primary key); insert into auth.users values ('${uid}'); grant usage on schema public to anon, authenticated, service_role;`);
    await db.exec(readFileSync(new URL("../supabase/migrations/20261012031102_ai_listing_assistant_rate_limits.sql", import.meta.url), "utf8"));
    for (const role of ["anon","authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query(`select public.reserve_listing_ai_request('${uid}')`), /permission denied/);
      await assert.rejects(db.query("select * from private.ai_listing_quota"), /permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    const results = await Promise.all(Array.from({ length: 6 }, () => db.query(`select public.reserve_listing_ai_request('${uid}') as quota`)));
    assert.equal(results.filter((r) => r.rows[0].quota.allowed).length, 3);
    assert.equal(results.filter((r) => !r.rows[0].quota.allowed).length, 3);
    let totals = await db.query("select day_count from private.ai_listing_quota order by scope");
    assert.ok(totals.rows.every((row) => row.day_count === 3));
    await db.exec("update private.ai_listing_quota set minute_start=minute_start-interval '1 minute'");
    assert.equal((await db.query(`select public.reserve_listing_ai_request('${uid}') as q`)).rows[0].q.allowed, true);
    await db.exec(`update private.ai_listing_quota set day_count=20 where scope='${uid}'`);
    assert.equal((await db.query(`select public.reserve_listing_ai_request('${uid}') as q`)).rows[0].q.allowed, false);
    await db.exec(`update private.ai_listing_quota set day_start=day_start-interval '1 day',minute_start=minute_start-interval '1 minute'`);
    assert.equal((await db.query(`select public.reserve_listing_ai_request('${uid}') as q`)).rows[0].q.allowed, true);
    await db.exec("update private.ai_listing_quota set day_count=100 where scope='global'");
    assert.equal((await db.query(`select public.reserve_listing_ai_request('${uid}') as q`)).rows[0].q.allowed, false);
    await db.exec("update private.ai_listing_quota set day_count=1,minute_count=10 where scope='global'");
    assert.equal((await db.query(`select public.reserve_listing_ai_request('${uid}') as q`)).rows[0].q.allowed, false);
    await assert.rejects(db.query("select public.reserve_listing_ai_request('00000000-0000-0000-0000-000000000099')"), /foreign key/);
    await db.exec("reset role");
    await db.exec(`delete from auth.users where id='${uid}'`);
    assert.equal((await db.query("select count(*)::integer as n from private.ai_listing_quota where user_id is not null")).rows[0].n, 0);
  } finally { await db.close(); }
});
