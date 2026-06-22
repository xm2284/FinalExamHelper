import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, FilePlus2, Play, Search, Trash2 } from 'lucide-react'
import { apiClient, getErrorMessage } from '../api'
import { Badge, Button, EmptyState, ErrorNotice, LoadingScreen, PageHeader, Panel } from '../components/ui'
import { formatRelativeTime } from '../lib/utils'
import type { QuestionBank } from '../types'

const statusLabels: Record<string, string> = {
  draft: '草稿',
  parsing: '解析中',
  review: '待审核',
  published: '已发布',
  failed: '失败',
}

export default function BankList() {
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    apiClient
      .banks({ search: search || undefined, status: status || undefined })
      .then((result) => setBanks(result.items))
      .catch((reason) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    let active = true
    apiClient
      .banks({ search: search || undefined, status: status || undefined })
      .then((result) => {
        if (active) setBanks(result.items)
      })
      .catch((reason) => {
        if (active) setError(getErrorMessage(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [search, status])

  const remove = async (bank: QuestionBank) => {
    if (!window.confirm(`确定删除“${bank.name}”吗？`)) return
    await apiClient.deleteBank(bank.id)
    load()
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="题库"
        description="管理导入、生成和已经发布的课程题库。"
        actions={<Button onClick={() => navigate('/import')}><FilePlus2 size={17} />创建题库</Button>}
      />
      <Panel className="toolbar-panel">
        <label className="search-field">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索题库名称" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">全部状态</option>
          <option value="published">已发布</option>
          <option value="review">待审核</option>
          <option value="parsing">解析中</option>
          <option value="failed">失败</option>
        </select>
      </Panel>
      {error ? <ErrorNotice message={error} onRetry={load} /> : null}
      {loading ? <LoadingScreen /> : banks.length ? (
        <div className="bank-grid">
          {banks.map((bank) => (
            <Panel className="bank-card" key={bank.id}>
              <div className="bank-card-top">
                <div className="course-avatar large">{bank.course_name.slice(0, 1)}</div>
                <Badge tone={bank.status === 'published' ? 'green' : bank.status === 'failed' ? 'red' : 'orange'}>
                  {statusLabels[bank.status] ?? bank.status}
                </Badge>
              </div>
              <div>
                <h2>{bank.name}</h2>
                <p>{bank.course_name}</p>
              </div>
              <div className="bank-meta">
                <span><BookOpen size={15} />{bank.question_count} 道题</span>
                <span>{formatRelativeTime(bank.updated_at)}</span>
              </div>
              <div className="bank-actions">
                <Button variant="secondary" onClick={() => navigate(`/banks/${bank.id}`)}>
                  {bank.status === 'review' ? '审核题目' : '查看题库'}
                </Button>
                {bank.status === 'published' ? (
                  <Button onClick={() => navigate(`/practice?bank=${bank.id}`)}><Play size={16} />练习</Button>
                ) : null}
                <Button variant="ghost" onClick={() => remove(bank)} aria-label="删除题库"><Trash2 size={16} /></Button>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState
          title="没有找到题库"
          description="调整筛选条件，或者创建一份新题库。"
          action={<Button onClick={() => navigate('/import')}>创建题库</Button>}
        />
      )}
    </div>
  )
}
