-- ============================================================
-- 第 1 步：基础表结构 + 自动触发器
-- 用途：账号（profiles）、用户信息自动同步、项目/任务/记录基础表
-- ============================================================

-- 启用 UUID 生成函数
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. 用户扩展信息（profiles）
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'staff' check (role in ('owner','admin','staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 新增/修改时自动更新 updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 注册用户后自动创建 profile，从 raw_user_meta_data 取 name
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 2. 阶段配置（stages）— 管理员可配置
-- ------------------------------------------------------------
create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 初始化默认阶段
insert into public.stages (key, name, sort_order) values
  ('requirement', '需求确认', 1),
  ('design', '画图 / 设计', 2),
  ('review', '审核 / 修改', 3),
  ('test', '测试', 4),
  ('manufacture', '加工', 5),
  ('assembly', '装配', 6),
  ('debug', '调试', 7),
  ('acceptance', '验收', 8),
  ('archive', '归档', 9)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 3. 任务模板（task_templates）
-- ------------------------------------------------------------
create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  task_category text not null,
  default_due_days int,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.task_templates (key, name, task_category, default_due_days, sort_order) values
  ('drawing',       '画图任务',      'drawing',    3,  1),
  ('design',        '设计任务',      'design',     5,  2),
  ('test',          '测试任务',      'test',       2,  3),
  ('manufacture',   '加工任务',      'manufacture',7,  4),
  ('assembly',      '装配任务',      'assembly',   3,  5),
  ('photo',         '产品拍摄',      'photo',      1,  6),
  ('listing',       '商品上架',      'listing',    1,  7),
  ('organize',      '整理资料',      'organize',   1,  8),
  ('assist',        '协助工作',      'assist',     1,  9),
  ('other',         '其他临时任务',  'other',      1,  10)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 4. 大项目（big_projects）
-- ------------------------------------------------------------
create table if not exists public.big_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending'
    check (status in ('pending','active','paused','reviewing','completed','delayed','archived')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists big_projects_updated_at on public.big_projects;
create trigger big_projects_updated_at
before update on public.big_projects
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 5. 小项目（sub_projects）
-- ------------------------------------------------------------
create table if not exists public.sub_projects (
  id uuid primary key default gen_random_uuid(),
  big_project_id uuid not null references public.big_projects(id) on delete cascade,
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  stage text references public.stages(key) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','active','paused','reviewing','completed','delayed','blocked')),
  start_date date,
  end_date date,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists sub_projects_updated_at on public.sub_projects;
create trigger sub_projects_updated_at
before update on public.sub_projects
for each row execute function public.set_updated_at();

create index if not exists idx_sub_projects_big on public.sub_projects(big_project_id);
create index if not exists idx_sub_projects_owner on public.sub_projects(owner_id);

-- ------------------------------------------------------------
-- 6. 任务（tasks）
-- ------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('longterm','shortterm','temporary')),
  task_category text,
  big_project_id uuid references public.big_projects(id) on delete set null,
  sub_project_id uuid references public.sub_projects(id) on delete set null,
  stage text references public.stages(key) on delete set null,
  assignee_id uuid not null references public.profiles(id) on delete restrict,
  collaborator_ids uuid[] default '{}',
  due_date timestamptz not null,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  status text not null default 'todo'
    check (status in ('todo','doing','review','done','delayed','returned','paused')),
  description text,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create index if not exists idx_tasks_assignee on public.tasks(assignee_id);
create index if not exists idx_tasks_big on public.tasks(big_project_id);
create index if not exists idx_tasks_sub on public.tasks(sub_project_id);
create index if not exists idx_tasks_status on public.tasks(status);

-- ------------------------------------------------------------
-- 7. 工作记录（work_records）— 系统自动生成
-- ------------------------------------------------------------
create table if not exists public.work_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operator_id uuid not null references public.profiles(id) on delete restrict,
  big_project_id uuid references public.big_projects(id) on delete set null,
  sub_project_id uuid references public.sub_projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  action text not null check (action in (
    'assign','start','submit','upload','stage_change',
    'approve','reject','delay_request','delay_system',
    'comment','create_project','archive'
  )),
  content text not null,
  attachment_path text
);

create index if not exists idx_wr_operator on public.work_records(operator_id);
create index if not exists idx_wr_task on public.work_records(task_id);
create index if not exists idx_wr_created on public.work_records(created_at desc);

-- ------------------------------------------------------------
-- 8. 项目成员表（用于控制员工查看参与项目的权限）
-- ------------------------------------------------------------
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  big_project_id uuid not null references public.big_projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  unique(big_project_id, profile_id)
);
