import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
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
import { useCreatePersonalEvent, useUpdatePersonalEvent } from '@/hooks/usePersonalEvents'
import { formatDate } from '@/lib/utils'
import type { PersonalEvent } from '@/types'

const COLOR_OPTIONS = [
  { key: 'emerald', label: '翠绿', bg: 'bg-emerald-500' },
  { key: 'sky', label: '天空', bg: 'bg-sky-500' },
  { key: 'amber', label: '琥珀', bg: 'bg-amber-500' },
  { key: 'rose', label: '玫瑰', bg: 'bg-rose-500' },
  { key: 'violet', label: '紫罗兰', bg: 'bg-violet-500' }
]

const RECURRENCE_OPTIONS = [
  { value: '', label: '不循环' },
  { value: '{"type":"daily"}', label: '每天' },
  { value: '{"type":"weekly","weekday":1}', label: '每周一' },
  { value: '{"type":"monthly","day":1}', label: '每月1日' }
]

interface Props {
  trigger?: React.ReactNode
  defaultDate?: Date
  event?: PersonalEvent | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function QuickEventDialog({ trigger, defaultDate, event, open, onOpenChange }: Props) {
  const createMutation = useCreatePersonalEvent()
  const updateMutation = useUpdatePersonalEvent()
  const isEdit = !!event
  const [internalOpen, setInternalOpen] = useState(false)
  const openState = open !== undefined ? open : internalOpen
  const setOpenState = onOpenChange || setInternalOpen

  const initialDate = formatDate(defaultDate || new Date())

  const [form, setForm] = useState({
    title: '',
    event_date: initialDate,
    start_time: '',
    end_time: '',
    recurrence_rule: '',
    color: 'emerald'
  })

  // 打开时回填表单
  useEffect(() => {
    if (openState) {
      if (event) {
        setForm({
          title: event.title || '',
          event_date: event.event_date || initialDate,
          start_time: event.start_time || '',
          end_time: event.end_time || '',
          recurrence_rule: event.recurrence_rule || '',
          color: event.color || 'emerald'
        })
      } else {
        setForm({
          title: '',
          event_date: initialDate,
          start_time: '',
          end_time: '',
          recurrence_rule: '',
          color: 'emerald'
        })
      }
    }
  }, [openState, event])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('请输入标题')
      return
    }
    // 允许跨日：end_time 早于 start_time 视为第二天结束，不再报错
    try {
      if (isEdit && event) {
        await updateMutation.mutateAsync({
          id: event.id,
          patch: {
            title: form.title.trim(),
            event_date: form.event_date,
            start_time: form.start_time || undefined,
            end_time: form.end_time || undefined,
            recurrence_rule: form.recurrence_rule || undefined,
            color: form.color
          }
        })
        toast.success('事件已更新')
      } else {
        await createMutation.mutateAsync({
          title: form.title.trim(),
          event_date: form.event_date,
          start_time: form.start_time || undefined,
          end_time: form.end_time || undefined,
          recurrence_rule: form.recurrence_rule || undefined,
          color: form.color
        })
        toast.success('事件已添加')
      }
      setOpenState(false)
    } catch (e: any) {
      toast.error(e?.message || (isEdit ? '更新失败' : '添加失败'))
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={openState} onOpenChange={setOpenState}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑事件' : '添加日程事件'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">标题 <span className="text-red-500">*</span></Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例如：周会、学习计划..."
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">日期</Label>
            <Input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />开始</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />结束</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">循环</Label>
              <Select
                value={form.recurrence_rule}
                onValueChange={(v) => setForm({ ...form, recurrence_rule: v })}
              >
                <SelectTrigger><SelectValue placeholder="不循环" /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">颜色</Label>
              <div className="flex items-center gap-1.5 h-9">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.key })}
                    className={`h-6 w-6 rounded-full ${c.bg} transition-all ${
                      form.color === c.key ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenState(false)}>取消</Button>
            <Button type="submit" disabled={pending}>
              {pending ? (isEdit ? '保存中...' : '添加中...') : (isEdit ? '保存' : '添加')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}