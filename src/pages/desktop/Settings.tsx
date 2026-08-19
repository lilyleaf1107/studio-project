import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, ArrowUp, ArrowDown, Trash2, Pencil, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useThemeStore, THEMES } from '@/store/theme'
import { JOB_TITLE_PRESETS } from '@/lib/settings'
import type { TaskCategory, StageConfig } from '@/types'

export default function SettingsPage() {
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'
  const qc = useQueryClient()

  const currentTheme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editingStageName, setEditingStageName] = useState('')

  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ['task-categories-all'],
    queryFn: async (): Promise<TaskCategory[]> => {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as TaskCategory[]
    }
  })

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ['stages-all'],
    queryFn: async (): Promise<StageConfig[]> => {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as StageConfig[]
    }
  })

  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const currentMax = categories && categories.length > 0
        ? Math.max(...categories.map(c => c.sort_order))
        : 0
      const { error } = await supabase
        .from('task_categories')
        .insert({ name, sort_order: currentMax + 1, enabled: true })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('分类已新增')
      setNewCategoryName('')
      qc.invalidateQueries({ queryKey: ['task-categories-all'] })
    },
    onError: (e: any) => toast.error(e?.message || '新增失败')
  })

  const toggleCategoryEnabledMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('task_categories')
        .update({ enabled })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('已更新')
      qc.invalidateQueries({ queryKey: ['task-categories-all'] })
    },
    onError: (e: any) => toast.error(e?.message || '更新失败')
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('已删除')
      qc.invalidateQueries({ queryKey: ['task-categories-all'] })
    },
    onError: (e: any) => toast.error(e?.message || '删除失败')
  })

  const moveCategoryMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      if (!categories) return
      const idx = categories.findIndex(c => c.id === id)
      if (idx === -1) return
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= categories.length) return
      const current = categories[idx]
      const target = categories[targetIdx]
      const tempSort = -1
      await supabase.from('task_categories').update({ sort_order: tempSort }).eq('id', current.id)
      const { error: e1 } = await supabase.from('task_categories').update({ sort_order: current.sort_order }).eq('id', target.id)
      if (e1) throw e1
      const { error: e2 } = await supabase.from('task_categories').update({ sort_order: target.sort_order }).eq('id', current.id)
      if (e2) throw e2
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-categories-all'] })
    },
    onError: (e: any) => toast.error(e?.message || '移动失败')
  })

  const updateStageMutation = useMutation({
    mutationFn: async (stage: Partial<StageConfig> & { id: string }) => {
      const { error } = await supabase
        .from('stages')
        .update({
          name: stage.name,
          is_repeatable: stage.is_repeatable,
          enabled: stage.enabled,
          sort_order: stage.sort_order
        })
        .eq('id', stage.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('已更新')
      setEditingStageId(null)
      qc.invalidateQueries({ queryKey: ['stages-all'] })
    },
    onError: (e: any) => toast.error(e?.message || '更新失败')
  })

  const moveStageMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      if (!stages) return
      const idx = stages.findIndex(s => s.id === id)
      if (idx === -1) return
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= stages.length) return
      const current = stages[idx]
      const target = stages[targetIdx]
      const tempSort = -1
      await supabase.from('stages').update({ sort_order: tempSort }).eq('id', current.id)
      const { error: e1 } = await supabase.from('stages').update({ sort_order: current.sort_order }).eq('id', target.id)
      if (e1) throw e1
      const { error: e2 } = await supabase.from('stages').update({ sort_order: target.sort_order }).eq('id', current.id)
      if (e2) throw e2
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stages-all'] })
    },
    onError: (e: any) => toast.error(e?.message || '移动失败')
  })

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCategoryName.trim()) {
      toast.error('请输入分类名称')
      return
    }
    addCategoryMutation.mutate(newCategoryName.trim())
  }

  function startEditStage(stage: StageConfig) {
    setEditingStageId(stage.id)
    setEditingStageName(stage.name)
  }

  function saveEditStage(stage: StageConfig) {
    if (!editingStageName.trim()) {
      toast.error('阶段名称不能为空')
      return
    }
    updateStageMutation.mutate({
      id: stage.id,
      name: editingStageName.trim(),
      is_repeatable: stage.is_repeatable,
      enabled: stage.enabled,
      sort_order: stage.sort_order
    })
  }

  function cancelEditStage() {
    setEditingStageId(null)
    setEditingStageName('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
        <p className="text-sm text-muted-foreground mt-1">
          维护任务分类、项目阶段、身份卡等基础配置
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">外观设置</CardTitle>
          <CardDescription className="mt-1">
            选择应用主题色调，切换后立即生效并记住偏好
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map((theme) => {
              const selected = currentTheme === theme.key
              return (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => setTheme(theme.key)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                    selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-border'
                  }`}
                >
                  <div
                    className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: theme.preview.bg }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: theme.preview.active }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{theme.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {theme.description}
                    </div>
                  </div>
                  {selected && (
                    <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">任务分类管理</CardTitle>
              <CardDescription className="mt-1">
                管理任务类型，用于快速建任务时选择
              </CardDescription>
            </div>
            {!isAdmin && (
              <Badge variant="warning">仅管理员可编辑</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
            <Input
              placeholder="输入新分类名称..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              disabled={!isAdmin || addCategoryMutation.isPending}
              className="max-w-xs"
            />
            <Button
              type="submit"
              disabled={!isAdmin || addCategoryMutation.isPending}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {addCategoryMutation.isPending ? '新增中...' : '新增分类'}
            </Button>
          </form>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead className="w-24">系统预设</TableHead>
                  <TableHead className="w-24">启用</TableHead>
                  <TableHead className="w-40 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                )}
                {!catLoading && categories?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      暂无分类
                    </TableCell>
                  </TableRow>
                )}
                {categories?.map((cat, idx) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">
                      {cat.name}
                    </TableCell>
                    <TableCell>
                      {cat.is_system ? (
                        <Badge variant="info">系统</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">自定义</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={cat.enabled}
                        disabled={!isAdmin}
                        onCheckedChange={(checked) => {
                          toggleCategoryEnabledMutation.mutate({ id: cat.id, enabled: checked })
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!isAdmin || idx === 0}
                          onClick={() => moveCategoryMutation.mutate({ id: cat.id, direction: 'up' })}
                          className="h-8 w-8"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!isAdmin || idx === categories.length - 1}
                          onClick={() => moveCategoryMutation.mutate({ id: cat.id, direction: 'down' })}
                          className="h-8 w-8"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!isAdmin || cat.is_system}
                          onClick={() => {
                            if (confirm(`确定删除分类「${cat.name}」吗？`)) {
                              deleteCategoryMutation.mutate(cat.id)
                            }
                          }}
                          className="h-8 w-8 text-red-500 hover:text-red-600 disabled:text-muted-foreground"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">项目阶段管理</CardTitle>
              <CardDescription className="mt-1">
                阶段为系统预设，支持重命名、切换多轮属性、排序与启用停用
              </CardDescription>
            </div>
            {!isAdmin && (
              <Badge variant="warning">仅管理员可编辑</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>阶段名称</TableHead>
                  <TableHead className="w-28">可多轮</TableHead>
                  <TableHead className="w-24">启用</TableHead>
                  <TableHead className="w-36 text-right">排序</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stagesLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                )}
                {!stagesLoading && stages?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      暂无阶段
                    </TableCell>
                  </TableRow>
                )}
                {stages?.map((stage, idx) => {
                  const isEditing = editingStageId === stage.id
                  return (
                    <TableRow key={stage.id}>
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <div className="flex items-center gap-2 max-w-xs">
                            <Input
                              value={editingStageName}
                              onChange={(e) => setEditingStageName(e.target.value)}
                              className="h-8"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600"
                              onClick={() => saveEditStage(stage)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={cancelEditStage}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{stage.name}</span>
                            {stage.is_repeatable && (
                              <Badge variant="success">可多轮</Badge>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => startEditStage(stage)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={!!stage.is_repeatable}
                          disabled={!isAdmin || isEditing}
                          onCheckedChange={(checked) => {
                            updateStageMutation.mutate({
                              id: stage.id,
                              name: stage.name,
                              is_repeatable: checked,
                              enabled: stage.enabled,
                              sort_order: stage.sort_order
                            })
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={stage.enabled}
                          disabled={!isAdmin || isEditing}
                          onCheckedChange={(checked) => {
                            updateStageMutation.mutate({
                              id: stage.id,
                              name: stage.name,
                              is_repeatable: stage.is_repeatable,
                              enabled: checked,
                              sort_order: stage.sort_order
                            })
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!isAdmin || idx === 0 || isEditing}
                            onClick={() => moveStageMutation.mutate({ id: stage.id, direction: 'up' })}
                            className="h-8 w-8"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!isAdmin || idx === stages.length - 1 || isEditing}
                            onClick={() => moveStageMutation.mutate({ id: stage.id, direction: 'down' })}
                            className="h-8 w-8"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">身份卡预设</CardTitle>
          <CardDescription className="mt-1">
            员工身份卡常用头衔预设，用于创建账号时快速选择
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {JOB_TITLE_PRESETS.map((title) => (
              <Badge key={title} variant="secondary" className="px-3 py-1.5 text-sm">
                {title}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            如需增减预设头衔请联系开发人员，当前版本预设写在配置常量中。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
