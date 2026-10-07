-- A store's stock, reservations and cart quantities count sale units. Changing
-- the unit after approval would silently reinterpret every existing quantity.
create or replace function private.enforce_store_sale_unit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.unit is not distinct from old.unit then
    return new;
  end if;

  if tg_op = 'UPDATE' and (
    old.approval_status in ('approved', 'suspended')
    or exists (select 1 from public.seller_listings l where l.store_id = old.store_id)
    or exists (select 1 from public.cart_items c where c.store_id = old.store_id)
    or exists (select 1 from public.order_items i where i.store_id = old.store_id)
  ) then
    raise exception 'sale unit cannot change after store approval or stock activity';
  end if;

  if new.unit in ('ชิ้น', 'ขวด', 'แพ็ก', 'ชุด', 'กล่อง', 'ถุง', 'ลูก', 'ก้อน')
     or new.unit ~ '^[1-9][0-9]* กรัม$' then
    return new;
  end if;
  if new.unit ~ '^(0|[1-9][0-9]*)(\.[0-9]{1,3})? กิโลกรัม$'
     and split_part(new.unit, ' ', 1)::numeric > 0 then
    return new;
  end if;
  raise exception 'invalid sale unit';
end $$;

drop trigger if exists enforce_store_sale_unit on public.stores;
create trigger enforce_store_sale_unit
before insert or update of unit on public.stores
for each row execute function private.enforce_store_sale_unit();
revoke execute on function private.enforce_store_sale_unit() from public, anon, authenticated;

-- Keep old incomplete profiles intact. New/updated profile rows must carry
-- either no phone (OAuth onboarding) or a valid Thai 10-digit mobile number.
alter table public.profiles
  add constraint profiles_phone_num_format_check
  check (phone_num is null or phone_num ~ '^0[0-9]{9}$') not valid;

-- Confirmed identical by the Performance Advisor; retain the other index.
drop index if exists public.order_items_store_id_idx;
