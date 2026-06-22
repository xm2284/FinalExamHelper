import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrainCircuit, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { apiClient, getErrorMessage } from '../api'
import { Badge, Button, EmptyState, ErrorNotice, LoadingScreen, PageHeader, Panel } from '../components/ui'
import { QUESTION_TYPE_LABELS, formatRelativeTime } from '../lib/utils'
import type { WrongQuestion } from '../types'

export default function WrongQuestions() {
  const [items, setItems] = useState<WrongQuestion[]>([])
  const [sort, setSort] = useState('last_error_at')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<Record<number, string>>({})
  const [analyzing, setAnalyzing] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const load = () => {
    setLoading(true)
    apiClient.wrongQuestions(sort).then(setItems).catch((reason) => setError(getErrorMessage(reason))).finally(() => setLoading(false))
  }
  useEffect(() => {
    let active = true
    apiClient.wrongQuestions(sort)
      .then((result) => {
        if (active) setItems(result)
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
  }, [sort])

  return (
    <div className="page-stack">
      <PageHeader
        title="错题本"
        description="系统会自动累计答错次数，帮助你优先处理反复出错的知识点。"
        actions={items.length ? <Button onClick={() => navigate(`/practice?bank=${items[0].bank_id}`)}><BrainCircuit size={17} />开始错题练习</Button> : null}
      />
      <div className="segmented-control compact">
        <button className={sort === 'last_error_at' ? 'active' : ''} onClick={() => setSort('last_error_at')}>最近出错</button>
        <button className={sort === 'error_count' ? 'active' : ''} onClick={() => setSort('error_count')}>错误次数</button>
      </div>
      {error ? <ErrorNotice message={error} onRetry={load} /> : null}
      {loading ? <LoadingScreen /> : items.length ? (
        <div className="question-list">
          {items.map((item) => (
            <Panel className="wrong-card" key={item.id}>
              <div className="wrong-card-head">
                <div className="question-badges">
                  <Badge>{QUESTION_TYPE_LABELS[item.question.question_type]}</Badge>
                  <Badge tone="blue">{item.course_name}</Badge>
                  <Badge tone="red">答错 {item.error_count} 次</Badge>
                </div>
                <span>{formatRelativeTime(item.last_error_at)}</span>
              </div>
              <h2>{item.question.content}</h2>
              <div className="wrong-actions">
                <Button variant="ghost" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                  {expanded === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {expanded === item.id ? '收起' : '查看详情'}
                </Button>
                <Button variant="ghost" onClick={async () => { await apiClient.removeWrong(item.id); load() }}><Trash2 size={16} />移出错题本</Button>
                <Button
                  variant="secondary"
                  loading={analyzing === item.id}
                  onClick={async () => {
                    setAnalyzing(item.id)
                    try {
                      const result = await apiClient.analyzeWrong(item.id)
                      setAnalysis((current) => ({ ...current, [item.id]: result.analysis }))
                    } catch (reason) {
                      setError(getErrorMessage(reason))
                    } finally {
                      setAnalyzing(null)
                    }
                  }}
                ><BrainCircuit size={16} />AI 错因分析</Button>
              </div>
              {expanded === item.id ? (
                <div className="answer-block">
                  <p><strong>你的答案</strong>{item.user_answer || '未作答'}</p>
                  <p><strong>正确答案</strong>{item.question.answer}</p>
                  <p><strong>原解析</strong>{item.question.explanation || '暂无解析'}</p>
                </div>
              ) : null}
              {analysis[item.id] ? <div className="ai-explanation">{analysis[item.id]}</div> : null}
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState title="错题本还是空的" description="答错的题目会自动出现在这里。保持这个状态也挺好。" />
      )}
    </div>
  )
}
