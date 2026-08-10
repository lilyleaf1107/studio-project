import { Loader2 } from 'lucide-react'

export default function Loading({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">{text}</span>
    </div>
  )
}
