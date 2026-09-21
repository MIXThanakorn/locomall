alter function public.apply_for_market(text,text,text,text,text) security definer;
alter function public.apply_to_open_store(bigint,text,text,text,text,numeric,text) security definer;
alter function public.apply_to_sell_in_store(bigint,text) security definer;

create policy rooms_buyer_update on public.chat_rooms for update to authenticated
using(buyer_id=(select auth.uid())) with check(buyer_id=(select auth.uid()));

create or replace function private.protect_legacy_profile_authorization() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if not private.is_admin(auth.uid()) then
    new.role=old.role;
    new.wallet_balance=old.wallet_balance;
  end if;
  return new;
end $$;
drop trigger if exists protect_legacy_profile_authorization on public.profiles;
create trigger protect_legacy_profile_authorization before update on public.profiles
for each row execute function private.protect_legacy_profile_authorization();
revoke all on function private.protect_legacy_profile_authorization() from public,anon,authenticated;

revoke execute on function public.apply_for_market(text,text,text,text,text) from public,anon;
revoke execute on function public.apply_to_open_store(bigint,text,text,text,text,numeric,text) from public,anon;
revoke execute on function public.apply_to_sell_in_store(bigint,text) from public,anon;
grant execute on function public.apply_for_market(text,text,text,text,text) to authenticated;
grant execute on function public.apply_to_open_store(bigint,text,text,text,text,numeric,text) to authenticated;
grant execute on function public.apply_to_sell_in_store(bigint,text) to authenticated;
