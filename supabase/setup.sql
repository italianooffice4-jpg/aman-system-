-- Aman System — إعداد Supabase للمزامنة السحابية (نفّذه مرة واحدة: Supabase ← SQL Editor ← New query ← Run)
-- الجدول والأعمدة مطابقة لما يستخدمه البرنامج: صف واحد لكل حساب (user_id) يحمل كل بيانات المكتب في data.

create table if not exists public.workspace (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- يُحدَّث updated_at تلقائيًا عند كل تعديل: البرنامج يعتمد عليه لاكتشاف تعديل جهاز آخر (تزامن تفاؤلي)
create or replace function public.workspace_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists workspace_touch on public.workspace;
create trigger workspace_touch before update on public.workspace
  for each row execute function public.workspace_touch();

-- الأمان: كل مستخدم يرى ويعدّل صفّه فقط (بدون تسجيل دخول لا يُرى شيء)
alter table public.workspace enable row level security;

drop policy if exists workspace_select_own on public.workspace;
drop policy if exists workspace_insert_own on public.workspace;
drop policy if exists workspace_update_own on public.workspace;
drop policy if exists workspace_delete_own on public.workspace;
create policy workspace_select_own on public.workspace for select to authenticated using (auth.uid() = user_id);
create policy workspace_insert_own on public.workspace for insert to authenticated with check (auth.uid() = user_id);
create policy workspace_update_own on public.workspace for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy workspace_delete_own on public.workspace for delete to authenticated using (auth.uid() = user_id);

revoke all on public.workspace from anon;
grant select, insert, update, delete on public.workspace to authenticated;
