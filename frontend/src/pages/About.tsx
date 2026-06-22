import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react'
import { PageHeader, Panel } from '../components/ui'

const QQ_NUMBER = '2284517861'

export default function About() {
  const [copyMessage, setCopyMessage] = useState('复制 QQ')
  const resetTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current)
  }, [])

  const copyQQ = async () => {
    try {
      await navigator.clipboard.writeText(QQ_NUMBER)
      setCopyMessage('已复制')
      resetTimer.current = window.setTimeout(() => setCopyMessage('复制 QQ'), 1800)
    } catch {
      setCopyMessage(`请手动复制：${QQ_NUMBER}`)
    }
  }

  return (
    <div className="page-stack about-page">
      <PageHeader
        title="关于"
        description="一个专注期末复习、题库整理与智能练习的本地学习工具。"
      />

      <Panel className="about-hero">
        <div className="about-brand-mark">期</div>
        <div className="about-hero-copy">
          <span>作者</span>
          <h2>小明</h2>
          <p>
            希望把整理资料、审核题目、练习和复盘连成一条简单可靠的学习路径，
            少一点重复劳动，多一点真正有效的复习。
          </p>
        </div>
        <div className="about-local-note">
          <ShieldCheck size={20} />
          <div>
            <strong>本地优先</strong>
            <span>学习数据保存在当前电脑</span>
          </div>
        </div>
      </Panel>

      <div className="about-contact-grid">
        <a
          className="contact-card"
          href="https://space.bilibili.com/570049863"
          target="_blank"
          rel="noreferrer"
        >
          <span className="contact-icon bilibili"><PlayCircle /></span>
          <div>
            <small>Bilibili</small>
            <strong>小明同学鸭</strong>
            <p>查看视频主页</p>
          </div>
          <ExternalLink size={18} />
        </a>

        <a
          className="contact-card"
          href="https://github.com/xm2284"
          target="_blank"
          rel="noreferrer"
        >
          <span className="contact-icon github"><Code2 /></span>
          <div>
            <small>GitHub</small>
            <strong>xm2284</strong>
            <p>查看代码与项目</p>
          </div>
          <ExternalLink size={18} />
        </a>

        <button className="contact-card" type="button" onClick={copyQQ}>
          <span className="contact-icon qq"><MessageCircle /></span>
          <div>
            <small>QQ</small>
            <strong>{QQ_NUMBER}</strong>
            <p>{copyMessage}</p>
          </div>
          {copyMessage === '已复制' ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>

      <Panel className="about-project">
        <div>
          <span>项目技术</span>
          <h2>轻量、透明、便于继续扩展</h2>
        </div>
        <div className="tech-list" aria-label="项目技术栈">
          {['React', 'TypeScript', 'FastAPI', 'SQLite'].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </Panel>
    </div>
  )
}
