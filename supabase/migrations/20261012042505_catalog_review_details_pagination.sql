-- Read-only public catalog DTO. Raw reviews, profiles and orders retain their
-- existing RLS; guests may see only verified reviews of approved catalog entries.
-- Keep the privileged implementation outside the exposed public API schema.
create index purchase_reviews_market_star_page on public.purchase_reviews
  (market_id,stars,created_at desc,review_id desc)
  where hidden_at is null and market_id is not null;
create index purchase_reviews_store_star_page on public.purchase_reviews
  (store_id,stars,created_at desc,review_id desc)
  where hidden_at is null and store_id is not null;

create function private.get_catalog_review_page(
  p_target_type text,p_target_id bigint,p_stars integer default null,
  p_limit integer default 10,p_before_created_at timestamptz default null,
  p_before_review_id bigint default null
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare target_name text; target_product text; result jsonb;
begin
  if p_target_type is null or p_target_type not in ('market','store')
    or p_target_id is null or p_target_id<=0
    or (p_stars is not null and p_stars not between 1 and 5)
    or p_limit is null or p_limit not between 1 and 20
    or ((p_before_created_at is null)<>(p_before_review_id is null))
    or (p_before_review_id is not null and p_before_review_id<=0) then
    raise exception 'invalid review page parameters' using errcode='22023';
  end if;

  -- Public eligibility is the authorization boundary for this read-only RPC.
  -- No login is required, and being an admin does NOT bypass approval/visibility.
  if p_target_type='market' then
    select m.name into target_name from public.markets m
      where m.market_id=p_target_id and m.approval_status='approved';
  else
    select s.name,s.product_name into target_name,target_product
      from public.stores s join public.markets m on m.market_id=s.market_id
      where s.store_id=p_target_id and s.approval_status='approved'
        and m.approval_status='approved';
  end if;
  if not found then
    return jsonb_build_object('available',false,'target_name',null,'average',0,
      'total',0,'counts',jsonb_build_object('1',0,'2',0,'3',0,'4',0,'5',0),
      'filtered_count',0,'items','[]'::jsonb,'next_cursor',null);
  end if;

  with eligible as not materialized (
    select r.review_id,r.stars,r.created_at
    from public.purchase_reviews r join public.orders o on o.order_id=r.order_id
    left join public.order_items oi on oi.order_item_id=r.order_item_id
    where r.hidden_at is null and o.status='delivered' and o.buyer_id=r.buyer_id
      and ((p_target_type='market' and r.market_id=p_target_id and o.market_id=r.market_id)
        or (p_target_type='store' and r.store_id=p_target_id
          and oi.order_id=r.order_id and oi.store_id=r.store_id))
  ), summary as (
    select count(*) total,coalesce(round(avg(stars),2),0) average,
      jsonb_build_object('1',count(*) filter(where stars=1),'2',count(*) filter(where stars=2),
        '3',count(*) filter(where stars=3),'4',count(*) filter(where stars=4),
        '5',count(*) filter(where stars=5)) counts,
      count(*) filter(where p_stars is null or stars=p_stars) filtered_count from eligible
  ), candidates as materialized (
    select * from eligible where (p_stars is null or stars=p_stars)
      and (p_before_created_at is null
        or (created_at,review_id)<(p_before_created_at,p_before_review_id))
    order by created_at desc,review_id desc limit p_limit+1
  ), page as materialized (
    select * from candidates order by created_at desc,review_id desc limit p_limit
  ), items as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'review_id',r.review_id,'stars',r.stars,'body',r.body,'created_at',r.created_at,
      'reviewer_name',case when coalesce(nullif(btrim(p.display_name),''),
        nullif(btrim(p.username),''),nullif(btrim(p.full_name),'')) is null then 'ผู้ซื้อ'
        else left(coalesce(nullif(btrim(p.display_name),''),nullif(btrim(p.username),''),
          nullif(btrim(p.full_name),'')),1)||'***' end,
      'verified_purchase',true,
      'product_name',case when p_target_type='store'
        then coalesce(nullif(oi.product_name,''),target_product) else null end
    ) order by page.created_at desc,page.review_id desc),'[]'::jsonb) value
    from page join public.purchase_reviews r on r.review_id=page.review_id
    left join public.profiles p on p.user_id=r.buyer_id
    left join public.order_items oi on oi.order_item_id=r.order_item_id
  )
  select jsonb_build_object('available',true,'target_name',target_name,
    'average',summary.average,'total',summary.total,'counts',summary.counts,
    'filtered_count',summary.filtered_count,'items',items.value,
    'next_cursor',case when (select count(*) from candidates)>p_limit then (
      select jsonb_build_object('created_at',created_at,'review_id',review_id)
      from page order by created_at,review_id limit 1) else null end)
  into result from summary cross join items;
  return result;
end $$;
revoke all on function private.get_catalog_review_page(text,bigint,integer,integer,timestamptz,bigint)
  from public,anon,authenticated;
-- These roles already have USAGE on private in the existing commerce schema.
grant execute on function private.get_catalog_review_page(text,bigint,integer,integer,timestamptz,bigint)
  to anon,authenticated;

create function public.get_catalog_review_page(
  p_target_type text,p_target_id bigint,p_stars integer default null,
  p_limit integer default 10,p_before_created_at timestamptz default null,
  p_before_review_id bigint default null
)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.get_catalog_review_page(p_target_type,p_target_id,p_stars,p_limit,
    p_before_created_at,p_before_review_id)
$$;
revoke all on function public.get_catalog_review_page(text,bigint,integer,integer,timestamptz,bigint)
  from public,anon,authenticated;
grant execute on function public.get_catalog_review_page(text,bigint,integer,integer,timestamptz,bigint)
  to anon,authenticated;
comment on function public.get_catalog_review_page(text,bigint,integer,integer,timestamptz,bigint)
  is 'Public approved-catalog review summary and keyset page; masked names, no buyer/order identifiers.';
