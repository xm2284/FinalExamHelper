import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FilePlus2,
  Flame,
  Play,
  Target,
} from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiClient, getErrorMessage } from '../api'
import { Badge, Button, EmptyState, ErrorNotice, LoadingScreen, Panel, ProgressBar } from '../components/ui'
import { formatPercent, formatRelativeTime } from '../lib/utils'
import { useChartTheme } from '../theme/useChartTheme'
import type { DashboardData } from '../types'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const chartTheme = useChartTheme()

  const load = () => {
    setError('')
    apiClient.dashboard().then(setData).catch((reason) => setError(getErrorMessage(reason)))
  }

  useEffect(() => {
    apiClient.dashboard().then(setData).catch((reason) => setError(getErrorMessage(reason)))
  }, [])
  if (error) return <ErrorNotice message={error} onRetry={load} />
  if (!data) return <LoadingScreen />

  const stats = data.stats
  return (
    <div className="page-stack">
      <header className="welcome-header">
        <div>
          <h1>今天也要把知识点拿下</h1>
          <p>继续练习，或者从一份新资料开始整理题库。</p>
        </div>
        <Badge tone="orange">本地学习空间</Badge>
      </header>

      <div className="dashboard-hero-grid">
        <Panel className="action-panel continue-panel">
          <div className="action-icon action-icon-green"><BookOpen /></div>
          <div className="action-copy">
            <span className="section-label">继续上次练习</span>
            {data.active_session ? (
              <>
                <h2>{data.active_session.bank_name}</h2>
                <p>
                  已完成 {data.active_session.current_index} / {data.active_session.question_count} 题
                </p>
                <ProgressBar
                  value={(data.active_session.current_index / data.active_session.question_count) * 100}
                />
                <small>上次保存于 {formatRelativeTime(data.active_session.updated_at)}</small>
              </>
            ) : (
              <>
                <h2>还没有进行中的练习</h2>
                <p>选择一个已发布题库，开始今天的复习。</p>
              </>
            )}
          </div>
          <Button
            onClick={() =>
              navigate(data.active_session ? `/practice/session/${data.active_session.id}` : '/practice')
            }
          >
            <Play size={17} /> {data.active_session ? '继续练习' : '选择题库'}
          </Button>
        </Panel>

        <Panel className="action-panel create-panel">
          <div className="action-icon action-icon-orange"><FilePlus2 /></div>
          <div className="action-copy">
            <span className="section-label">创建新题库</span>
            <h2>把资料变成可练习的题目</h2>
            <p>粘贴题目、上传文件，或者让 AI 根据学习资料生成题库。</p>
            <small>支持 TXT、Markdown、DOCX、CSV、JSON、文字版 PDF</small>
          </div>
          <Button variant="secondary" onClick={() => navigate('/import')}>
            创建题库 <ArrowRight size={17} />
          </Button>
        </Panel>
      </div>

      <div className="metric-strip">
        {[
          { label: '今日练习', value: stats.today_count, suffix: '题', icon: Flame, tone: 'orange' },
          { label: '答对题目', value: stats.today_correct, suffix: '题', icon: CheckCircle2, tone: 'green' },
          { label: '今日正确率', value: formatPercent(stats.today_correct_rate), icon: Target, tone: 'blue' },
          { label: '当前错题', value: stats.wrong_count, suffix: '题', icon: CircleAlert, tone: 'red' },
        ].map(({ label, value, suffix, icon: Icon, tone }) => (
          <div className="metric-item" key={label}>
            <span className={`metric-icon metric-${tone}`}><Icon size={19} /></span>
            <div><small>{label}</small><strong>{value}{suffix}</strong></div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid">
        <Panel>
          <div className="panel-heading">
            <div><h2>近期题库</h2><p>最近更新和练习的课程资料</p></div>
            <Link to="/banks">查看全部 <ArrowRight size={15} /></Link>
          </div>
          {data.recent_banks.length ? (
            <div className="data-list">
              {data.recent_banks.map((bank) => (
                <Link className="bank-row" to={`/banks/${bank.id}`} key={bank.id}>
                  <div className="course-avatar">{bank.course_name.slice(0, 1)}</div>
                  <div className="row-main">
                    <strong>{bank.name}</strong>
                    <span>{bank.course_name} · {bank.question_count} 道题</span>
                  </div>
                  <Badge tone={bank.status === 'published' ? 'green' : 'orange'}>
                    {bank.status === 'published' ? '已发布' : '待审核'}
                  </Badge>
                  <span className="row-time">{formatRelativeTime(bank.updated_at)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="还没有题库"
              description="导入一份复习资料，开始建立自己的题库。"
              action={<Button onClick={() => navigate('/import')}>创建题库</Button>}
            />
          )}
        </Panel>

        <Panel>
          <div className="panel-heading">
            <div><h2>7 天练习趋势</h2><p>练习量与复习节奏</p></div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              initialDimension={{ width: 420, height: 230 }}
            >
              <LineChart data={data.trend}>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: chartTheme.text }} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} tick={{ fill: chartTheme.text }} />
                <Tooltip
                  contentStyle={{
                    background: chartTheme.tooltipBackground,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    borderRadius: 9,
                    color: chartTheme.text,
                  }}
                  labelStyle={{ color: chartTheme.text }}
                />
                <Line dataKey="count" stroke="#ff5b24" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="dashboard-bottom-grid">
        <Panel>
          <div className="panel-heading">
            <div><h2>薄弱知识点</h2><p>优先处理高频错误</p></div>
            <Link to="/analytics">查看分析</Link>
          </div>
          {data.weak_points.length ? data.weak_points.map((point, index) => (
            <div className="weak-row" key={point.name}>
              <span>{index + 1}</span>
              <div><strong>{point.name}</strong><small>{point.questions} 道相关题</small></div>
              <b>{point.errors} 次错误</b>
            </div>
          )) : <p className="muted-block">完成一些练习后，这里会展示薄弱知识点。</p>}
        </Panel>

        <Panel>
          <div className="panel-heading">
            <div><h2>进行中的任务</h2><p>文件解析与 AI 生成进度</p></div>
            <Link to="/tasks">全部任务</Link>
          </div>
          {data.active_tasks.length ? data.active_tasks.map((task) => (
            <div className="task-mini" key={task.id}>
              <Clock3 size={17} />
              <div><strong>{task.message ?? '后台任务'}</strong><ProgressBar value={task.progress * 100} /></div>
              <span>{Math.round(task.progress * 100)}%</span>
            </div>
          )) : <p className="muted-block">当前没有进行中的任务。</p>}
        </Panel>
      </div>
    </div>
  )
}
