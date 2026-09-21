do $$ begin
  if not exists(select 1 from pg_constraint where conname='order_allocations_order_item_id_listing_id_key' and conrelid='public.order_allocations'::regclass) then
    alter table public.order_allocations add constraint order_allocations_order_item_id_listing_id_key unique(order_item_id,listing_id);
  end if;
end $$;

create or replace function public.create_cod_order(p_market_id bigint,p_address_id bigint,p_items jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare oid bigint; item jsonb; s public.stores; q int; remaining int; total numeric=0; oi bigint; l record; take int; active_count int; share int; begin
 if auth.uid() is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'invalid order'; end if;
 if not exists(select 1 from public.user_addresses where address_id=p_address_id and user_id=auth.uid()) then raise exception 'invalid address'; end if;
 insert into public.orders(buyer_id,address_id,market_id,total_amount) values(auth.uid(),p_address_id,p_market_id,0) returning order_id into oid;
 for item in select * from jsonb_array_elements(p_items) loop
   q=(item->>'quantity')::int; if q<=0 then raise exception 'invalid quantity'; end if;
   select * into s from public.stores where store_id=(item->>'store_id')::bigint and market_id=p_market_id and approval_status='approved' for share; if not found then raise exception 'invalid store'; end if;
   if (select coalesce(sum(stock_quantity-reserved_quantity),0) from public.seller_listings where store_id=s.store_id and status='active')<q then raise exception 'insufficient stock for store %',s.store_id; end if;
   insert into public.order_items(order_id,store_id,product_name,unit,unit_price,quantity,total_amount) values(oid,s.store_id,s.product_name,s.unit,s.unit_price,q,s.unit_price*q) returning order_item_id into oi;
   total=total+s.unit_price*q; remaining=q;
   while remaining>0 loop
     select count(*) into active_count from public.seller_listings where store_id=s.store_id and status='active' and stock_quantity>reserved_quantity;
     if active_count=0 then raise exception 'stock changed during allocation'; end if;
     share=ceil(remaining::numeric/active_count)::int;
     for l in select listing_id,seller_id,stock_quantity-reserved_quantity available from public.seller_listings where store_id=s.store_id and status='active' and stock_quantity>reserved_quantity order by last_allocated_at nulls first,listing_id for update loop
       exit when remaining=0; take=least(l.available,share,remaining); if take<=0 then continue; end if;
       update public.seller_listings set reserved_quantity=reserved_quantity+take,updated_at=now() where listing_id=l.listing_id;
       insert into public.order_allocations(order_item_id,listing_id,seller_id,quantity) values(oi,l.listing_id,l.seller_id,take)
       on conflict(order_item_id,listing_id) do update set quantity=public.order_allocations.quantity+excluded.quantity,updated_at=now();
       remaining=remaining-take;
     end loop;
   end loop;
   update public.seller_listings sl set last_allocated_at=clock_timestamp()+(a.quantity*interval '1 microsecond')
   from public.order_allocations a where a.order_item_id=oi and a.listing_id=sl.listing_id;
 end loop;
 update public.orders set total_amount=total where order_id=oid; delete from public.carts where buyer_id=auth.uid(); return oid;
end $$;
revoke execute on function public.create_cod_order(bigint,bigint,jsonb) from public,anon;
grant execute on function public.create_cod_order(bigint,bigint,jsonb) to authenticated;
