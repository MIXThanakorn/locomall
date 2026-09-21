drop trigger if exists store_approval_notification on public.stores;
create trigger store_approval_notification after update of approval_status on public.stores
for each row execute function private.notify_approval();

create or replace function private.transition_allocation(p_allocation bigint,p_from text,p_to text,p_actor uuid) returns void
language plpgsql security definer set search_path='' as $$
declare oid bigint; begin
 update public.order_allocations set status=p_to,updated_at=now() where allocation_id=p_allocation and status=p_from;
 if not found then raise exception 'invalid allocation transition'; end if;
 insert into public.allocation_status_events(allocation_id,from_status,to_status,actor_id) values(p_allocation,p_from,p_to,p_actor) on conflict do nothing;
 select i.order_id into oid from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id where a.allocation_id=p_allocation;
 if p_to='ready_for_pickup' then update public.orders set status='preparing',updated_at=now() where order_id=oid and status='awaiting_preparation'; end if;
 if p_to='at_hub' and not exists(select 1 from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id where i.order_id=oid and a.status<>'at_hub') then
   update public.orders set status='at_hub',updated_at=now() where order_id=oid and status in ('awaiting_preparation','preparing');
 end if;
end $$;
revoke all on function private.transition_allocation(bigint,text,text,uuid) from public,anon,authenticated;
