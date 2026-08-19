-- ============================================================
-- 第 3 步：结构升级迁移
-- 内容：profiles 字段扩展、stages 重定义、task_categories 新表、tasks 扩展
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles 表升级
-- ------------------------------------------------------------

-- 新增 job_title 字段
alter table public.profiles
add column if not exists job_title text;

-- 修改 role check：先删除旧 check，再加新 check（值不变，更新说明）
alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('owner','admin','staff'));

-- 角色互换迁移：owner↔admin
-- 用 CASE 语句一次性完成，不需要临时值（临时值会违反 CHECK 约束）
update public.profiles
set role = case
  when role = 'owner' then 'admin'
  when role = 'admin' then 'owner'
  else role
end
where role in ('owner', 'admin');

-- ------------------------------------------------------------
-- 2. stages 表升级
-- ------------------------------------------------------------

-- 新增列
alter table public.stages
add column if not exists is_repeatable boolean not null default false;

alter table public.stages
add column if not exists display_group text;

alter table public.stages
add column if not exists updated_at timestamptz not null default now();

-- 删除旧的阶段数据，重新插入
delete from public.stages;

insert into public.stages (key, name, sort_order, is_repeatable) values
  ('material',       '整理资料',  1, false),
  ('design',         '设计画图',  2, false),
  ('review',         '审核修改',  3, false),
  ('prototyping',    '打样',      4, true),
  ('testing',        '测试',      5, true),
  ('manufacture',    '加工',      6, false),
  ('assembly',       '装配',      7, false),
  ('acceptance',     '验收',      8, false);

-- updated_at trigger
drop trigger if exists stages_updated_at on public.stages;
create trigger stages_updated_at
before update on public.stages
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. 新建 task_categories 表（必须在 tasks 升级之前，因为 tasks 要引用它）
-- ------------------------------------------------------------

create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  enabled boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 初始化系统预设分类
insert into public.task_categories (name, sort_order, is_system) values
  ('画图',   1, true),
  ('运营',   2, true),
  ('美工',   3, true),
  ('拍摄',   4, true),
  ('设计',   5, true),
  ('测试',   6, true)
on conflict (name) do nothing;

-- updated_at trigger
drop trigger if exists task_categories_updated_at on public.task_categories;
create trigger task_categories_updated_at
before update on public.task_categories
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. tasks 表升级
-- ------------------------------------------------------------

-- 先删除旧 type check，再加新 check
alter table public.tasks
drop constraint if exists tasks_type_check;

-- 先把旧 type 值迁移好再改 check，避免违反约束
update public.tasks set type = 'normal' where type in ('shortterm', 'temporary');
-- longterm 保持 longterm 不变

alter table public.tasks
add constraint tasks_type_check
check (type in ('anytime','normal','longterm','recurring'));

-- 修改默认值为 anytime
alter table public.tasks
alter column type set default 'anytime';

-- 新增列
alter table public.tasks
add column if not exists task_category_id uuid references public.task_categories(id) on delete set null;

alter table public.tasks
add column if not exists start_date timestamptz;

alter table public.tasks
add column if not exists recurrence_rule text;

-- due_date 改为 nullable
alter table public.tasks
alter column due_date drop not null;

-- 新增 round_number
alter table public.tasks
add column if not exists round_number int not null default 1;

-- 旧 task_category 字符串字段保留（不删），task_category_id 先为 null，允许两列并存

-- tasks updated_at trigger
drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 5. 新增索引
-- ------------------------------------------------------------

create index if not exists idx_tasks_task_category_id on public.tasks(task_category_id);
create index if not exists idx_task_categories_sort_order on public.task_categories(sort_order);

-- ------------------------------------------------------------
-- 6. 为新增的 task_categories 启用 RLS 并加策略（保持与其他表一致）
-- ------------------------------------------------------------

alter table public.task_categories enable row level security;

drop policy if exists "task_categories read" on public.task_categories;
create policy "task_categories read" on public.task_categories for select using (true);

drop policy if exists "task_categories admin write" on public.task_categories;
create policy "task_categories admin write" on public.task_categories for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
