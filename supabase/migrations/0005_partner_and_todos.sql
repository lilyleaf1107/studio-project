-- 0005: 新增 partner 角色 + personal_todos 表

-- 1. 更新 profiles role CHECK 约束，增加 partner
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'admin', 'partner', 'staff'));

-- 2. 创建个人待办表
CREATE TABLE IF NOT EXISTS public.personal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. 启用 RLS
ALTER TABLE public.personal_todos ENABLE ROW LEVEL SECURITY;

-- 4. 个人待办策略：只能操作自己的
DROP POLICY IF EXISTS "personal_todos read" ON public.personal_todos;
CREATE POLICY "personal_todos read" ON public.personal_todos
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "personal_todos insert" ON public.personal_todos;
CREATE POLICY "personal_todos insert" ON public.personal_todos
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "personal_todos update" ON public.personal_todos;
CREATE POLICY "personal_todos update" ON public.personal_todos
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "personal_todos delete" ON public.personal_todos;
CREATE POLICY "personal_todos delete" ON public.personal_todos
  FOR DELETE USING (user_id = auth.uid());

-- 5. 更新 profiles RLS 策略，让 partner 视同 staff
-- profiles 的 is_management 函数已经判断 admin/owner，partner 会自动走 staff 逻辑
