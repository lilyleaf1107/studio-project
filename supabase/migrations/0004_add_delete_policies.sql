-- ============================================================
-- 修复：为 tasks 和 work_records 表添加 DELETE 策略
-- 原因：0002_rls.sql 只定义了 SELECT/INSERT/UPDATE，缺少 DELETE
-- 导致管理员/老板无法从前端删除任务
-- ============================================================

-- tasks：管理层可删除
drop policy if exists "tasks delete mgmt" on public.tasks;
create policy "tasks delete mgmt" on public.tasks for delete
using (public.is_management());

-- work_records：管理层可删除
drop policy if exists "wr delete mgmt" on public.work_records;
create policy "wr delete mgmt" on public.work_records for delete
using (public.is_management());

-- profiles：管理层可删除（删除用户时需要）
drop policy if exists "profiles delete mgmt" on public.profiles;
create policy "profiles delete mgmt" on public.profiles for delete
using (public.is_management());
