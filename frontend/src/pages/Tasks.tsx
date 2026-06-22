import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CircleAlert, Clock3, LoaderCircle } from 'lucide-react'
import { apiClient, getErrorMessage } from '../api'
import { Badge, Button, EmptyState, ErrorNotice, PageHeader, Panel, ProgressBar } from '../components/ui'
import { formatRelativeTime } from '../lib/utils'
import type { Task } from '../types'

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState('')
  const load = () => apiClient.tasks().then(setTasks).catch((reason) => setError(getErrorMessage(reason)))
  useEffect(() => {
    load()
    const timer = window.setInterval(load, 3000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="page-stack">
      <PageHeader title="后台任务" description="查看文件解析、PDF 提取和 AI 生成进度。" />
      {error ? <ErrorNotice message={error} onRetry={load} /> : null}
      {tasks.length ? <div className="task-list">{tasks.map((task) => {
        const Icon = task.status === 'completed' ? CheckCircle2 : task.status === 'failed' ? CircleAlert : task.status === 'processing' ? LoaderCircle : Clock3
        return <Panel className="task-row" key={task.id}>
          <span className={`task-icon ${task.status}`}><Icon className={task.status === 'processing' ? 'spin' : ''} /></span>
          <div className="row-main">
            <div className="task-title"><strong>{task.message || '后台处理任务'}</strong><Badge tone={task.status === 'completed' ? 'green' : task.status === 'failed' ? 'red' : 'orange'}>{task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : task.status === 'processing' ? '处理中' : '等待中'}</Badge></div>
            <p>{task.error_message || `当前阶段：${task.stage}`}</p>
            <ProgressBar value={task.progress * 100} />
          </div>
          <div className="task-end"><span>{Math.round(task.progress * 100)}%</span><small>{formatRelativeTime(task.updated_at)}</small>{task.bank_id && task.status === 'completed' ? <Link to={`/banks/${task.bank_id}`}>进入审核</Link> : null}{task.status === 'failed' ? <Button size="sm" variant="secondary" onClick={async () => { await apiClient.retryTask(task.id); load() }}>重试</Button> : null}</div>
        </Panel>
      })}</div> : <EmptyState title="暂无后台任务" description="导入文件或使用 AI 生成题库后，处理进度会出现在这里。" />}
    </div>
  )
}
