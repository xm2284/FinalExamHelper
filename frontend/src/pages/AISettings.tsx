import { useEffect, useState } from 'react'
import { CheckCircle2, Database, KeyRound, Trash2 } from 'lucide-react'
import { apiClient, getErrorMessage } from '../api'
import { Button, ErrorNotice, LoadingScreen, PageHeader, Panel } from '../components/ui'
import type { AISettings } from '../types'

export default function AISettingsPage() {
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const load = () => apiClient.settings().then(setSettings).catch((reason) => setError(getErrorMessage(reason)))
  useEffect(() => {
    void load()
  }, [])
  if (!settings) return <LoadingScreen />

  const save = async () => {
    setLoading(true)
    setError('')
    try {
      const updated = await apiClient.saveSettings({ ...settings, api_key: apiKey || undefined })
      setSettings(updated)
      setApiKey('')
      setMessage('设置已保存')
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-stack settings-page">
      <PageHeader title="AI 设置" description="配置兼容 OpenAI Chat Completions 的模型服务。API Key 只保存在本地数据库。" />
      {error ? <ErrorNotice message={error} /> : null}
      {message ? <div className="success-notice"><CheckCircle2 size={18} />{message}</div> : null}
      <Panel className="settings-panel">
        <div className="settings-section">
          <div className="settings-section-title"><KeyRound /><div><h2>模型连接</h2><p>支持 OpenAI 及兼容接口</p></div></div>
          <label className="switch-row"><div><strong>启用 AI 功能</strong><span>关闭后仍可使用普通题库和客观题练习</span></div><input type="checkbox" checked={settings.is_enabled} onChange={(event) => setSettings({ ...settings, is_enabled: event.target.checked })} /></label>
          <label><span>API Base URL</span><input value={settings.api_base_url} onChange={(event) => setSettings({ ...settings, api_base_url: event.target.value })} /></label>
          <label><span>API Key</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={settings.api_key_masked || '输入新的 API Key'} /><small>{settings.is_configured ? `当前配置：${settings.api_key_masked}` : '尚未配置'}</small></label>
          <label><span>模型名称</span><input value={settings.model_name} onChange={(event) => setSettings({ ...settings, model_name: event.target.value })} /></label>
          <div className="form-grid">
            <label><span>Temperature</span><input type="number" min={0} max={2} step={0.1} value={settings.temperature} onChange={(event) => setSettings({ ...settings, temperature: Number(event.target.value) })} /></label>
            <label><span>单次生成数量</span><input type="number" min={1} max={20} value={settings.max_questions_per_batch} onChange={(event) => setSettings({ ...settings, max_questions_per_batch: Number(event.target.value) })} /></label>
          </div>
          <div className="settings-actions">
            <Button loading={loading} onClick={save}>保存设置</Button>
            <Button variant="secondary" onClick={async () => { try { const result = await apiClient.testSettings(); setMessage(result.message) } catch (reason) { setError(getErrorMessage(reason)) } }}>测试连接</Button>
          </div>
        </div>
      </Panel>
      <Panel className="settings-panel">
        <div className="settings-section-title"><Database /><div><h2>演示数据</h2><p>用于答辩和首次体验，界面中会明确标记</p></div></div>
        <div className="demo-actions">
          <Button variant="secondary" onClick={async () => { await apiClient.loadDemo(); setMessage('演示数据已载入') }}>载入演示数据</Button>
          <Button variant="danger" onClick={async () => { if (window.confirm('确定清空所有演示数据吗？')) { await apiClient.clearDemo(); setMessage('演示数据已清空') } }}><Trash2 size={16} />清空演示数据</Button>
        </div>
      </Panel>
    </div>
  )
}
