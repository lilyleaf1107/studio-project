import { Card, CardContent } from '@/components/ui/card'
import { DEFAULT_STAGES, TASK_CATEGORIES } from '@/lib/settings'

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">系统设置</h1>

      <Card>
        <CardContent className="p-4">
          <div className="font-medium text-sm mb-2">默认阶段</div>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_STAGES.map((s) => (
              <span key={s.key} className="px-2.5 py-1 rounded-full bg-secondary text-xs">
                {s.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="font-medium text-sm mb-2">任务类型</div>
          <div className="flex flex-wrap gap-1.5">
            {TASK_CATEGORIES.map((t) => (
              <span key={t.key} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                {t.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
