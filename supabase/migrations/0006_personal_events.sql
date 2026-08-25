-- 个人待办扩充为日程事件
-- 新增字段：日期、开始时间、结束时间、循环规则

-- 1. 为 personal_todos 表增加日程字段
ALTER TABLE public.personal_todos
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS color text DEFAULT 'emerald';

-- 2. 为已存在的记录回填默认日期（创建日期）
UPDATE public.personal_todos
SET event_date = created_at::date
WHERE event_date IS NULL;

-- 3. 建立索引方便按日期查询
CREATE INDEX IF NOT EXISTS personal_todos_user_date_idx
  ON public.personal_todos(user_id, event_date);

-- 4. 更新 RLS（沿用现有策略，确保用户只能看自己的日程）
ALTER TABLE public.personal_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户只能查看自己的日程" ON public.personal_todos;
CREATE POLICY "用户只能查看自己的日程"
  ON public.personal_todos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户只能创建自己的日程" ON public.personal_todos;
CREATE POLICY "用户只能创建自己的日程"
  ON public.personal_todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户只能更新自己的日程" ON public.personal_todos;
CREATE POLICY "用户只能更新自己的日程"
  ON public.personal_todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户只能删除自己的日程" ON public.personal_todos;
CREATE POLICY "用户只能删除自己的日程"
  ON public.personal_todos FOR DELETE
  USING (auth.uid() = user_id);
