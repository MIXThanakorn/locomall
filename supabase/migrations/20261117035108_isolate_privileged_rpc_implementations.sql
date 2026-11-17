begin;

-- Keep the public RPC contracts, but place privileged implementations outside
-- the Data API schemas. Each implementation already checks identity/ownership
-- or returns the approved, deliberately public catalog projection.
-- ALTER FUNCTION preserves OIDs used by existing policies and dependencies.
do $migration$
declare
  fn record;
  signature text;
  implementation text;
  arguments text;
  role_name text;
  allowed_roles text[];
begin
  for fn in
    select p.*, pg_get_function_identity_arguments(p.oid) as identity_args,
      pg_get_function_arguments(p.oid) as declared_args,
      pg_get_function_result(p.oid) as declared_result,
      obj_description(p.oid, 'pg_proc') as description
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname = any(array[
        'apply_for_market', 'apply_to_open_store', 'apply_to_sell_in_store',
        'complete_location_onboarding', 'create_demo_wallet_order',
        'decide_demo_topup', 'delete_cancelled_order',
        'disable_my_push_device', 'disable_my_push_devices',
        'discover_catalog_page', 'get_catalog_card_metrics', 'get_catalog_reviews',
        'get_chat_room_header', 'get_market_catalog', 'get_or_create_chat_room',
        'get_pickup_eligibility', 'get_public_store_prices', 'get_store_catalog',
        'get_store_request_detail', 'mark_all_notifications_read',
        'mark_allocation_ready', 'mark_notification_read', 'moderate_purchase_review',
        'record_allocation_at_hub', 'record_allocation_collected',
        'record_demo_settlement', 'register_my_push_device', 'request_demo_topup',
        'review_market', 'review_store', 'review_store_seller', 'save_my_address',
        'save_purchase_review', 'set_catalog_link', 'set_market_image',
        'set_store_image', 'update_market', 'update_my_listing_stock', 'update_store'
      ])
    order by p.proname
  loop
    select array_agg(r.name) into allowed_roles
    from (values ('anon'), ('authenticated'), ('service_role')) as r(name)
    where has_function_privilege(r.name, fn.oid, 'execute');

    signature := format('public.%I(%s)', fn.proname, fn.identity_args);
    implementation := format('private.%I(%s)', fn.proname, fn.identity_args);
    select string_agg('$' || i, ', ' order by i) into arguments
      from generate_series(1, fn.pronargs) i;

    execute format('alter function %s set schema private', signature);
    execute format(
      'create function public.%I(%s) returns %s language sql security invoker %s %s parallel %s set search_path = '''' as %L',
      fn.proname, fn.declared_args, fn.declared_result,
      case fn.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end,
      case when fn.proisstrict then 'strict' else 'called on null input' end,
      case fn.proparallel when 's' then 'safe' when 'r' then 'restricted' else 'unsafe' end,
      format('select %sprivate.%I(%s)', case when fn.proretset then '* from ' else '' end,
        fn.proname, coalesce(arguments, ''))
    );

    execute format('revoke all on function %s from public, anon, authenticated, service_role', signature);
    execute format('revoke all on function %s from public, anon, authenticated, service_role', implementation);
    foreach role_name in array coalesce(allowed_roles, array[]::text[]) loop
      execute format('grant execute on function %s to %I', signature, role_name);
      execute format('grant execute on function %s to %I', implementation, role_name);
    end loop;
    if fn.description is not null then
      execute format('comment on function %s is %L', signature, fn.description);
    end if;
  end loop;
end
$migration$;

-- New APIs must explicitly grant their intended callers.
-- A per-schema REVOKE cannot subtract the global PUBLIC default.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon, authenticated;
notify pgrst, 'reload schema';

commit;
