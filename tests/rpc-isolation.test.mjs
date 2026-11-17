import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../supabase/migrations/20261117035108_isolate_privileged_rpc_implementations.sql", import.meta.url), "utf8");

test("RPC isolation preserves defaults, caller identity, catalog rows and dependent function OIDs", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema private; create schema auth;
      grant usage on schema private, auth to anon, authenticated, service_role;
      create function auth.uid() returns text language sql stable as $$
        select current_setting('test.uid', true) $$;
      create table public.catalog(id bigint, approved boolean);
      insert into public.catalog values (1,true),(2,false);
      create function public.get_public_store_prices(p_store_ids bigint[])
        returns table(store_id bigint, unit_price numeric)
        language sql stable security definer set search_path='' as $$
        select id, 40::numeric from public.catalog where approved and id=any(p_store_ids) $$;
      create function public.review_market(p_market_id bigint, p_approve boolean, p_note text default null)
        returns text language plpgsql security definer set search_path='' as $$
        begin
          if auth.uid() is distinct from 'admin' then raise exception 'forbidden'; end if;
          return auth.uid() || ':' || p_market_id || ':' || coalesce(p_note, 'default');
        end $$;
      create function public.mark_all_notifications_read() returns void
        language plpgsql security definer set search_path='' as $$ begin return; end $$;
      create function public.existing_dependency() returns text language sql
        begin atomic select public.review_market(1,true); end;
      revoke all on function public.review_market(bigint,boolean,text), public.mark_all_notifications_read() from public;
      grant execute on function public.review_market(bigint,boolean,text), public.mark_all_notifications_read() to authenticated,service_role;
      revoke all on function public.get_public_store_prices(bigint[]) from public;
      grant execute on function public.get_public_store_prices(bigint[]) to anon,authenticated,service_role;
    `);
    const before = (await db.query("select 'public.review_market(bigint,boolean,text)'::regprocedure::oid as oid")).rows[0].oid;
    await db.exec(migration);
    const after = (await db.query("select 'private.review_market(bigint,boolean,text)'::regprocedure::oid as oid")).rows[0].oid;
    assert.equal(after, before);
    assert.equal((await db.query("select count(*)::int as count from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef")).rows[0].count, 0);
    await db.exec("set role anon");
    assert.deepEqual((await db.query("select * from public.get_public_store_prices(array[1,2]::bigint[])")).rows, [{ store_id: 1, unit_price: '40' }]);
    await assert.rejects(db.query("select public.review_market(1,true)"), /permission denied/);
    await assert.rejects(db.query("select private.review_market(1,true)"), /permission denied/);
    await db.exec("reset role; set role authenticated; set test.uid='buyer'");
    await assert.rejects(db.query("select public.review_market(1,true)"), /forbidden/);
    await db.exec("set test.uid='admin'");
    assert.equal((await db.query("select public.review_market(1,true) as result")).rows[0].result, "admin:1:default");
    assert.equal((await db.query("select public.existing_dependency() as result")).rows[0].result, "admin:1:default");
    await db.query("select public.mark_all_notifications_read()");
    await db.exec("reset role; create function public.new_api() returns int language sql as $$select 1$$");
    assert.equal((await db.query("select has_function_privilege('anon','public.new_api()','execute') as allowed")).rows[0].allowed, false);
  } finally {
    await db.close();
  }
});
