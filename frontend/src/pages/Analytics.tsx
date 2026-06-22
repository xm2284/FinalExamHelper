import { useEffect, useState } from 'react'
import { BarChart3, CalendarDays, Clock3, Target } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiClient, getErrorMessage } from '../api'
import { EmptyState, ErrorNotice, LoadingScreen, PageHeader, Panel, ProgressBar } from '../components/ui'
import { QUESTION_TYPE_LABELS, formatPercent } from '../lib/utils'
import { useChartTheme } from '../theme/useChartTheme'
import type { AnalyticsData } from '../types'

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState('')
  const chartTheme = useChartTheme()
  const load = () => apiClient.analytics().then(setData).catch((reason) => setError(getErrorMessage(reason)))
  useEffect(() => {
    void load()
  }, [])
  if (error) return <ErrorNotice message={error} onRetry={load} />
  if (!data) return <LoadingScreen />
  const summary = data.summary
  return (
    <div className="page-stack">
      <PageHeader title="学习分析" description="用真实练习记录判断复习进度，而不是看一块漂亮但没用的大屏。" />
      <div className="analytics-summary">
        {[
          { label: '累计作答', value: summary.total_answers, suffix: '题', icon: BarChart3 },
          { label: '学习时长', value: summary.total_minutes, suffix: '分钟', icon: Clock3 },
          { label: '整体正确率', value: formatPercent(summary.correct_rate), icon: Target },
          { label: '活跃天数', value: summary.active_days, suffix: '天', icon: CalendarDays },
        ].map(({ label, value, suffix, icon: Icon }) => (
          <Panel key={label} className="analytics-stat"><Icon /><small>{label}</small><strong>{value}{suffix}</strong></Panel>
        ))}
      </div>
      {!summary.total_answers ? <EmptyState title="还没有足够的练习数据" description="完成一些题目后，这里会展示课程、题型和知识点表现。" /> : (
        <>
          <div className="analytics-grid">
            <Panel>
              <div className="panel-heading"><div><h2>练习趋势</h2><p>近 7 天作答数量</p></div></div>
              <div className="chart-box tall">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                  initialDimension={{ width: 520, height: 290 }}
                >
                  <LineChart data={data.trend}>
                    <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: chartTheme.text }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: chartTheme.text }} />
                    <Tooltip
                      contentStyle={{ background: chartTheme.tooltipBackground, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 9 }}
                      labelStyle={{ color: chartTheme.text }}
                    />
                    <Line dataKey="count" stroke="#ff5b24" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel>
              <div className="panel-heading"><div><h2>课程表现</h2><p>不同课程的正确率</p></div></div>
              <div className="chart-box tall">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                  initialDimension={{ width: 520, height: 290 }}
                >
                  <BarChart data={data.courses}>
                    <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: chartTheme.text }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: chartTheme.text }} />
                    <Tooltip
                      contentStyle={{ background: chartTheme.tooltipBackground, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 9 }}
                      labelStyle={{ color: chartTheme.text }}
                    />
                    <Bar dataKey="correct_rate" fill="#ff7a47" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
          <div className="analytics-grid">
            <Panel>
              <div className="panel-heading"><div><h2>题型表现</h2><p>找到不熟悉的作答方式</p></div></div>
              <div className="metric-rows">{data.question_types.map((row) => <div key={row.name}><span>{QUESTION_TYPE_LABELS[row.name] ?? row.name}</span><ProgressBar value={row.correct_rate} /><strong>{formatPercent(row.correct_rate)}</strong></div>)}</div>
            </Panel>
            <Panel>
              <div className="panel-heading"><div><h2>知识点掌握度</h2><p>正确率最低的内容排在前面</p></div></div>
              <div className="metric-rows">{data.knowledge_points.slice(0, 8).map((row) => <div key={row.name}><span>{row.name}</span><ProgressBar value={row.correct_rate} /><strong>{formatPercent(row.correct_rate)}</strong></div>)}</div>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
