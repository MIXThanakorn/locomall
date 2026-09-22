-- Break the orders -> order_items -> order_allocations RLS cycle with tightly
-- scoped private helpers. They expose only a yes/no authorization decision.
create or replace function private.can_access_order(p_order_id bigint)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1
      from public.orders o
      where o.order_id = p_order_id
        and (
          o.buyer_id = (select auth.uid())
          or private.market_owner(o.market_id)
          or private.is_admin()
        )
    )
    or exists (
      select 1
      from public.order_items i
      join public.order_allocations a on a.order_item_id = i.order_item_id
      where i.order_id = p_order_id
        and a.seller_id = (select auth.uid())
    )
  );
$$;

create or replace function private.can_access_order_item(p_order_item_id bigint)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce((
    select private.can_access_order(i.order_id)
    from public.order_items i
    where i.order_item_id = p_order_item_id
  ), false);
$$;

create or replace function private.can_access_allocation(p_allocation_id bigint)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce((
    select a.seller_id = (select auth.uid())
      or private.can_access_order_item(a.order_item_id)
    from public.order_allocations a
    where a.allocation_id = p_allocation_id
  ), false);
$$;

revoke all on function private.can_access_order(bigint) from public, anon;
revoke all on function private.can_access_order_item(bigint) from public, anon;
revoke all on function private.can_access_allocation(bigint) from public, anon;
grant execute on function private.can_access_order(bigint) to authenticated, service_role;
grant execute on function private.can_access_order_item(bigint) to authenticated, service_role;
grant execute on function private.can_access_allocation(bigint) to authenticated, service_role;

drop policy if exists orders_participants on public.orders;
create policy orders_participants
on public.orders for select to authenticated
using ((select private.can_access_order(order_id)));

drop policy if exists order_items_participants on public.order_items;
create policy order_items_participants
on public.order_items for select to authenticated
using ((select private.can_access_order(order_id)));

drop policy if exists allocations_participants on public.order_allocations;
create policy allocations_participants
on public.order_allocations for select to authenticated
using ((select private.can_access_allocation(allocation_id)));

drop policy if exists allocation_events_participants on public.allocation_status_events;
create policy allocation_events_participants
on public.allocation_status_events for select to authenticated
using ((select private.can_access_allocation(allocation_id)));
