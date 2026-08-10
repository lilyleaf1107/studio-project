import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Upload,
  Download,
  File,
  FolderKanban,
  Trash2,
  Search,
  Filter,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import Loading from '@/components/Loading'
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase'
import { useBigProjects } from '@/hooks/useProjects'
import { useProfiles } from '@/hooks/useProfiles'
import { useCreateWorkRecord } from '@/hooks/useWorkRecords'
import { canCreateProject } from '@/lib/permissions'
import { cn, formatDateTime, shortId } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

interface FileItem {
  id?: string
  name: string
  path: string
  size: number
  created_at: string
  uploaded_by?: string
  big_project_id?: string
  sub_project_id?: string
  mime?: string
}

function getFileIcon(name: string) {
  const n = name.toLowerCase()
  if (/\.(png|jpg|jpeg|gif|svg|webp|bmp)$/.test(n)) return FileImage
  if (/\.(pdf|doc|docx|txt|md|rtf)$/.test(n)) return FileText
  if (/\.(xlsx|xls|csv|numbers)$/.test(n)) return FileSpreadsheet
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return FileArchive
  return FileIcon
}

function getFileColor(name: string) {
  const n = name.toLowerCase()
  if (/\.(png|jpg|jpeg|gif|svg|webp|bmp)$/.test(n)) return 'bg-pink-50 text-pink-700'
  if (/\.(pdf|doc|docx|txt|md|rtf)$/.test(n)) return 'bg-blue-50 text-blue-700'
  if (/\.(xlsx|xls|csv|numbers)$/.test(n)) return 'bg-emerald-50 text-emerald-700'
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return 'bg-amber-50 text-amber-700'
  return 'bg-slate-50 text-slate-700'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function Files() {
  const profile = useAuthStore((s) => s.profile)
  const canUpload = canCreateProject(profile?.role)
  const userId = profile?.id
  const qc = useQueryClient()
  const createRecord = useCreateWorkRecord()

  const [bpF, setBpF] = useState<string>('all')
  const [q, setQ] = useState('')
  const [uploadBP, setUploadBP] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const { data: bigProjects } = useBigProjects()
  const { data: profiles } = useProfiles()
  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))

  const bpMap: Record<string, string> = {}
  bigProjects?.forEach((p) => (bpMap[p.id] = p.name))

  // 查询 Storage 里的文件列表
  const { data: files, isLoading } = useQuery({
    queryKey: ['project-files', bpF],
    queryFn: async (): Promise<FileItem[]> => {
      try {
        const { data: list, error } = await supabase.storage
          .from(STORAGE_BUCKETS.FILES)
          .list('', { limit: 500, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })
        if (error) {
          // 如果 bucket 不存在，返回空
          const errAny = error as any
          if (error.message.includes('does not exist') || errAny.code === '42P01') return []
          throw error
        }
        const items: FileItem[] = list
          ?.filter((f) => f.id)
          .map((f) => {
            // 文件名格式可能是：{BPID}_{随机ID}_{原文件名}
            const parts = f.name.split('_')
            let big_project_id: string | undefined
            let displayName = f.name
            if (parts.length >= 3 && bpMap[parts[0]]) {
              big_project_id = parts[0]
              displayName = parts.slice(2).join('_')
            }
            return {
              id: f.id || undefined,
              name: displayName,
              path: f.name,
              size: f.metadata?.size || 0,
              created_at: f.created_at || '',
              mime: f.metadata?.mimetype,
              big_project_id
            }
          }) || []
        return items
      } catch (e) {
        return []
      }
    },
    refetchOnMount: false
  })

  // 过滤
  const filtered = useMemo(() => {
    return (files || []).filter((f) => {
      if (bpF !== 'all' && f.big_project_id !== bpF) return false
      if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [files, bpF, q])

  // 上传
  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('请选择文件')
      let path = ''
      if (uploadBP && bpMap[uploadBP]) {
        path = `${uploadBP}_${shortId()}_${file.name}`
      } else {
        path = `nogroup_${shortId()}_${file.name}`
      }
      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.FILES)
        .upload(path, file, { cacheControl: '3600' })
      if (error) throw error
      const bpName = uploadBP ? bpMap[uploadBP] : '未分类'
      await createRecord.mutateAsync({
        big_project_id: uploadBP || undefined,
        action: 'upload',
        content: `上传文件「${file.name}」（${formatSize(file.size)}）到 ${bpName}`
      })
      return true
    },
    onSuccess: () => {
      setFile(null)
      setUploadBP('')
      toast.success('上传成功')
      qc.invalidateQueries({ queryKey: ['project-files'] })
    },
    onError: (e: any) => {
      if (e?.message?.includes('does not exist')) {
        toast.error('请先在 Supabase 后台创建 Storage bucket：' + STORAGE_BUCKETS.FILES)
      } else {
        toast.error(e?.message || '上传失败')
      }
    }
  })

  // 下载
  async function doDownload(f: FileItem) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.FILES)
        .createSignedUrl(f.path, 60)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (e: any) {
      toast.error(e?.message || '下载失败')
    }
  }

  // 删除
  async function doDelete(f: FileItem) {
    if (!confirm(`确认删除文件「${f.name}」？`)) return
    try {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.FILES)
        .remove([f.path])
      if (error) throw error
      toast.success('已删除')
      qc.invalidateQueries({ queryKey: ['project-files'] })
    } catch (e: any) {
      toast.error(e?.message || '删除失败')
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const first = e.dataTransfer.files?.[0]
    if (first) setFile(first)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <File className="h-6 w-6 text-blue-600" /> 文件资料库
        </h1>
        <p className="text-sm text-muted-foreground mt-1">按项目归类的文件资料上传与下载</p>
      </div>

      {/* 上传区 */}
      {canUpload && (
        <Card className="border-dashed">
          <CardContent className="p-5 space-y-4">
            <div className="font-medium text-sm flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              上传文件
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr_auto] gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <FolderKanban className="h-3.5 w-3.5" /> 关联大项目（可选）
                </Label>
                <Select value={uploadBP} onValueChange={setUploadBP}>
                  <SelectTrigger><SelectValue placeholder="未分类" /></SelectTrigger>
                  <SelectContent>
                    {(bigProjects || []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => (document.getElementById('file-input') as HTMLInputElement)?.click()}
                className={cn(
                  'border-2 rounded-lg p-4 cursor-pointer transition-all text-center',
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-dashed hover:border-primary/50'
                )}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    {(() => {
                      const Ico = getFileIcon(file.name)
                      return <Ico className={cn('h-5 w-5', getFileColor(file.name).split(' ')[1])} />
                    })()}
                    <span className="font-medium truncate max-w-[70%]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({formatSize(file.size)})</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    点击选择文件，或拖拽文件到此处
                  </div>
                )}
              </div>
              <Button
                onClick={() => uploadMut.mutate()}
                disabled={!file || uploadMut.isPending}
                className="gap-2"
              >
                {uploadMut.isPending ? '上传中...' : (
                  <><Upload className="h-4 w-4" /> 上传</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              提示：上传会自动生成工作记录。需要管理员在 Supabase Storage 创建名为
              <code className="mx-1 px-1.5 py-0.5 rounded bg-secondary">{STORAGE_BUCKETS.FILES}</code>
              的 bucket 才能使用。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 筛选条 */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            筛选：
          </div>
          <Select value={bpF} onValueChange={setBpF}>
            <SelectTrigger className="w-48"><SelectValue placeholder="所属大项目" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              {(bigProjects || []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="搜索文件名"
            className="max-w-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            prefix={<Search className="h-4 w-4 text-muted-foreground" />}
          />
          <span className="text-xs text-muted-foreground ml-auto">
            共 {filtered.length} 个文件
          </span>
        </CardContent>
      </Card>

      {/* 文件列表 */}
      <Card>
        {isLoading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            <FileIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            还没有文件。{canUpload ? '管理员/老板可在上方上传。' : '请等待管理员上传。'}
          </CardContent>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {filtered.map((f) => {
              const Ico = getFileIcon(f.name)
              const color = getFileColor(f.name)
              return (
                <div
                  key={f.id || f.path}
                  className="border rounded-lg p-4 hover:border-primary hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', color)}>
                      <Ico className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatSize(f.size)} · {f.created_at ? formatDateTime(f.created_at).slice(0, 10) : ''}
                      </div>
                      {f.big_project_id && bpMap[f.big_project_id] && (
                        <div className="text-[11px] text-muted-foreground mt-1 truncate">
                          📁 {bpMap[f.big_project_id]}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => doDownload(f)}>
                          <Download className="h-3.5 w-3.5" /> 下载
                        </Button>
                        {canUpload && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-600 hover:bg-red-50" onClick={() => doDelete(f)}>
                            <Trash2 className="h-3.5 w-3.5" /> 删除
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
