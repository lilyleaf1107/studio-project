import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Zap,
  FolderKanban,
  User,
  Calendar,
  CheckCircle2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import Loading from '@/components/Loading'
import { useProfiles } from '@/hooks/useProfiles'
import { useBigProjects } from '@/hooks/useProjects'
import { useSubProjects } from '@/hooks/useSubProjects'
import { useStages } from '@/hooks/useStages'
import { useTaskTemplates } from '@/hooks/useTaskTemplates'
import { useCreateTask } from '@/hooks/useTasks'
import { useCreateWorkRecord } from '@/hooks/useWorkRecords'
import { TASK_CATEGORIES } from '@/lib/settings'
import { cn, todayEndOfDay, addDaysISO, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import type { TaskType, TaskPriority } from '@/types'

type Tab = 'temporary' | 'shortterm' | 'longterm'

const tabMeta: Record<Tab, { label: string; desc: string; color: string }> = {
  temporary: {
    label: '临时普通任务',
    desc: '当天要完成的事，如拍摄、上架、整理资料。步骤最少。',
    color: 'bg-pink-50 text-pink-700 ring-pink-200'
  },
  shortterm: {
    label: '短线设计任务',
    desc: '几天到一个月完成，如画图、设计、测试、短周期交付。',
    color: 'bg-teal-50 text-teal-700 ring-teal-200'
  },
  longterm: {
    label: '长线项目任务',
    desc: '从大项目/小项目里选择，系统自动关联和生成名称。',
    color: 'bg-indigo-50 text-indigo-700 ring-indigo-200'
  }
}

export default function QuickTask() {
  const profile = useAuthStore((s) => s.profile)
  const [tab, setTab] = useState<Tab>('temporary')
  const { data: profiles, isLoading: usersLoading } = useProfiles()
  const { data: bigProjects } = useBigProjects()
  const { data: allSubs } = useSubProjects()
  const { data: stages } = useStages()
  const { data: templates } = useTaskTemplates()
  const createMutation = useCreateTask()
  const createRecord = useCreateWorkRecord()

  // 表单
  const [categoryKey, setCategoryKey] = useState<string>('')
  const [assignee, setAssignee] = useState<string>('')
  const [bigId, setBigId] = useState<string>('')
  const [subId, setSubId] = useState<string>('')
  const [stage, setStage] = useState<string>('')
  const [template, setTemplate] = useState<string>('')
  const [due, setDue] = useState<string>(formatDate(new Date()))
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  const subOptions = useMemo(
    () => (bigId ? allSubs?.filter((s) => s.big_project_id === bigId) : allSubs) || [],
    [allSubs, bigId]
  )

  const selTemplate = templates?.find((t) => t.key === template)
  const selCategory = TASK_CATEGORIES.find((c) => c.key === categoryKey)

  // 自动生成任务名
  const autoName = useMemo(() => {
    if (name.trim()) return name.trim()
    const parts: string[] = []
    if (tab === 'longterm') {
      const bp = bigProjects?.find((x) => x.id === bigId)
      const sp = subOptions.find((x) => x.id === subId)
      if (sp) parts.push(sp.name)
      else if (bp) parts.push(bp.name)
    }
    if (selTemplate) parts.push(selTemplate.name)
    else if (selCategory) parts.push(selCategory.name + '任务')
    return parts.join(' · ') || ''
  }, [name, tab, bigProjects, subOptions, bigId, subId, selTemplate, selCategory])

  // 自动选截止日期
  useMemo(() => {
    if (tab === 'temporary') {
      setDue(formatDate(new Date()))
    } else if (tab === 'shortterm' && selTemplate?.default_due_days) {
      const d = new Date()
      d.setDate(d.getDate() + selTemplate.default_due_days)
      setDue(formatDate(d))
    }
  }, [tab, selTemplate?.default_due_days])

  async function handleSubmit() {
    if (!assignee) {
      toast.error('请选择负责人')
      return
    }
    const finalName = autoName
    if (!finalName) {
      toast.error('请补充任务名或选择类型')
      return
    }
    if (!due) {
      toast.error('请选择截止日期')
      return
    }
    const dueIso = new Date(due + 'T23:59:59').toISOString()
    try {
      const task = await createMutation.mutateAsync({
        name: finalName,
        type: tab,
        task_category: categoryKey || selTemplate?.task_category,
        big_project_id: bigId || undefined,
        sub_project_id: subId || undefined,
        stage: stage || undefined,
        assignee_id: assignee,
        due_date: dueIso,
        priority,
        description: note.trim() || undefined
      })
      const assigneeName = profiles?.find((p) => p.id === assignee)?.name
      await createRecord.mutateAsync({
        task_id: task.id,
        big_project_id: bigId || undefined,
        sub_project_id: subId || undefined,
        action: 'assign',
        content: `分配任务给 ${assigneeName || '员工'}，截止日期 ${due}，优先级 ${priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}`
      })
      toast.success(`任务「${finalName.slice(0, 20)}」已创建并通知 ${assigneeName}`)
      // 重置
      setName('')
      setNote('')
      setCategoryKey('')
      setTemplate('')
    } catch (e: any) {
      toast.error(e?.message || '创建失败')
    }
  }

  if (usersLoading) return <Loading />

  const meta = tabMeta[tab]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-6 w-6 text-amber-500" />
          快速创建任务
        </h1>
        <p className="text-sm text-muted-foreground mt-1">三步完成创建，尽量少填写。</p>
      </div>

      {/* 任务类型 Tab */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(tabMeta) as Tab[]).map((t) => {
              const m = tabMeta[t]
              const active = tab === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all',
                    active ? `${m.color} ring-2` : 'border-border hover:border-muted-foreground/30'
                  )}
                >
                  <div className="font-semibold">{m.label}</div>
                  <div className={cn(
                    'text-xs mt-1',
                    active ? 'opacity-90' : 'text-muted-foreground'
                  )}>
                    {m.desc}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 快捷类型按钮 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {tab === 'longterm' ? '1. 选择任务模板' : '1. 选择任务类型'}
          </CardTitle>
          <CardDescription className="text-xs">点击任一按钮自动生成任务名</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tab === 'longterm' ? (
              (templates || []).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTemplate(t.key)
                    setCategoryKey(t.task_category)
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    template === t.key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card border-border hover:border-primary hover:text-primary'
                  )}
                >
                  {t.name}
                </button>
              ))
            ) : (
              TASK_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategoryKey(c.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    categoryKey === c.key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card border-border hover:border-primary hover:text-primary'
                  )}
                >
                  {c.name}
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 关联项目（长线/短线可选） */}
      {tab !== 'temporary' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. 关联项目（可选）</CardTitle>
            <CardDescription className="text-xs">长线任务建议关联小项目；短线任务可不关联。</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FolderKanban className="h-3.5 w-3.5" />
                大项目
              </Label>
              <Select value={bigId} onValueChange={(v) => { setBigId(v); setSubId('') }}>
                <SelectTrigger><SelectValue placeholder="可选" /></SelectTrigger>
                <SelectContent>
                  {(bigProjects || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">小项目</Label>
              <Select value={subId} onValueChange={setSubId}>
                <SelectTrigger><SelectValue placeholder="可选" /></SelectTrigger>
                <SelectContent>
                  {subOptions.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">先选大项目或暂无小项目</div>
                  ) : (
                    subOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">阶段</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger><SelectValue placeholder="可选" /></SelectTrigger>
                <SelectContent>
                  {(stages || []).map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分配人和截止 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{tab === 'temporary' ? '2. 分配与截止' : '3. 分配与截止'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              负责人 <span className="text-red-500">*</span>
            </Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue placeholder="选择员工" /></SelectTrigger>
              <SelectContent>
                {(profiles || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              截止日期 <span className="text-red-500">*</span>
            </Label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">优先级</Label>
            <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 任务名确认 + 备注 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">确认任务</CardTitle>
          <CardDescription className="text-xs">任务名由系统自动生成，必要时可手动修改。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">任务名称预览</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={autoName || '请先选择任务类型以自动生成名称'}
              className={cn(!name && 'bg-muted/40 italic')}
            />
            {!name && autoName && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                将自动保存为：<span className="font-medium text-foreground">{autoName}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">补充说明（可选，一句话即可）</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="如：请参考 XX 文档 / 周三下午前完成初稿 等"
            />
          </div>
        </CardContent>
      </Card>

      {/* 提交 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-muted-foreground">
          创建后系统会自动生成工作记录，并在员工工作台出现。
        </div>
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="gap-2"
        >
          {createMutation.isPending ? (
            '创建中...'
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              保存并通知员工
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
