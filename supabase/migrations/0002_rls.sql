-- ============================================================
-- 第 2 步：行级安全策略（RLS）
-- 角色：owner 老板、admin 管理员、staff 员工
-- 说明：
--   - owner/admin 可以查看所有项目/任务/记录
--   - staff 只能看自己参与的项目、被分配的任务、自己的工作记录
-- ============================================================

-- 启用所有表的 RLS
alter table public.profiles enable row level security;
alter table public.stages enable row level security;
alter table public.task_templates enable row level security;
alter table public.big_projects enable row level security;
alter table public.sub_projects enable row level security;
alter table public.tasks enable row level security;
alter table public.work_records enable row level security;
alter table public.project_members enable row level security;

-- 辅助函数：取得当前用户角色
create or replace function public.current_role() returns text as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'staff'
  );
$$ language sql stable security definer set search_path = public;

-- 辅助函数：是否是 owner 或 admin（统称"管理层"）
create or replace function public.is_management() returns boolean as $$
  select public.current_role() in ('owner', 'admin');
$$ language sql stable security definer set search_path = public;

-- 辅助函数：用户是否是某大项目的成员（或所有者）
create or replace function public.is_project_member(big_id uuid) returns boolean as $$
  select exists (
    select 1 from public.big_projects where id = big_id and owner_id = auth.uid()
    union
    select 1 from public.project_members where big_project_id = big_id and profile_id = auth.uid()
    union
    select 1 from public.sub_projects where big_project_id = big_id and owner_id = auth.uid()
    union
    select 1 from public.tasks where big_project_id = big_id and (assignee_id = auth.uid() or auth.uid() = any(collaborator_ids))
  );
$$ language sql stable security definer set search_path = public;

-- ------------------------------------------------------------
-- profiles：所有登录用户可读；管理层可全部写；自己可读自己的名字
-- ------------------------------------------------------------
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select
using (true);

drop policy if exists "profiles update self or mgmt" on public.profiles;
create policy "profiles update self or mgmt" on public.profiles for update
using (
  public.is_management()
  or id = auth.uid()
);

-- ------------------------------------------------------------
-- stages / task_templates：所有人读，只有 admin 写
-- ------------------------------------------------------------
drop policy if exists "stages read" on public.stages;
create policy "stages read" on public.stages for select using (true);

drop policy if exists "stages admin write" on public.stages;
create policy "stages admin write" on public.stages for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "templates read" on public.task_templates;
create policy "templates read" on public.task_templates for select using (true);

drop policy if exists "templates admin write" on public.task_templates;
create policy "templates admin write" on public.task_templates for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

-- ------------------------------------------------------------
-- big_projects：管理层全部；员工仅看自己参与的项目
-- ------------------------------------------------------------
drop policy if exists "big read" on public.big_projects;
create policy "big read" on public.big_projects for select
using (
  public.is_management()
  or public.is_project_member(id)
);

drop policy if exists "big mgmt write" on public.big_projects;
create policy "big mgmt write" on public.big_projects for all
using (public.is_management())
with check (public.is_management());

-- ------------------------------------------------------------
-- sub_projects：同上
-- ------------------------------------------------------------
drop policy if exists "sub read" on public.sub_projects;
create policy "sub read" on public.sub_projects for select
using (
  public.is_management()
  or owner_id = auth.uid()
  or public.is_project_member(big_project_id)
);

drop policy if exists "sub mgmt write" on public.sub_projects;
create policy "sub mgmt write" on public.sub_projects for all
using (public.is_management())
with check (public.is_management());

-- ------------------------------------------------------------
-- tasks：
--   读：管理层 / 被分配给我 / 我是协作人 / 我参与项目
--   写：管理层可全部写；员工可更新被分配给自己的任务的状态/上传
--   插：只有管理层可创建
-- ------------------------------------------------------------
drop policy if exists "tasks read" on public.tasks;
create policy "tasks read" on public.tasks for select
using (
  public.is_management()
  or assignee_id = auth.uid()
  or auth.uid() = any(collaborator_ids)
  or (big_project_id is not null and public.is_project_member(big_project_id))
);

drop policy if exists "tasks insert mgmt" on public.tasks;
create policy "tasks insert mgmt" on public.tasks for insert
with check (public.is_management());

drop policy if exists "tasks update mgmt or self" on public.tasks;
create policy "tasks update mgmt or self" on public.tasks for update
using (
  public.is_management()
  or assignee_id = auth.uid()
);

-- ------------------------------------------------------------
-- work_records：
--   读：管理层看全部；员工只能看自己的，或与自己任务/项目相关
--   写：任何人可插入自己作为 operator 的记录（系统自动生成）
-- ------------------------------------------------------------
drop policy if exists "wr read" on public.work_records;
create policy "wr read" on public.work_records for select
using (
  public.is_management()
  or operator_id = auth.uid()
  or (task_id is not null and exists (
    select 1 from public.tasks t
    where t.id = task_id and (t.assignee_id = auth.uid() or auth.uid() = any(t.collaborator_ids))
  ))
  or (big_project_id is not null and public.is_project_member(big_project_id))
);

drop policy if exists "wr insert self" on public.work_records;
create policy "wr insert self" on public.work_records for insert
with check (operator_id = auth.uid());

-- ------------------------------------------------------------
-- project_members：管理层写；成员可读
-- ------------------------------------------------------------
drop policy if exists "pm read" on public.project_members;
create policy "pm read" on public.project_members for select
using (
  public.is_management()
  or profile_id = auth.uid()
  or public.is_project_member(big_project_id)
);

drop policy if exists "pm mgmt write" on public.project_members;
create policy "pm mgmt write" on public.project_members for all
using (public.is_management())
with check (public.is_management());
