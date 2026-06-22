import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronDown, ChevronUp, Download, Pencil, Play, Save, Trash2 } from 'lucide-react'
import { apiClient, getErrorMessage } from '../api'
import { Badge, Button, EmptyState, ErrorNotice, LoadingScreen, PageHeader, Panel } from '../components/ui'
import { QUESTION_TYPE_LABELS } from '../lib/utils'
import type { Question, QuestionBank } from '../types'

export default function BankDetail() {
  const { id } = useParams()
  const bankId = Number(id)
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState<Partial<Question>>({})
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = () => {
    setError('')
    Promise.all([apiClient.bank(bankId), apiClient.questions(bankId)])
      .then(([bankData, questionData]) => {
        setBank(bankData)
        setQuestions(questionData)
      })
      .catch((reason) => setError(getErrorMessage(reason)))
  }
  useEffect(() => {
    let active = true
    Promise.all([apiClient.bank(bankId), apiClient.questions(bankId)])
      .then(([bankData, questionData]) => {
        if (!active) return
        setBank(bankData)
        setQuestions(questionData)
      })
      .catch((reason) => {
        if (active) setError(getErrorMessage(reason))
      })
    return () => {
      active = false
    }
  }, [bankId])
  const isReview = bank?.status === 'review'
  const approvedCount = useMemo(
    () => questions.filter((question) => question.review_status === 'approved').length,
    [questions],
  )

  const save = async (question: Question) => {
    const updated = await apiClient.updateQuestion(question.id, draft)
    setQuestions((items) => items.map((item) => (item.id === updated.id ? updated : item)))
    setEditing(null)
  }

  const approve = async (question: Question) => {
    const updated = await apiClient.updateQuestion(question.id, { review_status: 'approved' })
    setQuestions((items) => items.map((item) => (item.id === updated.id ? updated : item)))
  }

  const publish = async () => {
    const updated = await apiClient.publishBank(bankId)
    setBank(updated)
    load()
  }

  if (error) return <ErrorNotice message={error} onRetry={load} />
  if (!bank) return <LoadingScreen />

  return (
    <div className="page-stack">
      <PageHeader
        title={bank.name}
        description={`${bank.course_name} · ${bank.question_count} 道题 · ${isReview ? '请审核后发布' : '已发布题库'}`}
        actions={
          <>
            <a className="button button-secondary button-md" href={`http://localhost:8000/api/banks/${bankId}/export`}>
              <Download size={17} />导出 JSON
            </a>
            {isReview ? (
              <Button onClick={publish} disabled={!questions.length}>
                <Check size={17} />发布题库
              </Button>
            ) : (
              <Button onClick={() => navigate(`/practice?bank=${bankId}`)}><Play size={17} />开始练习</Button>
            )}
          </>
        }
      />
      {isReview ? (
        <Panel className="review-summary">
          <div><strong>{questions.length}</strong><span>待审核题目</span></div>
          <div><strong>{approvedCount}</strong><span>已人工确认</span></div>
          <p>你可以逐题修改或确认。发布时会将当前题目全部转为正式题目。</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await apiClient.approveQuestions(bankId)
              setQuestions((items) => items.map((item) => ({ ...item, review_status: 'approved' })))
            }}
          >全部确认</Button>
        </Panel>
      ) : null}
      {questions.length ? (
        <div className="question-list">
          {questions.map((question, index) => {
            const isExpanded = expanded.has(question.id)
            const isEditing = editing === question.id
            return (
              <Panel className="question-card" key={question.id}>
                <div className="question-card-header">
                  <div className="question-index">{index + 1}</div>
                  <div className="question-main">
                    <div className="question-badges">
                      <Badge>{QUESTION_TYPE_LABELS[question.question_type]}</Badge>
                      <Badge tone="orange">难度 {question.difficulty}</Badge>
                      {question.review_status === 'approved' ? <Badge tone="green">已确认</Badge> : null}
                    </div>
                    {isEditing ? (
                      <textarea
                        value={draft.content ?? ''}
                        onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))}
                        className="edit-textarea"
                      />
                    ) : <h3>{question.content}</h3>}
                  </div>
                  <div className="question-tools">
                    {isReview && !isEditing ? <Button variant="ghost" size="sm" onClick={() => approve(question)}><Check size={15} />确认</Button> : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (isEditing) save(question)
                        else {
                          setEditing(question.id)
                          setDraft(question)
                        }
                      }}
                    >
                      {isEditing ? <Save size={15} /> : <Pencil size={15} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (window.confirm('确定删除这道题吗？')) {
                          await apiClient.deleteQuestion(question.id)
                          setQuestions((items) => items.filter((item) => item.id !== question.id))
                        }
                      }}
                    ><Trash2 size={15} /></Button>
                  </div>
                </div>
                {question.options.length ? (
                  <div className="option-preview">
                    {question.options.map((option) => (
                      <div key={option.label}><span>{option.label}</span>{option.content}</div>
                    ))}
                  </div>
                ) : null}
                <button
                  className="expand-button"
                  onClick={() => setExpanded((current) => {
                    const next = new Set(current)
                    if (next.has(question.id)) next.delete(question.id)
                    else next.add(question.id)
                    return next
                  })}
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {isExpanded ? '收起答案' : '查看答案与解析'}
                </button>
                {isExpanded ? (
                  <div className="answer-block">
                    <p><strong>答案</strong>{question.answer}</p>
                    <p><strong>解析</strong>{question.explanation || '暂无解析'}</p>
                    {question.knowledge_points.length ? (
                      <div className="knowledge-tags">{question.knowledge_points.map((item) => <Badge key={item}>{item}</Badge>)}</div>
                    ) : null}
                  </div>
                ) : null}
              </Panel>
            )
          })}
        </div>
      ) : (
        <EmptyState title="题库中还没有题目" description="返回导入页重新上传，或检查后台任务状态。" action={<Link className="button button-primary button-md" to="/import">导入题目</Link>} />
      )}
    </div>
  )
}
