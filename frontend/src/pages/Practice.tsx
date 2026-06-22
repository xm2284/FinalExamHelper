import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, CheckCircle2, CircleX, Sparkles } from 'lucide-react'
import { apiClient, getErrorMessage } from '../api'
import { Badge, Button, EmptyState, ErrorNotice, LoadingScreen, PageHeader, Panel, ProgressBar } from '../components/ui'
import { MODE_LABELS, QUESTION_TYPE_LABELS, cleanAiMarkdown, cn, toggleAnswer } from '../lib/utils'
import type { AnswerResult, PracticeSession, Question, QuestionBank } from '../types'

export default function Practice() {
  const { sessionId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [mode, setMode] = useState('sequential')
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [explanation, setExplanation] = useState('')
  const [isExplaining, setIsExplaining] = useState(false)
  const [loading, setLoading] = useState(Boolean(sessionId))
  const [error, setError] = useState('')
  const startedAt = useRef(0)
  const explanationRequest = useRef<AbortController | null>(null)

  useEffect(() => () => explanationRequest.current?.abort(), [])

  const start = async (bankId: number) => {
    setError('')
    try {
      const created = await apiClient.createSession(bankId, mode)
      navigate(`/practice/session/${created.id}`)
    } catch (reason) {
      setError(getErrorMessage(reason))
    }
  }

  useEffect(() => {
    if (sessionId) {
      apiClient.session(Number(sessionId))
        .then((result) => {
          setSession(result)
          startedAt.current = Date.now()
        })
        .catch((reason) => setError(getErrorMessage(reason)))
        .finally(() => setLoading(false))
    } else {
      apiClient.banks({ status: 'published' })
        .then(async (resultData) => {
          setBanks(resultData.items)
          const requestedBankId = Number(params.get('bank'))
          if (requestedBankId) {
            const created = await apiClient.createSession(requestedBankId, mode)
            navigate(`/practice/session/${created.id}`)
          }
        })
        .catch((reason) => setError(getErrorMessage(reason)))
        .finally(() => setLoading(false))
    }
  }, [mode, navigate, params, sessionId])

  const current = useMemo<Question | undefined>(
    () => session?.questions?.[session.current_index],
    [session],
  )

  const submit = async () => {
    if (!session || !current || !answer.trim()) return
    try {
      const response = await apiClient.submitAnswer(session.id, {
        question_id: current.id,
        user_answer: answer,
        time_spent_seconds: Math.round((Date.now() - startedAt.current) / 1000),
      })
      setResult(response)
    } catch (reason) {
      setError(getErrorMessage(reason))
    }
  }

  const move = async (nextIndex: number) => {
    if (!session) return
    explanationRequest.current?.abort()
    const isComplete = nextIndex >= session.question_count
    await apiClient.saveProgress(
      session.id,
      isComplete ? session.question_count - 1 : nextIndex,
      isComplete ? 'completed' : undefined,
    )
    if (isComplete) {
      navigate('/analytics')
      return
    }
    setSession({ ...session, current_index: nextIndex })
    setAnswer('')
    setResult(null)
    setExplanation('')
    setIsExplaining(false)
    startedAt.current = Date.now()
  }

  if (loading) return <LoadingScreen />
  if (!session) {
    return (
      <div className="page-stack">
        <PageHeader title="开始练习" description="选择题库和练习模式，系统会自动保存进度。" />
        <Panel className="practice-mode-panel">
          <h2>练习模式</h2>
          <div className="segmented-control">
            {Object.entries(MODE_LABELS).map(([value, label]) => (
              <button key={value} className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>{label}</button>
            ))}
          </div>
        </Panel>
        {error ? <ErrorNotice message={error} /> : null}
        {banks.length ? (
          <div className="bank-grid">
            {banks.map((bank) => (
              <Panel className="bank-card practice-bank" key={bank.id}>
                <div className="course-avatar large">{bank.course_name.slice(0, 1)}</div>
                <div><h2>{bank.name}</h2><p>{bank.course_name} · {bank.question_count} 道题</p></div>
                <Button onClick={() => start(bank.id)}>开始练习 <ArrowRight size={16} /></Button>
              </Panel>
            ))}
          </div>
        ) : (
          <EmptyState title="还没有已发布题库" description="导入并审核发布题目后，就可以开始练习。" />
        )}
      </div>
    )
  }
  if (!current) return <EmptyState title="练习内容不可用" description="题目可能已被删除，请返回重新选择题库。" />

  const progress = ((session.current_index + 1) / session.question_count) * 100
  return (
    <div className="practice-layout">
      <header className="practice-header">
        <button onClick={() => navigate('/practice')}><ArrowLeft size={20} /></button>
        <div><strong>{session.bank_name}</strong><span>{MODE_LABELS[session.mode]}</span></div>
        <div className="practice-progress"><span>{session.current_index + 1} / {session.question_count}</span><ProgressBar value={progress} /></div>
      </header>
      {error ? <ErrorNotice message={error} /> : null}
      <Panel className="practice-question">
        <div className="question-badges">
          <Badge>{QUESTION_TYPE_LABELS[current.question_type]}</Badge>
          <Badge tone="orange">难度 {current.difficulty}</Badge>
          {current.knowledge_points.map((item) => <Badge key={item}>{item}</Badge>)}
        </div>
        <div className="practice-title-row">
          <h1>{current.content}</h1>
          <Button
            variant="ghost"
            onClick={async () => {
              const favorite = await apiClient.toggleFavorite(current.id)
              setSession({
                ...session,
                questions: session.questions?.map((item) =>
                  item.id === current.id ? { ...item, is_favorite: favorite.is_favorite } : item,
                ),
              })
            }}
          ><Bookmark size={18} fill={current.is_favorite ? 'currentColor' : 'none'} /></Button>
        </div>
        {current.options.length ? (
          <div className="practice-options">
            {current.options.map((option) => {
              const selected = answer.split(',').includes(option.label)
              const isCorrectOption = result?.correct_answer
                ?.replace(/[，、\s]/g, ',')
                .split(',')
                .includes(option.label)
              return (
                <button
                  key={option.label}
                  disabled={Boolean(result)}
                  className={cn(
                    selected && 'selected',
                    result && isCorrectOption && 'correct',
                    result && selected && !isCorrectOption && 'wrong',
                  )}
                  onClick={() =>
                    setAnswer(
                      current.question_type === 'multiple'
                        ? toggleAnswer(answer, option.label)
                        : option.label,
                    )
                  }
                >
                  <span>{option.label}</span><strong>{option.content}</strong>
                  {result && isCorrectOption ? <CheckCircle2 size={19} /> : null}
                  {result && selected && !isCorrectOption ? <CircleX size={19} /> : null}
                </button>
              )
            })}
          </div>
        ) : current.question_type === 'judge' ? (
          <div className="judge-options">
            {['正确', '错误'].map((value) => (
              <button className={answer === value ? 'selected' : ''} onClick={() => setAnswer(value)} key={value}>{value}</button>
            ))}
          </div>
        ) : (
          <textarea className="answer-textarea" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="在这里输入你的答案" disabled={Boolean(result)} />
        )}

        {result ? (
          <div className={cn('result-panel', result.is_correct === true ? 'success' : result.is_correct === false ? 'failure' : 'pending')}>
            <div>
              {result.is_correct === true ? <CheckCircle2 /> : result.is_correct === false ? <CircleX /> : <Sparkles />}
              <strong>
                {result.is_correct === true ? '回答正确' : result.is_correct === false ? '这道题需要再看看' : '等待自评'}
              </strong>
            </div>
            <p><b>参考答案：</b>{result.correct_answer}</p>
            <p>{result.explanation || '暂无解析'}</p>
            <Button
              variant="secondary"
              loading={isExplaining}
              onClick={async () => {
                explanationRequest.current?.abort()
                const controller = new AbortController()
                explanationRequest.current = controller
                setExplanation('')
                setIsExplaining(true)
                try {
                  await apiClient.explainStream(
                    current.id,
                    answer,
                    setExplanation,
                    controller.signal,
                  )
                } catch (reason) {
                  if (!controller.signal.aborted) {
                    setExplanation(getErrorMessage(reason))
                  }
                } finally {
                  if (!controller.signal.aborted) setIsExplaining(false)
                }
              }}
            ><Sparkles size={16} />AI 讲解</Button>
            {explanation ? <div className="ai-explanation">{cleanAiMarkdown(explanation)}</div> : null}
          </div>
        ) : null}
        <div className="practice-actions">
          <Button variant="secondary" disabled={session.current_index === 0} onClick={() => move(session.current_index - 1)}>
            <ArrowLeft size={17} />上一题
          </Button>
          {result ? (
            <Button onClick={() => move(session.current_index + 1)}>
              {session.current_index + 1 === session.question_count ? '完成练习' : '下一题'}<ArrowRight size={17} />
            </Button>
          ) : (
            <Button disabled={!answer.trim()} onClick={submit}>提交答案</Button>
          )}
        </div>
      </Panel>
      <div className="practice-aside">
        <Panel><BookOpen size={20} /><strong>自动保存已开启</strong><p>每次切换题目都会保存当前位置。</p></Panel>
      </div>
    </div>
  )
}
