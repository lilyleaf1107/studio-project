import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DEFAULT_STAGES, TASK_CATEGORIES } from '@/lib/settings'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
        <p className="text-sm text-muted-foreground mt-1">维护阶段、任务模板、提醒规则等基础配置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">默认阶段（工序）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_STAGES.map((s) => (
              <span
                key={s.key}
                className="px-3 py-1.5 rounded-full bg-secondary text-sm"
              >
                {s.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">后续步骤可在这里新增、停用、重命名阶段。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">任务类型（快捷按钮）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TASK_CATEGORIES.map((t) => (
              <span
                key={t.key}
                className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm"
              >
                {t.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">这些类型会出现在「快速建任务」页面的快捷按钮里。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">提醒规则</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="space-y-2">
            <div>· 任务到期前 1 天提醒负责人</div>
            <div>· 当天任务截止前仍未开始自动提醒</div>
            <div>· 待验收超过 2 天提醒老板和管理员</div>
            <div>· 长线任务 3 天无状态变化，在首页风险区显示</div>
          </div>
          <p className="mt-3 text-xs">后续步骤可在这里调整天数和开关规则。</p>
        </CardContent>
      </Card>
    </div>
  )
}
