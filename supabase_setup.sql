-- ==========================================
-- 1. สร้าง Trigger สำหรับสร้าง Profile อัตโนมัติ
-- ==========================================

-- สร้างฟังก์ชันที่จะถูกเรียกตอนมี User สมัครเข้ามาใหม่
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name, user_img_url, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name', -- ถ้ามาจาก Google จะมีชื่อติดมาด้วย
    new.raw_user_meta_data->>'avatar_url', -- ถ้ามาจาก Google จะมีรูปติดมาด้วย
    'buyer'::user_role -- ค่าตั้งต้นที่ให้ไว้คือ buyer
  );
  return new;
end;
$$ language plpgsql security definer;

-- ผูกฟังก์ชันเข้ากับ Trigger ในตาราง auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 2. ตั้งค่า RLS (Row Level Security) สำหรับ Profiles
-- ==========================================
alter table public.profiles enable row level security;

-- ให้ทุกคนสามารถดูโปรไฟล์คนอื่นได้ (อาจจะจำเป็นเวลาโชว์ชื่อคนรีวิว) 
-- หรือถ้าให้ดูได้เฉพาะตัวเองก็แก้เป็น auth.uid() = user_id
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

-- ให้ผู้ใช้แก้ไขโปรไฟล์ได้เฉพาะของตัวเองเท่านั้น
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = user_id );

-- ==========================================
-- 3. สร้างตาราง Shops และตั้งค่า RLS
-- ==========================================
create table if not exists public.shops (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(user_id) not null,
  shop_name text not null,
  description text,
  created_at timestamptz default now()
);

alter table public.shops enable row level security;

-- ทุกคนสามารถดูร้านค้าได้
create policy "Shops are viewable by everyone."
  on shops for select
  using ( true );

-- เจ้าของร้านเท่านั้นที่แก้ไขข้อมูลร้านตัวเองได้
create policy "Owners can insert their own shop."
  on shops for insert
  with check ( auth.uid() = owner_id );

create policy "Owners can update their own shop."
  on shops for update
  using ( auth.uid() = owner_id );

-- ==========================================
-- 4. ตั้งค่า RLS สำหรับ Storage (Bucket ชื่อ avatars)
-- ==========================================
-- *หมายเหตุ: ต้องไปสร้าง Bucket ชื่อ 'avatars' ในหน้า Dashboard > Storage ก่อนรันคำสั่งนี้

-- ทุกคนสามารถดูรูปใน avatars ได้
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- ให้ผู้ใช้สามารถอัปโหลดรูปตัวเองได้
create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- ให้ผู้ใช้แก้ไข/ลบรูปได้ (สำคัญสำหรับการลบรูปเก่า)
create policy "Anyone can update their own avatar."
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "Anyone can delete their own avatar."
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
